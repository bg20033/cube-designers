import { randomInt } from "node:crypto"

import { db, getCatalog } from "./_lib/db.js"
import { email, handle, HttpError, json, readJson, text } from "./_lib/http.js"

function newReference() {
  return `CUBE-${randomInt(100_000, 1_000_000)}`
}

// Public endpoint for shop checkout. Prices are recomputed from the catalog so
// the stored total never trusts the browser.
export const POST = handle(async (request) => {
  const body = await readJson(request)
  if (text(body.website, "website")) return json({ ok: true })

  const input = (body.customer ?? {}) as Record<string, unknown>
  const customer = {
    name: text(input.name, "emri", { max: 160, required: true }),
    email: email(input.email),
    phone: text(input.phone, "telefoni", { max: 40, required: true }),
    address: text(input.address, "adresa", { max: 300, required: true }),
    notes: text(input.notes, "shënime", { max: 2000 }),
  }

  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) {
    throw new HttpError(400, "Cart-i është bosh.")
  }

  const sql = await db()
  const catalog = new Map((await getCatalog(sql)).map((product) => [product.id, product]))

  const items = body.items.map((raw: unknown) => {
    const item = (raw ?? {}) as Record<string, unknown>
    const product = catalog.get(String(item.productId))
    const quantity = Number(item.quantity)
    if (!product) throw new HttpError(400, "Një produkt nuk ekziston më.")
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new HttpError(400, "Sasia nuk është valide.")
    }
    return {
      productId: product.id,
      name: product.name,
      quantityLabel: product.quantityLabel,
      price: product.price,
      quantity,
      lineTotal: product.price * quantity,
    }
  })
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0)

  const requested = text(body.reference, "reference", { max: 20 })
  let reference = /^CUBE-\d{6}$/.test(requested) ? requested : newReference()

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const rows = await sql`
      insert into orders (reference, customer, items, total)
      values (${reference}, ${JSON.stringify(customer)}::jsonb, ${JSON.stringify(items)}::jsonb, ${total})
      on conflict (reference) do nothing
      returning id
    `
    if (rows.length) return json({ ok: true, reference, total }, 201)
    reference = newReference()
  }

  throw new HttpError(500, "Porosia nuk u ruajt. Provo përsëri.")
})
