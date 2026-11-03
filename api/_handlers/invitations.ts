import { db } from "../_lib/db.js"
import { requireAdmin } from "../_lib/auth.js"
import { limits, throttle } from "../_lib/throttle.js"
import { email, handle, HttpError, json, readJson, text } from "../_lib/http.js"
import { createOwnerSession, dashboard, hashPassword, newOrderId, newWedding, ownerOrder, packagePrice, passwordInput, prepareWedding, requestKey, tokenHash, updateWedding, verifyPassword, type InvitationRow } from "../_lib/invitations.js"

export const GET = handle(async (request) => {
  if (new URL(request.url).searchParams.get("action") === "status") {
    try {
      const sql = await db()
      await sql`select 1`
      return json({ available: true, price: packagePrice(), administrationConfigured: Boolean(process.env.ADMIN_PASSWORD) })
    } catch { return json({ available: false, price: null, administrationConfigured: false }) }
  }
  const { row, administrator } = await ownerOrder(request)
  return json(dashboard(row, administrator))
})

export const POST = handle(async (request) => {
  await requireAdmin(request)
  const body = await readJson(request, 6000)
  if (text(body.website, "website")) throw new HttpError(400, "Kërkesa nuk mund të pranohet.")
  const input = (body.customer ?? {}) as Record<string, unknown>
  const customer = {
    name: text(input.name, "emri", { required: true, max: 160 }),
    email: email(input.email), phone: text(input.phone, "telefoni", { required: true, max: 40 }),
  }
  const names = text(body.names, "emrat e çiftit", { required: true, max: 100 })
  const date = text(body.date, "data", { required: true, max: 10 })
  const parsed = new Date(`${date}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < "2020-01-03") throw new HttpError(400, "Data e dasmës nuk është valide.")
  const password = passwordInput(body.password)
  const key = requestKey(body.requestId)
  const requestHash = tokenHash(JSON.stringify({ customer, names, date }))
  await throttle([limits.orderPerIp(request)])
  const sql = await db()
  const id = newOrderId()
  const reference = `FTE-${id.replaceAll("-", "").slice(0, 12).toUpperCase()}`
  const document = newWedding(names, date)
  const [created] = await sql`
    insert into invitation_orders (id, reference, customer, password_hash, document, total, request_key, request_hash)
    values (${id}, ${reference}, ${JSON.stringify(customer)}::jsonb, ${hashPassword(password)}, ${JSON.stringify(document)}::jsonb, ${packagePrice()}, ${key}, ${requestHash})
    on conflict (request_key) do nothing returning *
  `
  let row = created as InvitationRow | undefined
  if (!row) {
    const [existing] = await sql`select * from invitation_orders where request_key = ${key}`
    if (!existing || existing.request_hash !== requestHash || !verifyPassword(password, existing.password_hash)) throw new HttpError(409, "Kjo kërkesë është përdorur me të dhëna të tjera. Fillo një kërkesë të re.")
    row = existing as InvitationRow
  }
  const cookie = await createOwnerSession(row.id)
  return json(dashboard(row), created ? 201 : 200, { "set-cookie": cookie })
})

export const PATCH = handle(async (request) => {
  const { row, administrator } = await ownerOrder(request)
  if (!administrator && (row.status !== "active" || row.payment_status !== "paid")) throw new HttpError(403, "Dashboard-i aktivizohet pasi admini e konfirmon pagesën.")
  const body = await readJson(request, 2_000_000)
  if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 1) throw new HttpError(400, "Version i pavlefshëm.")
  const document = prepareWedding(body.wedding, row.document)
  // Compare-and-set on revision; guest replies stored meanwhile are merged in
  // SQL, so an RSVP never makes the couple's save fail.
  const updated = await updateWedding(row, Number(body.revision), document)
  if (!updated) throw new HttpError(409, "Një përgjigje ose ndryshim i ri mbërriti ndërkohë. Të dhënat u rifreskuan; provo ta ruash përsëri.")
  return json(dashboard(updated, administrator))
})
