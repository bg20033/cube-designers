import { randomBytes, randomUUID, createHash, timingSafeEqual, scryptSync } from "node:crypto"
import { db } from "./db.js"
import { requireAdmin } from "./auth.js"
import { HttpError, text } from "./http.js"
import { isWedding, type Wedding, type Guest, type Attendance } from "../../src/components/invitations/model.js"
import type { InvitationDashboard, InvitationOrder } from "../../src/components/invitations/online-types.js"
import { cleanWeddingPlan } from "../../src/components/invitations/planning-model.js"

export const SESSION_COOKIE = "cube_invitation"
export const SESSION_DAYS = 30
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex")
export const randomToken = () => randomBytes(32).toString("hex")
export const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export function passwordInput(value: unknown) {
  if (typeof value !== "string" || value.length < 12 || value.length > 200)
    throw new HttpError(400, "Fjalëkalimi duhet të ketë 12–200 karaktere.")
  return value
}
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  return `scrypt$32768$8$3$${salt}$${scryptSync(password, salt, 32, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }).toString("hex")}`
}
export function verifyPassword(password: string, encoded: string) {
  const [algorithm, n, r, p, salt, hash] = encoded.split("$")
  if (algorithm !== "scrypt" || n !== "32768" || r !== "8" || p !== "3" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{64}$/.test(hash ?? "")) return false
  return timingSafeEqual(scryptSync(password, salt, 32, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }), Buffer.from(hash, "hex"))
}
export function sessionToken(request: Request) {
  const token = (request.headers.get("cookie") ?? "").split(";").map((s) => s.trim()).find((s) => s.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1) ?? ""
  return /^[a-f0-9]{64}$/.test(token) ? token : ""
}
export function sessionCookie(token: string, clear = false) {
  return `${SESSION_COOKIE}=${token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_DAYS * 86400}`
}
export async function createOwnerSession(orderId: string) {
  const sql = await db()
  const token = randomToken()
  // One round trip. Logins also do the housekeeping: drop expired sessions
  // (invitation_session_expiry_idx) and lockout counters whose window ended
  // more than a day ago. Those rows only exist for references that once
  // failed a login.
  await sql`
    with expired_sessions as (delete from invitation_sessions where expires_at < now()),
      stale_attempts as (delete from invitation_login_attempts where reset_at < now() - interval '1 day')
    insert into invitation_sessions (token_hash, order_id, expires_at) values (${tokenHash(token)}, ${orderId}, now() + interval '30 days')
  `
  return sessionCookie(token)
}

/**
 * Fixed-window counter. It returns true while `key` has been seen at most
 * `limit` times in the current window of `windowSeconds`, and false once the
 * limit is passed. It is one atomic upsert, so concurrent requests can't
 * under-count. Pass already-hashed keys such as `login-ip:<sha256>`: raw IPs
 * and tokens must never be stored. Rows whose window ended more than a day
 * ago are purged on the same round trip.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (!key || key.length > 200 || !Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 7 * 86400)
    throw new Error("rateLimit: invalid arguments")
  const sql = await db()
  const [row] = await sql`
    with purge as (delete from invitation_rate_limits where reset_at < now() - interval '1 day' and key <> ${key})
    insert into invitation_rate_limits (key, attempts, reset_at) values (${key}, 1, now() + make_interval(secs => ${windowSeconds}::integer))
    on conflict (key) do update set
      attempts = case when invitation_rate_limits.reset_at < now() then 1 else invitation_rate_limits.attempts + 1 end,
      reset_at = case when invitation_rate_limits.reset_at < now() then excluded.reset_at else invitation_rate_limits.reset_at end
    returning attempts
  `
  return Number(row.attempts) <= limit
}

export type InvitationRow = InvitationOrder & { document: Wedding; password_hash: string }
export async function ownerOrder(request: Request): Promise<{ row: InvitationRow; administrator: boolean }> {
  const id = new URL(request.url).searchParams.get("order")
  if (id !== null) {
    await requireAdmin(request)
    if (!uuid(id)) throw new HttpError(400, "ID e porosisë nuk është valide.")
    const sql = await db()
    const [row] = await sql`select * from invitation_orders where id = ${id}`
    if (!row) throw new HttpError(404, "Porosia nuk u gjet.")
    return { row: row as InvitationRow, administrator: true }
  }
  const token = sessionToken(request)
  if (!token) throw new HttpError(401, "Kyçu për t’i menaxhuar ftesat.")
  const sql = await db()
  const [row] = await sql`
    select o.* from invitation_orders o join invitation_sessions s on s.order_id = o.id
    where s.token_hash = ${tokenHash(token)} and s.expires_at > now()
  `
  if (!row) throw new HttpError(401, "Hyrja ka skaduar. Kyçu përsëri.")
  return { row: row as InvitationRow, administrator: false }
}

export function orderSummary(row: InvitationRow, administrator = false): InvitationOrder {
  return {
    id: row.id, reference: row.reference, customer: row.customer,
    status: row.status, payment_status: row.payment_status,
    total: row.total === null ? null : Number(row.total),
    revision: Number(row.revision), created_at: row.created_at,
    ...(administrator ? { notes: row.notes } : {}),
  }
}
export function dashboard(row: InvitationRow, administrator = false): InvitationDashboard {
  return { order: orderSummary(row, administrator), wedding: { ...row.document, demoActivated: row.status === "active" }, administrator }
}

export function prepareWedding(input: unknown, stored: Wedding): Wedding {
  if (!isWedding(input)) throw new HttpError(400, "Detajet e ftesave nuk janë valide.")
  const previous = new Map(stored.guests.map((g) => [g.id, g]))
  const guests: Guest[] = input.guests.map((g) => {
    const old = previous.get(g.id)
    const responses = Object.fromEntries(Object.entries(old?.responses ?? {}).filter(([id]) => g.events.includes(id)).map(([id, response]) => [id, { ...response, count: Math.min(response.count, g.capacity) }]))
    return { id: g.id, token: old?.token ?? randomToken(), name: g.name.trim(), kind: g.kind, capacity: g.capacity, events: g.events, message: g.message.trim(), responses }
  })
  // RSVP and guest secrets belong to the server. Organizer edits cannot forge
  // responses or choose predictable public tokens.
  return { version: 1, names: input.names.trim(), message: input.message.trim(), design: input.design, events: input.events.map((e) => ({ id: e.id, name: e.name.trim(), date: e.date, time: e.time, venue: e.venue.trim(), address: e.address.trim(), ...(e.mapUrl?.trim() ? { mapUrl: e.mapUrl.trim() } : {}) })), guests, demoActivated: false,
    ...(input.generalLink ? { generalLink: { enabled: input.generalLink.enabled, token: (input.generalLink as { rotate?: unknown }).rotate === true ? randomToken() : stored.generalLink?.token ?? randomToken(), events: [...input.generalLink.events], capacity: input.generalLink.capacity } } : stored.generalLink ? { generalLink: stored.generalLink } : {}),
    ...((input.planning ?? stored.planning) ? { planning: cleanWeddingPlan((input.planning ?? stored.planning)!) } : {}),
  }
}

export function parseResponses(input: unknown, guest: Guest): Record<string, Attendance> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new HttpError(400, "Përgjigje e pavlefshme.")
  const entries = Object.entries(input)
  if (entries.length !== guest.events.length || entries.some(([id]) => !guest.events.includes(id))) throw new HttpError(400, "Përgjigju vetëm për eventet ku je ftuar.")
  // Object.fromEntries defines own properties, so an id like "__proto__" is kept rather than hitting the setter.
  return Object.fromEntries(entries.map(([id, value]) => {
    const response = value as Partial<Attendance> | null
    if (!response || !["accepted", "declined"].includes(response.status ?? "") || !Number.isInteger(response.count) ||
      (response.status === "declined" ? response.count !== 0 : Number(response.count) < 1 || Number(response.count) > guest.capacity)) throw new HttpError(400, "Numri i personave nuk përputhet me vendet e rezervuara.")
    return [id, { status: response.status!, count: response.count! }]
  }))
}

export function publicToken(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "")
  if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(404, "Kjo ftesë nuk është e disponueshme.")
  return token
}
export async function publicOrder(token: string) {
  const sql = await db()
  // The expression must match invitation_guest_token_values_idx exactly
  // (see db.ts). Otherwise this falls back to a seq scan that detoasts
  // every wedding document.
  const [row] = await sql`
    select * from invitation_orders where status = 'active' and payment_status = 'paid'
    and invitation_guest_tokens(document) @> ${JSON.stringify([token])}::jsonb
  `
  if (!row) throw new HttpError(404, "Kjo ftesë nuk është e disponueshme.")
  const order = row as InvitationRow
  const guestIndex = order.document.guests.findIndex((g) => g.token === token)
  if (guestIndex < 0) throw new HttpError(404, "Kjo ftesë nuk është e disponueshme.")
  return { row: order, guest: order.document.guests[guestIndex], guestIndex }
}

export function newWedding(names: string, date: string): Wedding {
  const before = (days: number) => new Date(new Date(`${date}T12:00:00Z`).getTime() - days * 86400000).toISOString().slice(0, 10)
  return {
    version: 1, names, message: "Me zemrat plot dashuri, ju ftojmë të festoni me ne fillimin e kapitullit tonë më të bukur.", design: "lilac", guests: [], demoActivated: false,
    events: [
      { id: "kanagjegji", name: "Kanagjegji", date: before(2), time: "19:00", venue: "", address: "" },
      { id: "nata", name: "Nata e dasmës", date: before(1), time: "20:00", venue: "", address: "" },
      { id: "dasma", name: "Dasma", date, time: "18:00", venue: "", address: "" },
    ],
  }
}
export function packagePrice() {
  const value = process.env.INVITATION_PRICE_EUR
  if (!value) return null
  const price = Number(value)
  if (!Number.isFinite(price) || price < 0 || price > 100000) throw new HttpError(503, "Çmimi i paketës nuk është konfiguruar saktë.")
  return Math.round(price * 100) / 100
}
export function requestKey(value: unknown) {
  const key = text(value, "ID e kërkesës", { required: true, max: 36 })
  if (!uuid(key)) throw new HttpError(400, "ID e kërkesës nuk është valide.")
  return key
}
export const newOrderId = () => randomUUID()

export async function generalOrder(token: string) {
  const sql = await db()
  const [row] = await sql`select * from invitation_orders where status = 'active' and payment_status = 'paid'
    and document -> 'generalLink' ->> 'token' = ${token}
    and document -> 'generalLink' ->> 'enabled' = 'true'`
  if (!row) throw new HttpError(404, "Ky link i përgjithshëm nuk është i disponueshëm.")
  return row as InvitationRow
}

// ---------------------------------------------------------------------------
// Concurrency-safe writes. See docs/ftesa-database.md, "Concurrency model".
//
// Each write is ONE UPDATE that recomputes its change from the row's current
// `document`. When two writers hit the same order, Postgres row-locks it and
// re-evaluates the second UPDATE's WHERE and SET against the committed
// version (READ COMMITTED EvalPlanQual). Neither write is lost, and none of
// these needs neon's non-interactive `sql.transaction`.
//
// `revision` is the STRUCTURE version the dashboard edits against. Owner
// saves, general-link registrations and admin status changes bump it. RSVPs
// do not: an owner save merges the stored RSVPs in SQL, so a guest replying
// never invalidates the couple's in-progress edit.
// ---------------------------------------------------------------------------

/**
 * Store `responses` (already checked by parseResponses against `guest`) on
 * the guest with `guest.token`. Only that guest's `responses` key is
 * rewritten, and `revision` is not bumped. Returns false when nothing was
 * written: the guest was removed or its capacity/events changed since it
 * was read, or the order is no longer active and paid. The caller should
 * re-read with publicOrder and re-validate.
 */
export async function recordGuestResponses(orderId: string, guest: Pick<Guest, "token" | "capacity" | "events">, responses: Record<string, Attendance>): Promise<boolean> {
  const sql = await db()
  const [row] = await sql`
    update invitation_orders o set
      document = jsonb_set(o.document, array['guests', (
          select (e.i - 1)::text from jsonb_array_elements(o.document -> 'guests') with ordinality e(g, i)
          where e.g ->> 'token' = ${guest.token} limit 1), 'responses'], ${JSON.stringify(responses)}::jsonb),
      updated_at = now()
    where o.id = ${orderId} and o.status = 'active' and o.payment_status = 'paid'
      and (select jsonb_build_object('capacity', e.g -> 'capacity', 'events', e.g -> 'events')
           from jsonb_array_elements(o.document -> 'guests') e(g) where e.g ->> 'token' = ${guest.token} limit 1)
        = ${JSON.stringify({ capacity: guest.capacity, events: guest.events })}::jsonb
    returning o.id
  `
  return Boolean(row)
}

/**
 * Append a guest registered through the general link, and bump `revision`
 * so a dashboard editing an older guest list gets 409 instead of dropping
 * the new guest. `link` must be the generalLink object `guest` was
 * validated against. Returns false when nothing was written: the link
 * changed or was disabled, the order is no longer active and paid, the list
 * is full (2000), or a guest with `guest.id` already exists, which means a
 * concurrent retry of the same requestId won. The caller should re-read
 * with generalOrder, return an existing guest with that id if there is one,
 * and otherwise re-validate.
 */
export async function appendGeneralGuest(orderId: string, link: NonNullable<Wedding["generalLink"]>, guest: Guest): Promise<boolean> {
  const sql = await db()
  const [row] = await sql`
    update invitation_orders o set
      document = jsonb_set(o.document, '{guests}', (o.document -> 'guests') || jsonb_build_array(${JSON.stringify(guest)}::jsonb)),
      revision = o.revision + 1, updated_at = now()
    where o.id = ${orderId} and o.status = 'active' and o.payment_status = 'paid'
      and o.document -> 'generalLink' = ${JSON.stringify(link)}::jsonb
      and jsonb_array_length(o.document -> 'guests') < 2000
      and not (o.document -> 'guests' @> jsonb_build_array(jsonb_build_object('id', ${guest.id}::text)))
    returning o.id
  `
  return Boolean(row)
}

/**
 * Owner/admin save of a document produced by prepareWedding(input, row.document).
 * It is a compare-and-set on `revision`: it succeeds only if the client's
 * `baseRevision` matches both the row it was prepared from and the stored
 * row. Status and payment must also be unchanged. Each guest's `responses`
 * is NOT taken from `document`. It is rebuilt in SQL from the CURRENT stored
 * responses, using the same rules as prepareWedding: keep only events the
 * guest is still invited to, and clamp counts to capacity. An RSVP that
 * lands between the read and this write is therefore kept. Returns the
 * updated row, or undefined on a revision/status conflict (respond 409).
 */
export async function updateWedding(row: InvitationRow, baseRevision: number, document: Wedding): Promise<InvitationRow | undefined> {
  if (baseRevision !== Number(row.revision)) return undefined
  const sql = await db()
  const [updated] = await sql`
    update invitation_orders o set
      document = (
        select jsonb_set(d.doc, '{guests}', coalesce((
          select jsonb_agg(n.g || jsonb_build_object('responses', coalesce((
              select jsonb_object_agg(r.key, r.value || jsonb_build_object('count', least((r.value ->> 'count')::int, (n.g ->> 'capacity')::int)))
              from jsonb_each(coalesce(m.responses -> (n.g ->> 'id'), '{}'::jsonb)) r
              where n.g -> 'events' ? r.key), '{}'::jsonb)) order by n.i)
          from jsonb_array_elements(d.doc -> 'guests') with ordinality n(g, i)), '[]'::jsonb))
        from (select ${JSON.stringify(document)}::jsonb as doc) d,
          (select coalesce(jsonb_object_agg(s.g ->> 'id', s.g -> 'responses'), '{}'::jsonb) as responses
           from jsonb_array_elements(o.document -> 'guests') s(g)) m),
      revision = o.revision + 1, updated_at = now()
    where o.id = ${row.id} and o.revision = ${baseRevision} and o.status = ${row.status} and o.payment_status = ${row.payment_status}
    returning o.*
  `
  return updated as InvitationRow | undefined
}
