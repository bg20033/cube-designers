// Test server only: run the production SQL against an ephemeral PostgreSQL
// engine. This module is never imported by the application or deployments.
import { PGlite } from "@electric-sql/pglite"
const pg = new PGlite()
export function neon() {
  return async (parts: TemplateStringsArray, ...values: unknown[]) => {
    const query = parts.reduce((sql, part, index) => sql + (index ? `$${index}` : "") + part, "")
    return (await pg.query(query, values)).rows
  }
}
