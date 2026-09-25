import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

import { products as staticProducts, type Product } from "../../src/data/products.js"
import { HttpError } from "./http.js"

type Sql = NeonQueryFunction<false, false>

let client: Sql | null = null
let schemaReady: Promise<void> | null = null

export const submissionStatuses = ["new", "in_progress", "done", "archived"] as const
export const orderStatuses = [
  "new",
  "confirmed",
  "in_production",
  "delivered",
  "cancelled",
] as const

// Tables are created on first use so a fresh Neon database needs no manual
// migration step.
async function createSchema(sql: Sql) {
  await sql`
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
    )
  `
  await sql`
    create table if not exists orders (
      id bigint generated always as identity primary key,
      reference text not null unique,
      customer jsonb not null,
      items jsonb not null,
      total numeric(10, 2) not null,
      status text not null default 'new',
      notes text not null default '',
      created_at timestamptz not null default now()
    )
  `
  await sql`
    create table if not exists products (
      id text primary key,
      data jsonb not null,
      active boolean not null default true,
      sort_order integer not null default 0,
      updated_at timestamptz not null default now()
    )
  `
}

export async function db() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
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

  return rows.map(
    (row): StoredProduct => ({
      product: row.data as Product,
      active: Boolean(row.active),
      sortOrder: Number(row.sort_order),
    }),
  )
}

// The database catalog wins once it has products; until then the shop keeps
// selling from the static catalog shipped with the site.
export async function getCatalog(sql: Sql) {
  const stored = await listProducts(sql, { activeOnly: true })
  return stored.length ? stored.map((item) => item.product) : staticProducts
}
