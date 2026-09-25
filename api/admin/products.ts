import { products as staticProducts } from "../../src/data/products.js"
import { requireAdmin } from "../_lib/auth.js"
import { db, listProducts } from "../_lib/db.js"
import { handle, HttpError, json, readJson, text } from "../_lib/http.js"
import { parseProduct } from "../_lib/products.js"

export const GET = handle(async (request) => {
  await requireAdmin(request)
  const sql = await db()
  return json({ products: await listProducts(sql) })
})

// Create or update one product. `previousId` lets the admin rename a slug.
export const POST = handle(async (request) => {
  await requireAdmin(request)
  const sql = await db()

  if (new URL(request.url).searchParams.get("action") === "import") {
    for (const [index, product] of staticProducts.entries()) {
      await sql`
        insert into products (id, data, active, sort_order)
        values (${product.id}, ${JSON.stringify(product)}::jsonb, true, ${index})
        on conflict (id) do nothing
      `
    }
    return json({ products: await listProducts(sql) })
  }

  const body = await readJson(request)
  const product = parseProduct(body.product)
  const active = body.active !== false
  const sortOrder = Number.isInteger(body.sortOrder) ? Number(body.sortOrder) : 0
  const previousId = text(body.previousId, "previousId", { max: 60 })

  if (previousId && previousId !== product.id) {
    const [taken] = await sql`select 1 from products where id = ${product.id}`
    if (taken) throw new HttpError(409, "Ky slug ekziston tashmë.")
    await sql`delete from products where id = ${previousId}`
  }

  await sql`
    insert into products (id, data, active, sort_order, updated_at)
    values (${product.id}, ${JSON.stringify(product)}::jsonb, ${active}, ${sortOrder}, now())
    on conflict (id) do update
    set data = excluded.data, active = excluded.active,
        sort_order = excluded.sort_order, updated_at = now()
  `
  return json({ products: await listProducts(sql) })
})

export const DELETE = handle(async (request) => {
  await requireAdmin(request)
  const id = text(new URL(request.url).searchParams.get("id"), "id", {
    max: 60,
    required: true,
  })
  const sql = await db()
  await sql`delete from products where id = ${id}`
  return json({ products: await listProducts(sql) })
})
