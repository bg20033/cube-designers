import { db } from "./_lib/db.js"
import { limits, throttle } from "./_lib/throttle.js"
import { handle, HttpError, json, readJson, text } from "./_lib/http.js"
import { createOwnerSession, dashboard, ownerOrder, passwordInput, sessionCookie, sessionToken, tokenHash, verifyPassword } from "./_lib/invitations.js"

export const GET = handle(async (request) => {
  const { row, administrator } = await ownerOrder(request)
  return json(dashboard(row, administrator))
})

export const POST = handle(async (request) => {
  const body = await readJson(request, 2000)
  const reference = text(body.reference, "referenca e porosisë", { required: true, max: 30 }).toUpperCase()
  const password = passwordInput(body.password)
  // Checked before any scrypt work, also for unknown references.
  await throttle([limits.loginPerIp(request)])
  const sql = await db()
  const [row] = await sql`select id, password_hash from invitation_orders where reference = ${reference}`
  if (!row) {
    // Use the same password work for unknown references to avoid a timing oracle.
    verifyPassword(password, `scrypt$32768$8$3$${"0".repeat(32)}$${"0".repeat(64)}`)
    throw new HttpError(401, "Referenca ose fjalëkalimi është gabim.")
  }
  const [attempt] = await sql`
    insert into invitation_login_attempts (reference) values (${reference})
    on conflict (reference) do update set
      attempts = case when invitation_login_attempts.reset_at < now() then 1 else invitation_login_attempts.attempts + 1 end,
      reset_at = case when invitation_login_attempts.reset_at < now() then now() + interval '15 minutes' else invitation_login_attempts.reset_at end
    returning attempts, greatest(1, ceil(extract(epoch from invitation_login_attempts.reset_at - now())))::int as retry_after
  `
  if (Number(attempt.attempts) > 8) throw new HttpError(429, "Shumë tentativa. Provo përsëri pas 15 minutash.", { "retry-after": String(attempt.retry_after ?? 900) })
  if (!verifyPassword(password, row.password_hash)) throw new HttpError(401, "Referenca ose fjalëkalimi është gabim.")
  await sql`delete from invitation_login_attempts where reference = ${reference}`
  return json({ ok: true }, 200, { "set-cookie": await createOwnerSession(row.id) })
})

export const DELETE = handle(async (request) => {
  const token = sessionToken(request)
  if (token) {
    const sql = await db()
    await sql`delete from invitation_sessions where token_hash = ${tokenHash(token)}`
  }
  return json({ ok: true }, 200, { "set-cookie": sessionCookie("", true) })
})
