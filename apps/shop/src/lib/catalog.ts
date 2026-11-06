import { products } from '@/data/products'
import { db, listProducts } from '../../../../api/_lib/db'

// Read current products for direct URLs too, including newly created products.
// No DB is the supported static-catalog mode; a configured DB failure stays visible.
export async function getCatalog() {
  if (!process.env.DATABASE_URL) return products
  const stored = await listProducts(await db())
  return stored.length ? stored.filter((item) => item.active).map((item) => item.product) : products
}
