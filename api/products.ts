import { db, listProducts } from "./_lib/db.js"
import { handle, HttpError, json } from "./_lib/http.js"

// Public catalog. An empty list tells the shop to keep its static catalog.
export const GET = handle(async () => {
  try {
    const sql = await db()
    const stored = await listProducts(sql, { activeOnly: true })
    return json(
      { products: stored.map((item) => item.product) },
      200,
      { "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
    )
  } catch (error) {
    if (error instanceof HttpError && error.status === 503) {
      return json({ products: [] })
    }
    throw error
  }
})
