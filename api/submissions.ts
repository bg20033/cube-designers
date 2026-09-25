import { db } from "./_lib/db.js"
import { email, handle, json, oneOf, readJson, text } from "./_lib/http.js"

// Public endpoint for the contact form and the start-project brief.
export const POST = handle(async (request) => {
  const body = await readJson(request)

  // Honeypot: bots fill every field, people never see this one.
  if (text(body.website, "website")) return json({ ok: true })

  const kind = oneOf(body.kind, ["contact", "project"] as const, "kind")
  const name = text(body.name, "emri", { max: 160, required: true })
  const address = email(body.email)
  const company = text(body.company, "kompania", { max: 160 })
  const message = text(body.message, "mesazhi", { max: 5000, required: true })

  const details =
    kind === "project"
      ? {
          services: Array.isArray(body.services)
            ? body.services
                .slice(0, 12)
                .map((service) => text(service, "shërbimi", { max: 60 }))
                .filter(Boolean)
            : [],
          budget: text(body.budget, "buxheti", { max: 60 }),
          timeline: text(body.timeline, "afati", { max: 60 }),
          success: text(body.success, "suksesi", { max: 2000 }),
        }
      : {}

  const sql = await db()
  const [row] = await sql`
    insert into submissions (kind, name, email, company, message, details)
    values (${kind}, ${name}, ${address}, ${company}, ${message}, ${JSON.stringify(details)}::jsonb)
    returning id
  `

  return json({ ok: true, id: Number(row.id) }, 201)
})
