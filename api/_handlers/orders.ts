import { createHash, randomInt, randomUUID } from "node:crypto"
import { prepareOrderItems } from "../_lib/order-items.js"

import { db, getCatalog } from "../_lib/db.js"
import {
  handle,
  HttpError,
  json,
  optionalEmail,
  readJson,
  text,
} from "../_lib/http.js"

function newReference() {
  return `CUBE-${randomInt(100_000, 1_000_000)}`
}

// Public endpoint for shop checkout. Prices are recomputed from the catalog so
// the stored total never trusts the browser.
export const POST = handle(async (request) => {
  const body = await readJson(request)
  if (text(body.website, "website"))
    throw new HttpError(400, "Kërkesa nuk mund të pranohet.")

  const input = (body.customer ?? {}) as Record<string, unknown>
  const customer = {
    name: text(input.name, "emri", { max: 160, required: true }),
    email: optionalEmail(input.email),
    phone: text(input.phone, "telefoni", { max: 40, required: true }),
    address: text(input.address, "adresa", { max: 300, required: true }),
    notes: text(input.notes, "shënime", { max: 2000 }),
  }

  if (
    !Array.isArray(body.items) ||
    !body.items.length ||
    body.items.length > 50
  ) {
    throw new HttpError(400, "Cart-i është bosh.")
  }

  const sql = await db()
  const items = prepareOrderItems(body.items, await getCatalog(sql))
  const total =
    Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100
  const requestKey =
    text(body.requestId, "ID e kërkesës", { max: 36 }) || randomUUID()
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestKey,
    )
  )
    throw new HttpError(400, "ID e kërkesës nuk është valide.")
  const requestHash = createHash("sha256")
    .update(JSON.stringify({ customer, items }))
    .digest("hex")

  const requested = text(body.reference, "reference", { max: 20 })
  let reference = /^CUBE-\d{6}$/.test(requested) ? requested : newReference()

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const rows = await sql`
      insert into orders (reference, customer, items, total, request_key, request_hash)
      values (${reference}, ${JSON.stringify(customer)}::jsonb, ${JSON.stringify(items)}::jsonb, ${total}, ${requestKey}, ${requestHash})
      on conflict do nothing
      returning id
    `
    if (rows.length) return json({ ok: true, reference, total }, 201)
    const [existing] =
      await sql`select reference, request_hash from orders where request_key = ${requestKey}`
    if (existing) {
      if (existing.request_hash !== requestHash)
        throw new HttpError(
          409,
          "Kjo kërkesë është përdorur me të dhëna të tjera. Rifresko dhe provo përsëri.",
        )
      return json({ ok: true, reference: existing.reference, total })
    }
    reference = newReference()
  }

  throw new HttpError(500, "Porosia nuk u ruajt. Provo përsëri.")
})
