import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

import {
  products as staticProducts,
  type Product,
} from "../../src/data/products.js"
import { HttpError } from "./http.js"

type Sql = NeonQueryFunction<false, false>

let client: Sql | null = null
let schemaReady: Promise<void> | null = null

export const submissionStatuses = [
  "new",
  "in_progress",
  "done",
  "archived",
] as const
export const orderStatuses = [
  "new",
  "confirmed",
  "in_production",
  "delivered",
  "cancelled",
] as const

// Tables are created on first use so a fresh Neon database needs no manual
// migration step. The whole bootstrap is ONE statement (a DO block), so a cold
// start costs one HTTP round trip.
//
// Steady state: the block reads app_schema.version, sees it is current and
// returns without touching any table lock. Even "if not exists" DDL locks
// tables. A no-op `alter table ... add column if not exists` takes an
// AccessExclusiveLock, and a no-op `create index if not exists` takes a
// ShareLock that blocks writers.
//
// First run or version bump: an advisory transaction lock serializes
// concurrent cold starts. Without it, racing `create table if not exists`
// statements can fail on pg_type's unique index. Then every statement runs
// once, all idempotent, and the version is recorded in the same transaction.
//
// To change the schema: add idempotent DDL below and bump BOTH version
// literals (the early-exit check and the final upsert). See
// docs/ftesa-database.md.
async function createSchema(sql: Sql) {
  await sql`
    do $bootstrap$
    declare installed integer;
    begin
      if to_regclass('app_schema') is not null then
        select version into installed from app_schema where id = 1;
        if installed >= 3 then return; end if;
      end if;
      perform pg_advisory_xact_lock(4823517301);
      create table if not exists app_schema (id integer primary key check (id = 1), version integer not null);
      select version into installed from app_schema where id = 1;
      if installed >= 3 then return; end if;

      create table if not exists submissions (
        id bigint generated always as identity primary key,
        kind text not null check (kind in ('contact', 'project')),
        name text not null,
        email text not null,
        company text not null default '',
        message text not null,
        details jsonb not null default '{}',
        status text not null default 'new',
        notes text not null default '',
        created_at timestamptz not null default now()
      );
      create table if not exists orders (
        id bigint generated always as identity primary key,
        reference text not null unique,
        customer jsonb not null,
        items jsonb not null,
        total numeric(10, 2) not null,
        status text not null default 'new',
        notes text not null default '',
        created_at timestamptz not null default now()
      );
      alter table orders add column if not exists request_key text, add column if not exists request_hash text;
      create unique index if not exists orders_request_key_idx on orders (request_key);
      create table if not exists products (
        id text primary key,
        data jsonb not null,
        active boolean not null default true,
        sort_order integer not null default 0,
        updated_at timestamptz not null default now()
      );

      create table if not exists invitation_orders (
        id uuid primary key,
        reference text not null unique,
        customer jsonb not null,
        password_hash text not null,
        document jsonb not null,
        revision bigint not null default 1,
        status text not null default 'pending' check (status in ('pending', 'active', 'suspended', 'cancelled')),
        payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
        total numeric(10, 2),
        notes text not null default '',
        request_key uuid not null unique,
        request_hash text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create index if not exists invitation_general_tokens_idx on invitation_orders ((document -> 'generalLink' ->> 'token'));
      -- Guest-token lookup. Documents are TOASTed, so the heap is tiny and the
      -- planner prices a seq scan that detoasts every wedding as nearly free.
      -- It ignored the old GIN index on document -> 'guests'. A plpgsql wrapper
      -- is never inlined, and its declared COST makes the planner pick the
      -- index. The index also holds only tokens, not every guest field.
      create or replace function invitation_guest_tokens(document jsonb) returns jsonb
        language plpgsql immutable strict parallel safe cost 5000
        as $fn$ begin return jsonb_path_query_array(document, '$.guests[*].token'); end $fn$;
      create index if not exists invitation_guest_token_values_idx on invitation_orders using gin (invitation_guest_tokens(document) jsonb_path_ops);
      drop index if exists invitation_guest_tokens_idx;

      create table if not exists invitation_sessions (
        token_hash text primary key,
        order_id uuid not null references invitation_orders(id) on delete cascade,
        expires_at timestamptz not null
      );
      create index if not exists invitation_session_expiry_idx on invitation_sessions (expires_at);
      create index if not exists invitation_session_order_idx on invitation_sessions (order_id);
      create table if not exists invitation_login_attempts (
        reference text primary key references invitation_orders(reference) on delete cascade,
        attempts integer not null default 1,
        reset_at timestamptz not null default (now() + interval '15 minutes')
      );
      create table if not exists invitation_rate_limits (
        key text primary key,
        attempts integer not null default 1,
        reset_at timestamptz not null
      );
      create index if not exists invitation_rate_limits_reset_idx on invitation_rate_limits (reset_at);

      alter table invitation_orders add column if not exists source_submission_id bigint references submissions(id) on delete set null;
      create unique index if not exists invitation_source_submission_idx on invitation_orders(source_submission_id);
      insert into app_schema (id, version) values (1, 3) on conflict (id) do update set version = excluded.version;
    end
    $bootstrap$
  `
}

export async function db() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new HttpError(503, "Databaza nuk është konfiguruar.")

  client ??= neon(url)
  schemaReady ??= createSchema(client).catch((error: unknown) => {
    schemaReady = null
    throw error
  })
  await schemaReady
  return client
}

export type StoredProduct = {
  product: Product
  active: boolean
  sortOrder: number
}

export async function listProducts(sql: Sql, { activeOnly = false } = {}) {
  const rows = activeOnly
    ? await sql`select data, active, sort_order from products where active order by sort_order, id`
    : await sql`select data, active, sort_order from products order by sort_order, id`

  return rows.map((row): StoredProduct => ({
    product: row.data as Product,
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order),
  }))
}

// The database catalog wins once it has products; until then the shop keeps
// selling from the static catalog shipped with the site.
export async function getCatalog(sql: Sql) {
  const stored = await listProducts(sql)
  return stored.length
    ? stored.filter((item) => item.active).map((item) => item.product)
    : staticProducts
}
