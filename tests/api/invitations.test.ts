// @vitest-environment node
import { PGlite } from "@electric-sql/pglite"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ sql: null as unknown as (...args: unknown[]) => Promise<unknown[]> }))
vi.mock("@neondatabase/serverless", () => ({ neon: () => state.sql }))

import { db } from "../../api/_lib/db"
import { createSessionCookie } from "../../api/_lib/auth"
import { POST as createOrder, GET as getDashboard, PATCH as saveDashboard } from "../../api/_handlers/invitations"
import { GET as getPublic, POST as respond } from "../../api/_handlers/invitation-public"
import { POST as login, DELETE as logout } from "../../api/_handlers/invitation-session"
import { GET as adminList, PATCH as adminSave, POST as provisionAccount } from "../../api/_handlers/admin/invitations"
import { POST as applyForInvitations } from "../../api/_handlers/submissions"
import { PATCH as reviewRequest } from "../../api/_handlers/admin/submissions"
import { POST as shopOrder } from "../../api/_handlers/orders"
import { GET as adminShopOrders } from "../../api/_handlers/admin/orders"
import { randomUUID } from "node:crypto"
import { createWeddingPlan } from "../../src/components/invitations/planning-model"

const pg = new PGlite()
const password = "a-private-test-password"
let adminCookie: string

function request(path: string, method = "GET", body?: unknown, cookie = "", token = "") {
  return new Request(`https://test.local/api/${path}`, {
    method, headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
function orderBody() {
  return { requestId: randomUUID(), customer: { name: "Test Organizer", email: "organizer@example.test", phone: "+38344123456" }, names: "Arbër & Hana", date: "2027-06-20", password }
}
async function create(body = orderBody()) {
  const response = await createOrder(request("invitations", "POST", body, adminCookie))
  expect(response.status).toBe(201)
  const data = await response.json()
  return { data, cookie: response.headers.get("set-cookie")!.split(";")[0], body }
}
async function activate(id: string) {
  return adminSave(request("admin/invitations", "PATCH", { id, status: "active", paymentStatus: "paid" }, adminCookie))
}
async function withGuests() {
  const { data, cookie } = await create()
  expect((await activate(data.order.id)).status).toBe(200)
  const current = await (await getDashboard(request("invitations", "GET", undefined, cookie))).json()
  const wedding = { ...current.wedding, guests: [
    { id: "family", token: "chosen-by-client", name: "Familja Gashi", kind: "family", capacity: 4, events: ["dasma"], message: "Ju presim!", responses: {} },
    { id: "other", token: "another-client-token", name: "Mysafiri privat", kind: "individual", capacity: 1, events: ["kanagjegji"], message: "Mesazh privat", responses: {} },
  ] }
  const saved = await saveDashboard(request("invitations", "PATCH", { wedding, revision: current.order.revision }, cookie))
  expect(saved.status).toBe(200)
  return { data: await saved.json(), cookie }
}

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", "postgres://local-test")
  vi.stubEnv("ADMIN_PASSWORD", "test-admin-password")
  vi.stubEnv("ADMIN_SESSION_SECRET", "test-admin-session-secret-at-least-32")
  state.sql = async (strings: unknown, ...values: unknown[]) => {
    const parts = strings as TemplateStringsArray
    const query = parts.reduce((sql, part, index) => sql + (index ? `$${index}` : "") + part, "")
    const result = await pg.query(query, values)
    return result.rows
  }
  await db()
  adminCookie = (await createSessionCookie()).split(";")[0]
}, 30000)
beforeEach(async () => { await pg.exec("TRUNCATE invitation_orders, orders, submissions RESTART IDENTITY CASCADE") })
afterAll(async () => { await pg.close(); vi.unstubAllEnvs() })

describe("invitation orders in PostgreSQL", () => {
  it("persists private plans, isolates other owners and omits planning data from public guest views", async () => {
    const { data, cookie } = await withGuests()
    const planning = createWeddingPlan()
    planning.contacts = [{ id: "private-contact", name: "Private studio", category: "photo", person: "", phone: "+38344123456", email: "private@example.test", website: "", city: "", status: "booked", eventIds: ["dasma"], notes: "PRIVATE OFFER" }]
    planning.budget.targetCents = 2500000
    planning.expenses[1].vendorId = "private-contact"
    planning.expenses[1].unitCents = 150000
    planning.tasks[0].done = true
    const response = await saveDashboard(request("invitations", "PATCH", { wedding: { ...data.wedding, planning }, revision: data.order.revision }, cookie))
    expect(response.status).toBe(200)
    const saved = await response.json()
    expect(saved.wedding.planning).toEqual(planning)
    const publicView = await (await getPublic(request("invitation-public", "GET", undefined, "", saved.wedding.guests[0].token))).json()
    expect(publicView).not.toHaveProperty("planning")
    expect(JSON.stringify(publicView)).not.toContain("PRIVATE OFFER")
    const other = await create()
    expect((await (await getDashboard(request("invitations", "GET", undefined, other.cookie))).json()).wedding).not.toHaveProperty("planning")
    await respond(request("invitation-public", "POST", { responses: { dasma: { status: "accepted", count: 2 } } }, "", saved.wedding.guests[0].token))
    const fresh = await (await getDashboard(request("invitations", "GET", undefined, cookie))).json()
    expect(fresh.wedding.planning).toEqual(planning)
    const legacy = { ...fresh.wedding }
    delete legacy.planning
    const legacySave = await saveDashboard(request("invitations", "PATCH", { wedding: legacy, revision: fresh.order.revision }, cookie))
    expect((await legacySave.json()).wedding.planning).toEqual(planning)
    const bad = await saveDashboard(request("invitations", "PATCH", { wedding: { ...fresh.wedding, planning: { ...planning, budget: { ...planning.budget, targetCents: -1 } } }, revision: fresh.order.revision }, cookie))
    expect(bad.status).toBe(400)
  })
  it("creates one pending order, retries safely, stores no plain password and requires payment activation", async () => {
    const { data, cookie, body } = await create()
    expect(data.order.status).toBe("pending")
    expect(data.order.payment_status).toBe("unpaid")
    expect(data).not.toHaveProperty("password_hash")
    const retry = await createOrder(request("invitations", "POST", body, adminCookie))
    expect(retry.status).toBe(200)
    expect((await retry.json()).order.id).toBe(data.order.id)
    expect((await pg.query<{ count: number }>("select count(*)::int as count from invitation_orders")).rows[0].count).toBe(1)
    const rows = await pg.query<{ password_hash: string; token_hash: string }>("select o.password_hash, s.token_hash from invitation_orders o join invitation_sessions s on o.id = s.order_id limit 1")
    expect(rows.rows[0].password_hash).not.toContain(password)
    expect(rows.rows[0].token_hash).not.toBe(cookie.split("=")[1])
    expect((await getDashboard(request("invitations"))).status).toBe(401)
    expect((await saveDashboard(request("invitations", "PATCH", { wedding: data.wedding, revision: 1 }, cookie))).status).toBe(403)
    expect((await adminSave(request("admin/invitations", "PATCH", { id: data.order.id, status: "active" }, adminCookie))).status).toBe(400)
    expect((await activate(data.order.id)).status).toBe(200)
    expect((await (await getDashboard(request("invitations", "GET", undefined, cookie))).json()).wedding.demoActivated).toBe(true)
  })

  it("only exposes the intended guest and saves replies from a second device without losing concurrent data", async () => {
    const { data, cookie } = await withGuests()
    const guest = data.wedding.guests[0]
    expect(guest.token).toMatch(/^[a-f0-9]{64}$/)
    expect(guest.token).not.toBe("chosen-by-client")
    const publicResponse = await getPublic(request("invitation-public", "GET", undefined, "", guest.token))
    const invitation = await publicResponse.json()
    expect(invitation.guest.name).toBe("Familja Gashi")
    expect(invitation.events.map((e: { id: string }) => e.id)).toEqual(["dasma"])
    expect(JSON.stringify(invitation)).not.toContain("Mysafiri privat")
    expect(invitation).not.toHaveProperty("order")
    expect((await respond(request("invitation-public", "POST", { responses: { dasma: { status: "accepted", count: 5 } } }, "", guest.token))).status).toBe(400)
    expect((await respond(request("invitation-public", "POST", { responses: { kanagjegji: { status: "accepted", count: 1 } } }, "", guest.token))).status).toBe(400)
    expect((await respond(request("invitation-public", "POST", { responses: { dasma: { status: "accepted", count: 3 } } }, "", guest.token))).status).toBe(200)
    const stale = await saveDashboard(request("invitations", "PATCH", { wedding: data.wedding, revision: data.order.revision }, cookie))
    // An RSVP no longer bumps the order revision: the couple's save still succeeds and keeps the reply.
    expect(stale.status).toBe(200)
    expect((await stale.json()).wedding.guests[0].responses.dasma.count).toBe(3)
    const fresh = await (await getDashboard(request("invitations", "GET", undefined, cookie))).json()
    expect(fresh.wedding.guests[0].responses.dasma.count).toBe(3)
    const changes = { ...fresh.wedding, names: "Emra të rinj" }
    const saved = await saveDashboard(request("invitations", "PATCH", { wedding: changes, revision: fresh.order.revision }, cookie))
    expect(saved.status).toBe(200)
    expect((await (await getPublic(request("invitation-public", "GET", undefined, "", guest.token))).json()).names).toBe("Emra të rinj")
  })

  it("revokes deleted guests, clamps seats, and never trusts organizer-submitted RSVP", async () => {
    const { data, cookie } = await withGuests()
    const token = data.wedding.guests[0].token
    await respond(request("invitation-public", "POST", { responses: { dasma: { status: "accepted", count: 4 } } }, "", token))
    const fresh = await (await getDashboard(request("invitations", "GET", undefined, cookie))).json()
    fresh.wedding.guests[0].capacity = 2
    fresh.wedding.guests[0].responses = { dasma: { status: "declined", count: 0 } }
    const saved = await (await saveDashboard(request("invitations", "PATCH", { wedding: fresh.wedding, revision: fresh.order.revision }, cookie))).json()
    expect(saved.wedding.guests[0].responses.dasma).toEqual({ status: "accepted", count: 2 })
    const removed = { ...saved.wedding, guests: saved.wedding.guests.slice(1) }
    expect((await saveDashboard(request("invitations", "PATCH", { wedding: removed, revision: saved.order.revision }, cookie))).status).toBe(200)
    expect((await getPublic(request("invitation-public", "GET", undefined, "", token))).status).toBe(404)
  })

  it("protects admin operations, isolates owners and supports login/logout across devices", async () => {
    const first = await create()
    const second = await create()
    expect((await adminList(request("admin/invitations"))).status).toBe(401)
    expect((await getDashboard(request(`invitations?order=${first.data.order.id}`, "GET", undefined, second.cookie))).status).toBe(401)
    expect((await (await adminList(request("admin/invitations", "GET", undefined, adminCookie))).json()).orders).toHaveLength(2)
    const signedIn = await login(request("invitation-session", "POST", { reference: first.data.order.reference, password }))
    expect(signedIn.status).toBe(200)
    const cookie = signedIn.headers.get("set-cookie")!.split(";")[0]
    expect((await (await getDashboard(request("invitations", "GET", undefined, cookie))).json()).order.id).toBe(first.data.order.id)
    expect((await logout(request("invitation-session", "DELETE", undefined, cookie))).status).toBe(200)
    expect((await getDashboard(request("invitations", "GET", undefined, cookie))).status).toBe(401)
    expect((await login(request("invitation-session", "POST", { reference: first.data.order.reference, password: "a-wrong-test-password" }))).status).toBe(401)
  })

  it("also persists shop orders in the same database and exposes them to authenticated admin", async () => {
    const response = await shopOrder(request("orders", "POST", { requestId: randomUUID(), customer: { name: "Shop customer", email: "", phone: "+38344123456", address: "Prishtinë" }, items: [{ productId: "forma-blue", variantId: "a2", quantity: 2, price: 1 }] }))
    expect(response.status).toBe(201)
    const result = await response.json()
    expect(result.total).toBe(30)
    const list = await adminShopOrders(request("admin/orders", "GET", undefined, adminCookie))
    expect((await list.json()).orders[0].reference).toBe(result.reference)
    expect((await adminShopOrders(request("admin/orders"))).status).toBe(401)
  })
})

describe("general wedding links", () => {
  async function withGeneralLink() {
    const { data, cookie } = await withGuests()
    const response = await saveDashboard(request("invitations", "PATCH", { revision: data.order.revision, wedding: { ...data.wedding, generalLink: { enabled: true, token: "a".repeat(64), events: ["dasma"], capacity: 6 } } }, cookie))
    expect(response.status).toBe(200)
    return { data: await response.json(), cookie }
  }
  it("exposes only selected events and lets separate families register without sharing personal tokens", async () => {
    const { data, cookie } = await withGeneralLink()
    const token = data.wedding.generalLink.token
    expect(token).toMatch(/^[a-f0-9]{64}$/)
    expect(token).not.toBe("a".repeat(64))
    const view = await (await getPublic(request("invitation-public?general=1", "GET", undefined, "", token))).json()
    expect(view.events.map((event: { id: string }) => event.id)).toEqual(["dasma"])
    expect(view.capacity).toBe(6)
    for (const key of ["guests", "generalLink", "planning", "customer", "password_hash"]) expect(view).not.toHaveProperty(key)
    expect(JSON.stringify(view)).not.toContain("Mysafiri privat")
    const body = { requestId: randomUUID(), name: "Familja e re", capacity: 3, responses: { dasma: { status: "accepted", count: 2 } } }
    const first = await respond(request("invitation-public?general=1", "POST", body, "", token))
    expect(first.status).toBe(201)
    const personal = (await first.json()).invitation
    expect(personal.guest.responses.dasma.count).toBe(2)
    expect(personal.guest.token).not.toBe(token)
    expect(personal).not.toHaveProperty("generalLink")
    const retry = await respond(request("invitation-public?general=1", "POST", body, "", token))
    expect(retry.status).toBe(200)
    expect((await retry.json()).invitation.guest.token).toBe(personal.guest.token)
    const second = await respond(request("invitation-public?general=1", "POST", { ...body, requestId: randomUUID(), name: "Familja tjetër" }, "", token))
    expect(second.status).toBe(201)
    expect((await second.json()).invitation.guest.token).not.toBe(personal.guest.token)
    const fresh = await (await getDashboard(request("invitations", "GET", undefined, cookie))).json()
    expect(fresh.wedding.guests).toHaveLength(4)
    expect((await getPublic(request("invitation-public", "GET", undefined, "", token))).status).toBe(404)
    const publicPersonal = await (await getPublic(request("invitation-public", "GET", undefined, "", personal.guest.token))).json()
    expect(publicPersonal.guest.name).toBe("Familja e re")
    expect(JSON.stringify(publicPersonal)).not.toContain("Familja tjetër")
  })
  it("enforces capacity, assigned events, activation and revocation", async () => {
    const { data, cookie } = await withGeneralLink()
    const token = data.wedding.generalLink.token
    const body = { requestId: randomUUID(), name: "Test", capacity: 7, responses: { dasma: { status: "accepted", count: 7 } } }
    expect((await respond(request("invitation-public?general=1", "POST", body, "", token))).status).toBe(400)
    expect((await respond(request("invitation-public?general=1", "POST", { ...body, capacity: 1, responses: { kanagjegji: { status: "accepted", count: 1 } } }, "", token))).status).toBe(400)
    const saved = await saveDashboard(request("invitations", "PATCH", { revision: data.order.revision, wedding: { ...data.wedding, generalLink: { ...data.wedding.generalLink, enabled: false } } }, cookie))
    expect(saved.status).toBe(200)
    expect((await getPublic(request("invitation-public?general=1", "GET", undefined, "", token))).status).toBe(404)
    expect((await respond(request("invitation-public?general=1", "POST", { ...body, capacity: 1, responses: { dasma: { status: "accepted", count: 1 } } }, "", token))).status).toBe(404)
    const disabled = await saved.json()
    const enabled = await saveDashboard(request("invitations", "PATCH", { revision: disabled.order.revision, wedding: { ...disabled.wedding, generalLink: { ...disabled.wedding.generalLink, enabled: true } } }, cookie))
    expect(enabled.status).toBe(200)
    await adminSave(request("admin/invitations", "PATCH", { id: data.order.id, status: "suspended", paymentStatus: "paid" }, adminCookie))
    expect((await getPublic(request("invitation-public?general=1", "GET", undefined, "", token))).status).toBe(404)
  })
})


describe("admin-controlled invitation accounts", () => {
  async function application() {
    const result = await applyForInvitations(request("submissions", "POST", { kind: "project", name: "Arbër Gashi", email: "arber@example.test", services: ["Ftesa online"], message: "Dua ftesa online." }))
    expect(result.status).toBe(201)
    return (await result.json()).id as number
  }
  const provision = (submissionId: number, changes = {}, cookie = adminCookie) => provisionAccount(request("admin/invitations", "POST", { submissionId, names: "Arbër & Hana", date: "2027-06-20", ...changes }, cookie))
  it("requires admin access for account creation and credential resets", async () => {
    expect((await createOrder(request("invitations", "POST", orderBody()))).status).toBe(401)
    const id = await application()
    expect((await provision(id, {}, "")).status).toBe(401)
    expect((await adminSave(request("admin/invitations", "PATCH", { id: randomUUID(), resetPassword: true }))).status).toBe(401)
  })
  it("creates one account per approved request, links the request and reveals credentials only on creation", async () => {
    const id = await application()
    const response = await provision(id)
    expect(response.status).toBe(201)
    expect(response.headers.get("set-cookie")).toBeNull()
    expect(response.headers.get("cache-control")).toBe("no-store")
    const access = await response.json()
    expect(access.password).toHaveLength(24)
    expect(access.email).toBe("arber@example.test")
    expect((await provision(id)).status).toBe(409)
    const list = await (await adminList(request("admin/invitations", "GET", undefined, adminCookie))).json()
    expect(list.orders).toHaveLength(1)
    expect(list.orders[0]).toMatchObject({ id: access.id, status: "pending", payment_status: "unpaid" })
    expect(list.requests).toEqual([expect.objectContaining({ id, status: "done", account_id: access.id })])
    expect(JSON.stringify(list)).not.toContain(access.password)
    expect(JSON.stringify(list)).not.toContain("password_hash")
    const signIn = await login(request("invitation-session", "POST", { reference: access.reference, password: access.password }))
    expect(signIn.status).toBe(200)
    const cookie = signIn.headers.get("set-cookie")!.split(";")[0]
    const dashboard = await (await getDashboard(request("invitations", "GET", undefined, cookie))).json()
    expect(dashboard.wedding.names).toBe("Arbër & Hana")
    expect((await saveDashboard(request("invitations", "PATCH", { wedding: dashboard.wedding, revision: dashboard.order.revision }, cookie))).status).toBe(403)
  })
  it("refuses rejected or unrelated requests, and allows a rejected request to be reopened", async () => {
    const id = await application()
    expect((await reviewRequest(request("admin/submissions", "PATCH", { id, status: "archived" }, adminCookie))).status).toBe(200)
    expect((await provision(id)).status).toBe(409)
    await reviewRequest(request("admin/submissions", "PATCH", { id, status: "new" }, adminCookie))
    expect((await provision(id, { activate: true })).status).toBe(201)
    const other = await applyForInvitations(request("submissions", "POST", { kind: "project", name: "Other", email: "other@example.test", services: ["Print"], message: "Print request" }))
    expect((await provision((await other.json()).id)).status).toBe(409)
  })
  it("can reset credentials, revoke existing sessions and retain account data", async () => {
    const access = await (await provision(await application(), { activate: true })).json()
    const signedIn = await login(request("invitation-session", "POST", { reference: access.reference, password: access.password }))
    const cookie = signedIn.headers.get("set-cookie")!.split(";")[0]
    const response = await adminSave(request("admin/invitations", "PATCH", { id: access.id, resetPassword: true }, adminCookie))
    expect(response.status).toBe(200)
    const next = await response.json()
    expect(next.password).not.toBe(access.password)
    expect((await getDashboard(request("invitations", "GET", undefined, cookie))).status).toBe(401)
    expect((await login(request("invitation-session", "POST", { reference: access.reference, password: access.password }))).status).toBe(401)
    expect((await login(request("invitation-session", "POST", { reference: next.reference, password: next.password }))).status).toBe(200)
    const list = await (await adminList(request("admin/invitations", "GET", undefined, adminCookie))).json()
    expect(list.orders[0]).toMatchObject({ id: access.id, status: "active", payment_status: "paid" })
  })
})
