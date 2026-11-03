import { requireAdmin } from "../../_lib/auth.js"
import { db } from "../../_lib/db.js"
import { handle, HttpError, json, oneOf, positiveId, readJson, text } from "../../_lib/http.js"
import { hashPassword, newOrderId, newWedding, randomToken, tokenHash, uuid } from "../../_lib/invitations.js"

export const GET = handle(async (request) => {
  await requireAdmin(request)
  const sql = await db()
  const rows = await sql`
    select id, reference, customer, status, payment_status, total, notes, revision, created_at, source_submission_id,
      jsonb_array_length(document -> 'guests') as guest_count
    from invitation_orders order by created_at desc limit 1000
  `
  const requests = await sql`
    select s.id, s.kind, s.name, s.email, s.company, s.message, s.details, s.status, s.notes, s.created_at,
      o.id as account_id, o.reference as account_reference
    from submissions s left join invitation_orders o on o.source_submission_id = s.id
    where s.kind = 'project' and s.details -> 'services' @> '["Ftesa online"]'::jsonb
    order by s.created_at desc limit 1000
  `
  return json({ requests: requests.map((row) => ({ ...row, id: Number(row.id) })), orders: rows.map((row) => ({ ...row, total: row.total === null ? null : Number(row.total), revision: Number(row.revision), guest_count: Number(row.guest_count) })) })
})

// Creating an account and reviewing its source request are one atomic write.
export const POST = handle(async (request) => {
  await requireAdmin(request)
  const body = await readJson(request, 6000)
  const submissionId = positiveId(body.submissionId)
  const names = text(body.names, "emrat e çiftit", { required: true, max: 100 })
  const date = text(body.date, "data", { required: true, max: 10 })
  const parsed = new Date(`${date}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < "2020-01-03") throw new HttpError(400, "Data e dasmës nuk është valide.")
  const phone = text(body.phone, "telefoni", { max: 40 })
  if (body.activate !== undefined && typeof body.activate !== "boolean") throw new HttpError(400, "Aktivizimi nuk është valid.")
  const activate = body.activate === true
  const id = newOrderId()
  const reference = `FTE-${id.replaceAll("-", "").slice(0, 12).toUpperCase()}`
  const password = randomToken().slice(0, 24)
  const document = newWedding(names, date)
  const sql = await db()
  const [created] = await sql`
    with source as (
      select id, name, email from submissions
      where id = ${submissionId} and kind = 'project' and details -> 'services' @> '["Ftesa online"]'::jsonb
        and status in ('new', 'in_progress') for update
    ), created as (
      insert into invitation_orders (id, reference, customer, password_hash, document, status, payment_status, request_key, request_hash, source_submission_id)
      select ${id}, ${reference}, jsonb_build_object('name', source.name, 'email', source.email, 'phone', ${phone}::text),
        ${hashPassword(password)}, ${JSON.stringify(document)}::jsonb, ${activate ? "active" : "pending"}, ${activate ? "paid" : "unpaid"},
        ${id}::uuid, ${tokenHash(JSON.stringify({ submissionId, names, date }))}, source.id from source
      on conflict (source_submission_id) do nothing returning id, reference, customer
    ), reviewed as (
      update submissions set status = 'done' from created where submissions.id = ${submissionId} returning submissions.id
    ) select created.* from created join reviewed on true
  `
  if (!created) {
    const [existing] = await sql`select id from invitation_orders where source_submission_id = ${submissionId}`
    if (existing) throw new HttpError(409, "Kjo kërkesë e ka një llogari. Hape te Llogaritë.")
    throw new HttpError(409, "Kërkesa mungon ose është refuzuar. Rihape para se të krijosh llogari.")
  }
  return json({ id: created.id, reference: created.reference, email: (created.customer as { email: string }).email, password }, 201, { "cache-control": "no-store" })
})

export const PATCH = handle(async (request) => {
  await requireAdmin(request)
  const body = await readJson(request, 8000)
  const id = text(body.id, "ID", { required: true, max: 36 })
  if (!uuid(id)) throw new HttpError(400, "ID e porosisë nuk është valide.")
  if (body.resetPassword === true) {
    const password = randomToken().slice(0, 24)
    const sql = await db()
    const [row] = await sql`
      with changed as (
        update invitation_orders set password_hash = ${hashPassword(password)}, revision = revision + 1, updated_at = now()
        where id = ${id} returning id, reference, customer
      ), expired as (delete from invitation_sessions where order_id = ${id})
      select * from changed
    `
    if (!row) throw new HttpError(404, "Llogaria nuk u gjet.")
    return json({ id: row.id, reference: row.reference, email: (row.customer as { email: string }).email, password }, 200, { "cache-control": "no-store" })
  }
  const status = body.status === undefined ? null : oneOf(body.status, ["pending", "active", "suspended", "cancelled"], "statusi")
  const payment = body.paymentStatus === undefined ? null : oneOf(body.paymentStatus, ["unpaid", "paid"], "pagesa")
  const notes = body.notes === undefined ? null : text(body.notes, "shënime", { max: 5000 })
  const total = body.total
  if (total !== undefined && total !== null && (typeof total !== "number" || !Number.isFinite(total) || total < 0 || total > 100000)) throw new HttpError(400, "Çmimi nuk është valid.")
  const sql = await db()
  // The predicate prevents active/unpaid combinations even when two admins
  // change the order concurrently. Public clients cannot call this endpoint.
  const [row] = await sql`
    update invitation_orders set status = coalesce(${status}, status), payment_status = coalesce(${payment}, payment_status),
      notes = coalesce(${notes}, notes), total = case when ${total !== undefined} then ${total ?? null}::numeric else total end,
      revision = revision + 1, updated_at = now()
    where id = ${id} and (coalesce(${status}, status) <> 'active' or coalesce(${payment}, payment_status) = 'paid')
    returning id
  `
  if (!row) {
    const [exists] = await sql`select id from invitation_orders where id = ${id}`
    if (exists) throw new HttpError(400, "Konfirmo pagesën para se ta aktivizosh paketën.")
    throw new HttpError(404, "Porosia nuk u gjet.")
  }
  return json({ ok: true })
})
