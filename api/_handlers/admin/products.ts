import { products as staticProducts } from "../../../src/data/products.js"
import { requireAdmin } from "../../_lib/auth.js"
import { db, listProducts } from "../../_lib/db.js"
import { handle, HttpError, json, readJson, text } from "../../_lib/http.js"
import { parseProduct } from "../../_lib/products.js"

export const GET = handle(async (request) => {
  await requireAdmin(request)
  const sql = await db()
  return json({ products: await listProducts(sql) })
})

// Create or update one product. `previousId` lets the admin rename a slug.
export const POST = handle(async (request) => {
  await requireAdmin(request)
  const sql = await db()

  const action = new URL(request.url).searchParams.get("action")
  // The collection has thousands of products: rows go in batches.
  const batches = staticProducts
    .map((product, index) => ({ id: product.id, data: product, ord: index }))
    .reduce<{ id: string; data: unknown; ord: number }[][]>(
      (all, row, index) => {
        if (index % 250 === 0) all.push([])
        all[all.length - 1].push(row)
        return all
      },
      [],
    )

  if (action === "import") {
    for (const rows of batches)
      await sql`
        insert into products (id, data, active, sort_order)
        select id, data, true, ord
        from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
          as row(id text, data jsonb, ord int)
        on conflict (id) do nothing
      `
    return json({ products: await listProducts(sql) })
  }

  // Brings sizes, finishes, prices and categories of collection products
  // already in the database up to date with the code, keeping names, texts
  // and images edited in the dashboard. A product with no image, or still on
  // an old portfolio mockup (a manifest key, not a URL), gets the code's.
  if (action === "sync-options") {
    for (const rows of batches)
      await sql`
        update products
        set data = products.data || jsonb_strip_nulls(jsonb_build_object(
              'variants', row.data -> 'variants',
              'variantLabel', row.data -> 'variantLabel',
              'defaultVariantId', row.data -> 'defaultVariantId',
              'price', row.data -> 'price',
              'quantityLabel', row.data -> 'quantityLabel',
              'includes', row.data -> 'includes',
              'includeVariants', row.data -> 'includeVariants',
              'customImage', row.data -> 'customImage',
              'category', row.data -> 'category',
              'video', row.data -> 'video',
              'image', case
                when products.data ->> 'image' ~ '^(/|https?://)' then null
                else row.data -> 'image'
              end
            )),
            updated_at = now()
        from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
          as row(id text, data jsonb)
        where products.id = row.id
      `
    return json({ products: await listProducts(sql) })
  }

  const body = await readJson(request)
  const product = parseProduct(body.product)
  const active = body.active !== false
  const sortOrder = Number.isInteger(body.sortOrder)
    ? Number(body.sortOrder)
    : 0
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
