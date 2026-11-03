// @vitest-environment node
// Endpoint contract and privacy checks against an in-memory PostgreSQL (PGlite).
import { PGlite } from "@electric-sql/pglite"
import { randomUUID } from "node:crypto"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ sql: null as unknown as (...args: unknown[]) => Promise<unknown[]> }))
vi.mock("@neondatabase/serverless", () => ({ neon: () => state.sql }))

import { db } from "./db.js"
import { createSessionCookie } from "./auth.js"
import { tokenHash } from "./invitations.js"
import { POST as createOrder, GET as getDashboard, PATCH as saveDashboard } from "../_handlers/invitations.js"
import { GET as getPublic, POST as respond } from "../_handlers/invitation-public.js"
import { POST as login } from "../_handlers/invitation-session.js"
import { PATCH as adminSave } from "../_handlers/admin/invitations.js"
import { MAX_EVENTS, type WeddingEvent } from "../../src/components/invitations/model.js"
import { createWeddingPlan } from "../../src/components/invitations/planning-model.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- response bodies are asserted field by field
type Json = any
const pg = new PGlite()
const password = "a-private-test-password"
let adminCookie = ""

function request(path: string, method = "GET", body?: unknown, cookie = "", token = "", ip = "") {
  return new Request(`https://test.local/api/${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...(ip ? { "cf-connecting-ip": ip } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
const eightEvents: WeddingEvent[] = Array.from({ length: MAX_EVENTS }, (_, i) => ({
  id: `event-${i}`, name: `Eventi ${i + 1}`, date: `2027-06-${String(10 + i).padStart(2, "0")}`, time: "19:00",
  venue: `Salla ${i}`, address: "Prishtinë", ...(i % 2 ? { mapUrl: ` https://maps.google.com/?q=${i} ` } : {}),
}))

async function activeWedding() {
  const created = await createOrder(request("invitations", "POST", { requestId: randomUUID(), customer: { name: "Organizer", email: "o@example.test", phone: "+38344123456" }, names: "Arbër & Hana", date: "2027-06-20", password }, adminCookie))
  expect(created.status).toBe(201)
  const data = await created.json() as Json
  const cookie = created.headers.get("set-cookie")!.split(";")[0]
  expect((await adminSave(request("admin/invitations", "PATCH", { id: data.order.id, status: "active", paymentStatus: "paid" }, adminCookie))).status).toBe(200)
  const current = await (await getDashboard(request("invitations", "GET", undefined, cookie))).json() as Json
  const planning = createWeddingPlan("event-0")
  planning.contacts = [{ id: "c1", name: "Studio privat", category: "photo", person: "", phone: "+38344000000", email: "studio@example.test", website: "", city: "", status: "booked", eventIds: ["event-0"], notes: "PRIVATE NOTE" }]
  const wedding = {
    ...current.wedding, events: eightEvents, planning,
    guests: [
      { id: "g1", token: "x", name: "Familja Gashi", kind: "family", capacity: 4, events: eightEvents.map((e) => e.id), message: "Mirë se vini", responses: {} },
      { id: "g2", token: "y", name: "Mysafiri Sekret", kind: "individual", capacity: 1, events: ["event-0"], message: "Mesazh sekret", responses: {} },
    ],
    generalLink: { enabled: true, token: "0".repeat(64), events: ["event-1", "event-2"], capacity: 5 },
  }
  const saved = await saveDashboard(request("invitations", "PATCH", { wedding, revision: current.order.revision }, cookie))
  expect(saved.status).toBe(200)
  return { cookie, data: await saved.json() as Json }
}

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", "postgres://local-test")
  vi.stubEnv("ADMIN_PASSWORD", "test-admin-password")
  vi.stubEnv("ADMIN_SESSION_SECRET", "test-admin-session-secret-at-least-32")
  state.sql = async (strings: unknown, ...values: unknown[]) => {
    const parts = strings as TemplateStringsArray
    const query = parts.reduce((sql, part, index) => sql + (index ? `$${index}` : "") + part, "")
    return (await pg.query(query, values)).rows
  }
  await db()
  adminCookie = (await createSessionCookie()).split(";")[0]
}, 30000)
beforeEach(async () => { await pg.exec("TRUNCATE invitation_orders, invitation_rate_limits RESTART IDENTITY CASCADE") })
afterAll(async () => { await pg.close(); vi.unstubAllEnvs() })

describe("events", () => {
  it("round-trips up to 8 events with optional trimmed mapUrl through save, guest and general views", async () => {
    const { data } = await activeWedding()
    expect(data.wedding.events).toHaveLength(MAX_EVENTS)
    expect(data.wedding.events[1].mapUrl).toBe("https://maps.google.com/?q=1")
    expect(data.wedding.events[0]).not.toHaveProperty("mapUrl")
    const guest = data.wedding.guests.find((g: { id: string }) => g.id === "g1")
    const personal = await (await getPublic(request("invitation-public", "GET", undefined, "", guest.token))).json() as Json
    expect(personal.events).toEqual(data.wedding.events)
    const general = await (await getPublic(request("invitation-public?general=1", "GET", undefined, "", data.wedding.generalLink.token))).json() as Json
    expect(general.events.map((e: WeddingEvent) => e.mapUrl)).toEqual(["https://maps.google.com/?q=1", undefined])
  })

  it("rejects a ninth event, unsafe map links and impossible dates", async () => {
    const { cookie, data } = await activeWedding()
    const save = (events: unknown[]) => saveDashboard(request("invitations", "PATCH", { wedding: { ...data.wedding, events }, revision: data.order.revision }, cookie))
    expect((await save([...eightEvents, { ...eightEvents[0], id: "event-9" }])).status).toBe(400)
    expect((await save(eightEvents.map((e, i) => i ? e : { ...e, mapUrl: "javascript:alert(1)" }))).status).toBe(400)
    expect((await save(eightEvents.map((e, i) => i ? e : { ...e, date: "2027-02-31" }))).status).toBe(400)
  })
})

describe("guest privacy and RSVP contract", () => {
  it("returns the updated personal invitation from RSVP without any private data", async () => {
    const { cookie, data } = await activeWedding()
    const guest = data.wedding.guests.find((g: { id: string }) => g.id === "g1")
    const responses = Object.fromEntries(eightEvents.map((e, i) => [e.id, i ? { status: "accepted", count: 3 } : { status: "declined", count: 0 }]))
    const response = await respond(request("invitation-public", "POST", { responses }, "", guest.token))
    expect(response.status).toBe(200)
    const body = await response.json() as Json
    expect(body.ok).toBe(true)
    expect(body.responses).toEqual(responses)
    expect(body.invitation.guest).toEqual({ ...guest, responses })
    expect(body.invitation.events).toHaveLength(MAX_EVENTS)
    const reread = await (await getPublic(request("invitation-public", "GET", undefined, "", guest.token))).json() as Json
    expect(reread).toEqual(body.invitation)
    for (const view of [body, reread]) {
      const serialized = JSON.stringify(view)
      for (const secret of ["Mysafiri Sekret", "Mesazh sekret", "PRIVATE NOTE", "Studio privat", data.wedding.generalLink.token, data.order.reference, "o@example.test"]) expect(serialized).not.toContain(secret)
      expect(view).not.toHaveProperty("planning")
      expect(view).not.toHaveProperty("generalLink")
      expect(view).not.toHaveProperty("guests")
    }
    const dashboard = await (await getDashboard(request("invitations", "GET", undefined, cookie))).json() as Json
    expect(dashboard.wedding.guests.find((g: { id: string }) => g.id === "g1").responses).toEqual(responses)
  })

  it("registers through the general link idempotently and returns only the new personal invitation", async () => {
    const { data } = await activeWedding()
    const token = data.wedding.generalLink.token
    const body = { requestId: randomUUID(), name: "Familja e re", capacity: 3, responses: { "event-1": { status: "accepted", count: 3 }, "event-2": { status: "declined", count: 0 } } }
    const first = await respond(request("invitation-public?general=1", "POST", body, "", token))
    expect(first.status).toBe(201)
    const { invitation } = await first.json() as Json
    expect(invitation.guest.token).toMatch(/^[a-f0-9]{64}$/)
    expect(invitation.guest.responses).toEqual(body.responses)
    expect(invitation.events.map((e: WeddingEvent) => e.id)).toEqual(["event-1", "event-2"])
    const serialized = JSON.stringify(invitation)
    for (const secret of [token, "Mysafiri Sekret", "Familja Gashi", "PRIVATE NOTE"]) expect(serialized).not.toContain(secret)
    const retry = await respond(request("invitation-public?general=1", "POST", body, "", token))
    expect(retry.status).toBe(200)
    expect((await retry.json() as Json).invitation).toEqual(invitation)
    expect((await respond(request("invitation-public?general=1", "POST", { ...body, requestId: randomUUID(), website: "spam" }, "", token))).status).toBe(400)
  })

  it("answers malformed and unknown guest tokens with the same 404", async () => {
    for (const token of ["", "short", "A".repeat(64), "f".repeat(64)]) {
      const response = await getPublic(request("invitation-public", "GET", undefined, "", token))
      expect(response.status).toBe(404)
      expect(await response.json() as Json).toEqual({ error: "Kjo ftesë nuk është e disponueshme." })
    }
  })
})

describe("concurrent edits", () => {
  it("keeps a guest reply that lands while the couple edits, and rotates the general link on request", async () => {
    const { cookie, data } = await activeWedding()
    const guest = data.wedding.guests.find((g: { id: string }) => g.id === "g2")
    expect((await respond(request("invitation-public", "POST", { responses: { "event-0": { status: "accepted", count: 1 } } }, "", guest.token))).status).toBe(200)
    const oldToken = data.wedding.generalLink.token
    const edited = { ...data.wedding, names: "Emra të rinj", generalLink: { ...data.wedding.generalLink, rotate: true } }
    const saved = await saveDashboard(request("invitations", "PATCH", { wedding: edited, revision: data.order.revision }, cookie))
    expect(saved.status).toBe(200)
    const after = await saved.json() as Json
    expect(after.wedding.guests.find((g: { id: string }) => g.id === "g2").responses).toEqual({ "event-0": { status: "accepted", count: 1 } })
    expect(after.wedding.generalLink.token).toMatch(/^[a-f0-9]{64}$/)
    expect(after.wedding.generalLink.token).not.toBe(oldToken)
    expect(after.wedding.generalLink).not.toHaveProperty("rotate")
    expect((await getPublic(request("invitation-public?general=1", "GET", undefined, "", oldToken))).status).toBe(404)
    expect((await getPublic(request("invitation-public?general=1", "GET", undefined, "", after.wedding.generalLink.token))).status).toBe(200)
    expect((await saveDashboard(request("invitations", "PATCH", { wedding: { ...after.wedding, generalLink: { ...after.wedding.generalLink, rotate: "yes" } }, revision: after.order.revision }, cookie))).status).toBe(400)
  })
})

describe("owner login", () => {
  it("locks a reference after repeated failures and tells the client when to retry", async () => {
    const { data } = await activeWedding()
    const attempt = (secret: string) => login(request("invitation-session", "POST", { reference: data.order.reference.toLowerCase(), password: secret }))
    for (let i = 0; i < 8; i++) expect((await attempt("a-wrong-password-123")).status).toBe(401)
    const locked = await attempt(password)
    expect(locked.status).toBe(429)
    expect(Number(locked.headers.get("retry-after"))).toBeGreaterThan(0)
    expect(Number(locked.headers.get("retry-after"))).toBeLessThanOrEqual(900)
    expect(locked.headers.get("set-cookie")).toBeNull()
  }, 30000)
})

describe("rate limits", () => {
  const exhaust = (scope: string, subject: string, attempts: number) =>
    pg.query("insert into invitation_rate_limits (key, attempts, reset_at) values ($1, $2, now() + interval '1 hour')", [`${scope}:${tokenHash(subject)}`, attempts])

  it("throttles general registrations per device but never counts idempotent retries", async () => {
    vi.stubEnv("VERCEL", "")
    const { data } = await activeWedding()
    const token = data.wedding.generalLink.token
    const register = (requestId: string) => respond(request("invitation-public?general=1", "POST", { requestId, name: "Familja", capacity: 1, responses: { "event-1": { status: "accepted", count: 1 }, "event-2": { status: "accepted", count: 1 } } }, "", token, "203.0.113.7"))
    const first = randomUUID()
    expect((await register(first)).status).toBe(201)
    for (let i = 0; i < 9; i++) expect((await register(randomUUID())).status).toBe(201)
    const blocked = await register(randomUUID())
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("retry-after")).toBe("600")
    expect(await blocked.json()).toEqual({ error: "Shumë kërkesa. Provo përsëri pak më vonë." })
    expect((await register(first)).status).toBe(200)
    const keys = (await pg.query<{ key: string }>("select key from invitation_rate_limits")).rows.map((row) => row.key).join(" ")
    expect(keys).not.toContain(token)
    expect(keys).not.toContain("203.0.113.7")
  })

  it("throttles RSVP per guest, logins and new orders per IP before doing any work", async () => {
    vi.stubEnv("VERCEL", "")
    const { data } = await activeWedding()
    const guest = data.wedding.guests.find((g: { id: string }) => g.id === "g2")
    await exhaust("rsvp", guest.token, 30)
    expect((await respond(request("invitation-public", "POST", { responses: { "event-0": { status: "accepted", count: 1 } } }, "", guest.token))).status).toBe(429)
    await exhaust("login-ip", "198.51.100.4", 30)
    const blocked = await login(request("invitation-session", "POST", { reference: "FTE-UNKNOWN", password }, adminCookie, "", "198.51.100.4"))
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("retry-after")).toBe("900")
    expect((await login(request("invitation-session", "POST", { reference: data.order.reference, password }, "", "", "198.51.100.5"))).status).toBe(200)
    await exhaust("order-ip", "198.51.100.4", 10)
    const order = await createOrder(request("invitations", "POST", { requestId: randomUUID(), customer: { name: "Spam", email: "s@example.test", phone: "+38344123456" }, names: "A & B", date: "2027-06-20", password }, adminCookie, "", "198.51.100.4"))
    expect(order.status).toBe(429)
    expect((await pg.query<{ count: number }>("select count(*)::int as count from invitation_orders")).rows[0].count).toBe(1)
  })
})
