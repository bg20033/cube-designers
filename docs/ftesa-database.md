# ftesa: database

Online invitations ("ftesa") are stored in Neon Postgres and accessed from Vercel functions through the `@neondatabase/serverless` HTTP driver (`neon()`). Every query is one HTTPS request and runs as its own implicit transaction. The schema is created by `api/_lib/db.ts`. The SQL for invitations lives in `api/_lib/invitations.ts`, and the handlers in `api/invitation*.ts` and `api/admin/invitations.ts` call into it.

## Schema

| Table | Purpose |
|---|---|
| `invitation_orders` | One row per wedding. `document jsonb` holds the whole wedding: events, guests (each with a secret `token` and its RSVP `responses`), `generalLink`, `planning`. `revision bigint` is the structure version the dashboard edits against. Also holds `status` (`pending`/`active`/`suspended`/`cancelled`), `payment_status` (`unpaid`/`paid`), `password_hash` (scrypt), `request_key` (unique; makes order creation idempotent), `reference` (unique, `FTE-…`, used for login). |
| `invitation_sessions` | Owner logins. `token_hash` (sha256 of the cookie token) is the primary key. `order_id` references `invitation_orders` with `on delete cascade`. Sessions expire 30 days after creation (`expires_at`). |
| `invitation_login_attempts` | Per-reference lockout counter: 8 attempts per 15 minutes. `reference` references `invitation_orders(reference)` with `on delete cascade`. |
| `invitation_rate_limits` | Generic fixed-window counters for `rateLimit()`. Keys are pre-hashed (`login-ip:<sha256>`, `general:<sha256>`), so no raw IPs or tokens are stored. |
| `app_schema` | A single row (`id = 1`) holding the installed schema `version`. |

The same bootstrap also creates the shop tables `submissions`, `orders` and `products`.

### Document shape (`invitation_orders.document`)

```
{ version: 1, names, message, design, demoActivated,
  events:   [{ id, name, date, time, venue, address, mapUrl? }],
  guests:   [{ id, token, name, kind, capacity, events: [eventId], message,
               responses: { [eventId]: { status: "accepted"|"declined", count } } }],   // at most 2000
  generalLink?: { enabled, token, events: [eventId], capacity },
  planning?: { … private, never sent to guests … } }
```

## Indexes and the queries that use them

| Query (function) | Shape | Index |
|---|---|---|
| Guest opens a personal link (`publicOrder`) | `invitation_guest_tokens(document) @> '["<token>"]'` | `invitation_guest_token_values_idx`: GIN `jsonb_path_ops` on `invitation_guest_tokens(document)` |
| Guest opens the general link (`generalOrder`) | `document -> 'generalLink' ->> 'token' = $1` | `invitation_general_tokens_idx`: btree expression |
| Owner dashboard (`ownerOrder`) | `invitation_sessions.token_hash = $1`, join on `invitation_orders.id` | `invitation_sessions_pkey`, then `invitation_orders_pkey` |
| Expired-session purge (`createOwnerSession`) | `delete … where expires_at < now()` | `invitation_session_expiry_idx` |
| Cascade when an order is deleted | `invitation_sessions.order_id = $1` | `invitation_session_order_idx` |
| Login (`invitation-session` POST) | `reference = $1` | `invitation_orders_reference_key`, `invitation_login_attempts_pkey` |
| Rate-limit purge (`rateLimit`) | `delete … where reset_at < now() - 1 day` | `invitation_rate_limits_reset_idx` |
| RSVP, registration and owner save | `where id = $1` (the order was already resolved by one of the lookups above) | `invitation_orders_pkey` |

**Why the guest-token index uses a function.** A GIN `jsonb_path_ops` index only serves `@>` containment, and only when the query uses exactly the indexed expression. The original index was on `(document -> 'guests')`, and the query matched it, but the planner still never used it. Documents are TOASTed, so the main heap is a few pages and a seq scan is priced at about 13. That price ignores the cost of detoasting every wedding, which is what actually happens (≈12–15 ms and 1,600+ buffers at 300 orders, growing linearly). `invitation_guest_tokens(jsonb)` is an `immutable` plpgsql wrapper around `jsonb_path_query_array(document, '$.guests[*].token')`. Being plpgsql, it is never inlined, so its declared `cost 5000` reaches the planner, which then picks the index (0.07 ms, 11 buffers). The index also holds only tokens rather than every key and value of every guest: 5.0 MB instead of 11 MB for 91k guests. **Any new guest-token lookup must use `invitation_guest_tokens(document) @> $1::jsonb` with a JSON array of one token. `document -> 'guests' @> …` has no index any more.**

## Concurrency model

All invitation writes are single, self-contained `UPDATE` statements that recompute their change from the row's current `document`. Under Postgres's default READ COMMITTED level, a second writer on the same order waits for the first writer's row lock. It then re-evaluates its `WHERE` and `SET` against the newly committed row version (EvalPlanQual). The result is that concurrent writers serialize, and none overwrites another's change.

We do not use transactions for this, because the Neon HTTP driver's `sql.transaction([...])` is **non-interactive**. All of its queries are fixed before it is sent, so you cannot `SELECT … FOR UPDATE`, inspect the result in JavaScript and then write. Interactive transactions would need the WebSocket `Pool`/`Client`, which adds connection overhead to every serverless invocation. A single statement gives the same guarantee for these cases.

| Write | Function | Behaviour | Bumps `revision`? |
|---|---|---|---|
| Guest RSVP | `recordGuestResponses(orderId, guest, responses)` | Rewrites only `guests[i].responses`, where `i` is found by token inside the statement. It is guarded by the guest's `capacity` and `events` being unchanged since the responses were validated, and by the order being `active`/`paid`. Returns `false` when the guard fails, and the handler then re-reads and re-validates. | **No** |
| General-link registration | `appendGeneralGuest(orderId, link, guest)` | Appends the guest. It is guarded by `generalLink` being unchanged, fewer than 2000 guests, and no guest with the same `id` existing. The `id` is derived from the client `requestId`, so a duplicate retry becomes a no-op and the handler returns the existing guest. | Yes |
| Owner/admin save | `updateWedding(row, baseRevision, document)` | Compare-and-set on `revision`. The client's `baseRevision` must equal both the row `prepareWedding` used and the stored row, and `status`/`payment_status` must be unchanged. Each guest's `responses` are rebuilt in SQL from the current stored row: they are filtered to the guest's events and clamped to capacity, the same rules as `prepareWedding`. Client-sent responses are ignored. | Yes |
| Admin status/payment/notes | `api/admin/invitations.ts` PATCH | Single `UPDATE` with a predicate that forbids `active` while unpaid. | Yes |

What this means in practice (each case was verified with interleaved sessions; see below):

- **Two guests reply at the same moment.** Both replies are stored. The second waits a few milliseconds for the row lock, with no retry and no 409.
- **A guest replies while the couple is editing.** The couple's save succeeds and contains the reply, even if the reply landed after the dashboard was loaded, or between the server's read and its write. Before this change every RSVP bumped `revision`, so the couple got a 409 and lost their in-progress edit.
- **The couple changes a guest's capacity or events while that guest replies.** If the reply commits first, the save clamps or filters it. If the save commits first, the reply's guard fails, the handler re-reads, and the guest gets a validation error for answers that no longer apply.
- **A guest registers through the general link while the couple is editing.** The couple's save gets a 409 and the dashboard refreshes. This is deliberate. A save built from a guest list without the new guest would otherwise delete that guest.
- **The same registration is submitted twice concurrently.** Exactly one guest is created.

`revision` is therefore the *structure* version. Use it to detect "someone changed the guest list or settings". It does not count RSVPs; `updated_at` changes on every write.

Cost: each write rewrites the whole `document`, which is TOASTed and can be several hundred KB for large weddings. Measured on 2000 guests (573 KB): RSVP ≈ 7–9 ms, owner save with merge ≈ 19 ms. If weddings grow far beyond the 2000-guest cap, or RSVP traffic becomes heavy, the next step would be moving `responses` into their own table keyed by `(order_id, guest_id, event_id)`.

## Schema bootstrap and migrations

`db()` runs the bootstrap once per function instance, as a single DO block:

1. It reads `app_schema.version`. If the version is current, it returns. This is the steady state: one round trip, about 1 ms, and an `AccessShareLock` on `app_schema` only.
2. Otherwise it takes `pg_advisory_xact_lock(4823517301)`, so concurrent cold starts on an empty database cannot race `create table if not exists`, and re-checks the version.
3. It runs every DDL statement (all idempotent) and writes the new version, all in that same transaction.

The previous bootstrap sent 12 separate statements on every cold start. Even as no-ops they locked tables: `alter table orders add column if not exists …` took an **AccessExclusiveLock** on `orders`, and each `create index if not exists` took a ShareLock that blocks writers.

**To change the schema:** add idempotent DDL inside the block in `api/_lib/db.ts` and bump **both** version literals (`if installed >= N` appears twice, and the final `insert … values (1, N)`). Use `create … if not exists`, `alter table … add column if not exists`, `drop … if exists`, or `create or replace function`. The first cold start after deploy applies it. Index builds lock the table for writes while they run, which takes milliseconds at the current size (75 ms to build the token index over 91k guests locally).

Version history:
- 3: `invitation_orders.source_submission_id`, referencing contact requests with `on delete set null`, and a unique index preventing duplicate account creation from one request.
- 1: implicit (the unversioned bootstrap).
- 2: `app_schema`; `invitation_guest_tokens()` and `invitation_guest_token_values_idx` (drops `invitation_guest_tokens_idx`); `invitation_session_order_idx`; `invitation_rate_limits` and its `reset_at` index.

## Retention and cleanup

| Data | Removed when |
|---|---|
| Expired sessions | On every login or order creation (`createOwnerSession`), in the same round trip as the insert. Explicit logout deletes the session immediately. |
| Login-attempt counters | Deleted on successful login. Rows whose window ended more than a day ago are purged by `createOwnerSession`. Rows only exist for real references. |
| Rate-limit counters | Rows expired for more than a day are purged on every `rateLimit()` call, except the key being counted. |
| Sessions and login attempts of a deleted order | `on delete cascade`. |
| Orders and wedding documents | Never deleted automatically. Deleting an order (admin or SQL) cascades to its sessions and login attempts. |

## Local verification

Never point these steps at the real `DATABASE_URL`.

Automated (PGlite, an in-memory Postgres): `npx vitest run api/_lib/invitations-db.test.ts`. It covers the bootstrap re-run, the token-index plan, RSVP, registration, owner-save merge, rate limiting and cleanup. PGlite has a single connection, so lock interleavings need a real server:

```sh
D=$(mktemp -d)                      # keep the path short: macOS socket paths are limited to 103 bytes
initdb -D "$D/data" -U postgres --auth=trust -E UTF8 --no-locale
pg_ctl -D "$D/data" -o "-p 55432 -k '' -c listen_addresses=127.0.0.1" -l "$D/log" start
psql -h 127.0.0.1 -p 55432 -U postgres -c 'create database ftesa'
# Paste the DO block from api/_lib/db.ts into bootstrap.sql, then:
psql -h 127.0.0.1 -p 55432 -U postgres -d ftesa -f bootstrap.sql
```

Things to check:

- **Index use.** Seed a few hundred orders, then
  `explain analyze select * from invitation_orders where status='active' and payment_status='paid' and invitation_guest_tokens(document) @> '["<token>"]'`
  must show `Bitmap Index Scan on invitation_guest_token_values_idx`.
- **Interleaving.** In session A run `begin;`, then an RSVP `UPDATE`, then hold the transaction open. Start a second RSVP in session B and an owner save in session C, built from the pre-RSVP document. Both block (`pg_stat_activity.wait_event_type = 'Lock'`). After A commits, all three changes are present.
- **Bootstrap race.** Run the DO block from four parallel `psql` processes against an empty database: there are no errors and `app_schema.version` is correct.

Stop the server with `pg_ctl -D "$D/data" stop` and delete `$D`.


## Admin-controlled access

The public three-field form saves a `project` submission with `details.services = ["Ftesa online"]`. It does not create an invitation account. `/api/admin/invitations` lists these submissions alongside accounts and supports creating an account from a selected request. A single data-modifying CTE locks the eligible request, creates its account and marks the request reviewed. A unique source index prevents duplicates, including concurrent approval attempts. Rejected requests must be reopened first.

New passwords are generated server-side, stored as scrypt hashes and returned once to the authenticated admin with `cache-control: no-store`. The admin copies or prepares an email draft for the client; no email is sent automatically. Password resets revoke existing owner sessions in the same statement. The legacy order-creation endpoint also requires admin authentication. Activation, suspension and public RSVP access retain the existing paid/active checks.
