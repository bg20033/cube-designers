import { db } from "../_lib/db.js"
import { json } from "../_lib/http.js"

// Probe the actual database without exposing credentials or server errors.
export async function GET() {
  try {
    const sql = await db()
    await sql`select 1`
    return json({ ordersAvailable: true })
  } catch {
    return json({ ordersAvailable: false })
  }
}
