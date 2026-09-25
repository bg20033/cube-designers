import { requireAdmin } from "../_lib/auth.js"
import { db, submissionStatuses } from "../_lib/db.js"
import { handle, json, oneOf, positiveId, readJson, text } from "../_lib/http.js"

export const GET = handle(async (request) => {
  await requireAdmin(request)
  const sql = await db()
  const rows = await sql`
    select id, kind, name, email, company, message, details, status, notes, created_at
    from submissions
    order by created_at desc
    limit 1000
  `
  return json({ submissions: rows.map((row) => ({ ...row, id: Number(row.id) })) })
})

export const PATCH = handle(async (request) => {
  await requireAdmin(request)
  const body = await readJson(request)
  const id = positiveId(body.id)
  const status =
    body.status === undefined ? null : oneOf(body.status, submissionStatuses, "status")
  const notes = body.notes === undefined ? null : text(body.notes, "shënime", { max: 5000 })

  const sql = await db()
  const [row] = await sql`
    update submissions
    set status = coalesce(${status}, status), notes = coalesce(${notes}, notes)
    where id = ${id}
    returning id, status, notes
  `
  return row ? json({ ok: true }) : json({ error: "Nuk u gjet." }, 404)
})

export const DELETE = handle(async (request) => {
  await requireAdmin(request)
  const id = positiveId(new URL(request.url).searchParams.get("id"))
  const sql = await db()
  await sql`delete from submissions where id = ${id}`
  return json({ ok: true })
})
