import { db, listProducts } from "./_lib/db.js"
import { handle, HttpError, json } from "./_lib/http.js"

// Public catalog. An empty list tells the shop to keep its static catalog.
export const GET = handle(async () => {
  try {
    const sql = await db()
    const stored = await listProducts(sql)
    // Most products share one of a few variant lists; each list is sent
    // once and products point to it, which keeps the response small.
    const variantSets: unknown[] = []
    const index = new Map<string, number>()
    const products = stored
      .filter((item) => item.active)
      .map(({ product }) => {
        if (!product.variants) return product
        const key = JSON.stringify(product.variants)
        if (!index.has(key)) {
          index.set(key, variantSets.length)
          variantSets.push(product.variants)
        }
        const { variants: _, ...rest } = product
        return { ...rest, variantSet: index.get(key) }
      })
    return json({ products, variantSets, managed: stored.length > 0 }, 200, {
      "cache-control":
        "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    })
  } catch (error) {
    if (error instanceof HttpError && error.status === 503) {
      return json({ products: [], managed: false })
    }
    throw error
  }
})
