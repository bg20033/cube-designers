// @vitest-environment node
// Data-access layer checks against an in-memory PostgreSQL (PGlite): bootstrap,
// index usage, and the atomic RSVP / registration / owner-save statements.
// PGlite has a single connection, so true interleaving (row locks plus
// EvalPlanQual re-checks) is verified on a real Postgres instead; see
// docs/ftesa-database.md, "Local verification".
import { PGlite } from "@electric-sql/pglite"
import { randomUUID } from "node:crypto"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ sql: null as unknown as (...args: unknown[]) => Promise<unknown[]> }))
vi.mock("@neondatabase/serverless", () => ({ neon: () => state.sql }))

import { db } from "./db.js"
import {
  appendGeneralGuest, createOwnerSession, parseResponses, prepareWedding, publicOrder, rateLimit,
  recordGuestResponses, updateWedding, type InvitationRow,
} from "./invitations.js"
import type { Guest, Wedding } from "../../src/components/invitations/model.js"

const pg = new PGlite()
const link = { enabled: true, token: "c".repeat(64), events: ["dasma"], capacity: 6 }
const guest = (id: string, token: string, capacity: number, events: string[], responses: Guest["responses"] = {}): Guest =>
  ({ id, token, name: `Guest ${id}`, kind: "family", capacity, events, message: "", responses })

async function seed(): Promise<InvitationRow> {
  const id = randomUUID()
  const document: Wedding = {
    version: 1, names: "A & B", message: "m", design: "lilac", demoActivated: false,
    events: [
      { id: "nata", name: "Nata", date: "2027-06-19", time: "20:00", venue: "", address: "" },
      { id: "dasma", name: "Dasma", date: "2027-06-20", time: "18:00", venue: "", address: "" },
    ],
    guests: [guest("g1", "a".repeat(64), 4, ["nata", "dasma"]), guest("g2", "b".repeat(64), 2, ["dasma"])],
    generalLink: link,
  }
  await pg.query(
    `insert into invitation_orders (id, reference, customer, password_hash, document, status, payment_status, request_key, request_hash)
     values ($1, $2, '{}', 'x', $3, 'active', 'paid', $4, 'h')`,
    [id, `FTE-${id.slice(0, 8).toUpperCase()}`, JSON.stringify(document), randomUUID()],
  )
  return load(id)
}
async function load(id: string) {
  return (await pg.query<InvitationRow>("select * from invitation_orders where id = $1", [id])).rows[0]
}

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", "postgres://local-test")
  state.sql = async (strings: unknown, ...values: unknown[]) => {
    const parts = strings as TemplateStringsArray
    return (await pg.query(parts.reduce((sql, part, i) => sql + (i ? `$${i}` : "") + part, ""), values)).rows
  }
  await db()
}, 30000)
beforeEach(async () => { await pg.exec("truncate invitation_orders, invitation_rate_limits cascade") })
afterAll(async () => { await pg.close(); vi.unstubAllEnvs() })

describe("schema bootstrap", () => {
  it("records the schema version and is a no-op when re-run", async () => {
    expect((await pg.query("select version from app_schema")).rows).toEqual([{ version: 3 }])
    const bootstrap = (await import("node:fs")).readFileSync(new URL("./db.ts", import.meta.url), "utf8").match(/(do \$bootstrap\$[\s\S]*?\$bootstrap\$)/)![1]
    await pg.exec(bootstrap)
    await pg.exec(bootstrap)
    const indexes = (await pg.query<{ indexname: string }>("select indexname from pg_indexes where tablename like 'invitation%'")).rows.map((r) => r.indexname)
    expect(indexes).toEqual(expect.arrayContaining(["invitation_guest_token_values_idx", "invitation_general_tokens_idx", "invitation_session_order_idx", "invitation_rate_limits_reset_idx"]))
    expect(indexes).not.toContain("invitation_guest_tokens_idx")
  })

  it("serves guest-token lookups from the token GIN index (query shape must match the index expression)", async () => {
    await seed()
    const plan = (await pg.query<{ "QUERY PLAN": string }>(
      `explain select * from invitation_orders where status = 'active' and payment_status = 'paid' and invitation_guest_tokens(document) @> $1::jsonb`,
      [JSON.stringify(["a".repeat(64)])],
    )).rows.map((r) => r["QUERY PLAN"]).join("\n")
    expect(plan).toContain("invitation_guest_token_values_idx")
    const found = await publicOrder("a".repeat(64))
    expect(found.guest.id).toBe("g1")
    expect(found.guestIndex).toBe(0)
  })
})

describe("RSVP writes", () => {
  it("rewrites only that guest's responses and leaves revision alone", async () => {
    const row = await seed()
    expect(await recordGuestResponses(row.id, row.document.guests[1], { dasma: { status: "accepted", count: 2 } })).toBe(true)
    expect(await recordGuestResponses(row.id, row.document.guests[0], { nata: { status: "declined", count: 0 }, dasma: { status: "accepted", count: 3 } })).toBe(true)
    const after = await load(row.id)
    expect(Number(after.revision)).toBe(Number(row.revision))
    expect(after.document.guests.map((g) => g.responses)).toEqual([
      { nata: { status: "declined", count: 0 }, dasma: { status: "accepted", count: 3 } },
      { dasma: { status: "accepted", count: 2 } },
    ])
    expect(after.document.guests[0].name).toBe("Guest g1")
  })

  it("refuses to write when the guest changed, vanished, or the order was deactivated since it was read", async () => {
    const row = await seed()
    const g1 = row.document.guests[0]
    expect(await recordGuestResponses(row.id, { ...g1, capacity: 5 }, {})).toBe(false)
    expect(await recordGuestResponses(row.id, { ...g1, events: ["dasma"] }, {})).toBe(false)
    expect(await recordGuestResponses(row.id, { ...g1, token: "f".repeat(64) }, {})).toBe(false)
    await pg.query("update invitation_orders set status = 'suspended' where id = $1", [row.id])
    expect(await recordGuestResponses(row.id, g1, { nata: { status: "declined", count: 0 }, dasma: { status: "declined", count: 0 } })).toBe(false)
    expect((await load(row.id)).document).toEqual(row.document)
  })

  it("keeps an event id named __proto__ as a real key", () => {
    const parsed = parseResponses(JSON.parse('{"__proto__":{"status":"accepted","count":1}}'), guest("x", "t", 2, ["__proto__"]))
    expect(Object.keys(parsed)).toEqual(["__proto__"])
    expect(JSON.stringify(parsed)).toBe('{"__proto__":{"status":"accepted","count":1}}')
  })
})

describe("owner saves", () => {
  it("keeps an RSVP that landed after the dashboard was loaded, clamps it, and ignores forged responses", async () => {
    const loaded = await seed()
    // A guest replies after the couple opened the dashboard.
    expect(await recordGuestResponses(loaded.id, loaded.document.guests[0], { nata: { status: "accepted", count: 4 }, dasma: { status: "accepted", count: 4 } })).toBe(true)
    // The couple's edit is based on what they saw: no responses. They also
    // shrink g1, drop the nata event for g1, and try to forge g2's reply.
    const edit = structuredClone(loaded.document)
    edit.names = "Edited"
    edit.guests[0] = { ...edit.guests[0], capacity: 2, events: ["dasma"] }
    edit.guests[1].responses = { dasma: { status: "accepted", count: 2 } }
    const current = await load(loaded.id)
    const saved = await updateWedding(current, Number(loaded.revision), prepareWedding(edit, current.document))
    expect(saved).toBeDefined()
    expect(saved!.document.names).toBe("Edited")
    expect(Number(saved!.revision)).toBe(Number(loaded.revision) + 1)
    expect(saved!.document.guests.map((g) => g.responses)).toEqual([{ dasma: { status: "accepted", count: 2 } }, {}])
    expect(saved!.document.guests.map((g) => g.token)).toEqual(loaded.document.guests.map((g) => g.token))
  })

  it("merges responses from the stored row even when the prepared document is stale", async () => {
    // Simulates the window between ownerOrder() reading the row and the
    // UPDATE running: the merge uses the row as stored at write time.
    const row = await seed()
    const prepared = prepareWedding(structuredClone(row.document), row.document)
    expect(await recordGuestResponses(row.id, row.document.guests[1], { dasma: { status: "declined", count: 0 } })).toBe(true)
    const saved = await updateWedding(row, Number(row.revision), prepared)
    expect(saved!.document.guests[1].responses).toEqual({ dasma: { status: "declined", count: 0 } })
  })

  it("rejects a stale base revision, a base newer than the row it was prepared from, and status changes", async () => {
    const row = await seed()
    const doc = prepareWedding(structuredClone(row.document), row.document)
    expect(await updateWedding(row, Number(row.revision) + 1, doc)).toBeUndefined()
    const first = await updateWedding(row, Number(row.revision), doc)
    expect(first).toBeDefined()
    expect(await updateWedding(row, Number(row.revision), doc)).toBeUndefined()
    await pg.query("update invitation_orders set status = 'suspended' where id = $1", [row.id])
    expect(await updateWedding(first!, Number(first!.revision), doc)).toBeUndefined()
  })

  it("saves an empty guest list as []", async () => {
    const row = await seed()
    const saved = await updateWedding(row, Number(row.revision), prepareWedding({ ...structuredClone(row.document), guests: [] }, row.document))
    expect(saved!.document.guests).toEqual([])
  })

  it("rotates the general-link token only when asked", async () => {
    const row = await seed()
    expect(prepareWedding(structuredClone(row.document), row.document).generalLink!.token).toBe(link.token)
    const rotated = prepareWedding({ ...structuredClone(row.document), generalLink: { ...link, rotate: true } }, row.document)
    expect(rotated.generalLink!.token).toMatch(/^[a-f0-9]{64}$/)
    expect(rotated.generalLink!.token).not.toBe(link.token)
  })
})

describe("general-link registration", () => {
  it("appends once per guest id, bumps revision, and stops when the link changes", async () => {
    const row = await seed()
    const newcomer = guest("general-1", "d".repeat(64), 2, ["dasma"], { dasma: { status: "accepted", count: 2 } })
    expect(await appendGeneralGuest(row.id, link, newcomer)).toBe(true)
    expect(await appendGeneralGuest(row.id, link, { ...newcomer, token: "e".repeat(64) })).toBe(false)
    expect(await appendGeneralGuest(row.id, { ...link, capacity: 3 }, guest("general-2", "e".repeat(64), 1, ["dasma"]))).toBe(false)
    const after = await load(row.id)
    expect(after.document.guests.map((g) => g.id)).toEqual(["g1", "g2", "general-1"])
    expect(Number(after.revision)).toBe(Number(row.revision) + 1)
    // The couple's dashboard predates the registration, so its save must
    // conflict rather than silently drop the new guest.
    expect(await updateWedding(after, Number(row.revision), prepareWedding(structuredClone(row.document), after.document))).toBeUndefined()
  })
})

describe("housekeeping", () => {
  it("rate-limits per key inside a window and resets after it", async () => {
    const results = []
    for (let i = 0; i < 4; i++) results.push(await rateLimit("login-ip:abc", 3, 60))
    expect(results).toEqual([true, true, true, false])
    expect(await rateLimit("login-ip:other", 3, 60)).toBe(true)
    await pg.query("update invitation_rate_limits set reset_at = now() - interval '1 second' where key = 'login-ip:abc'")
    expect(await rateLimit("login-ip:abc", 3, 60)).toBe(true)
    await pg.query("update invitation_rate_limits set reset_at = now() - interval '2 days' where key = 'login-ip:other'")
    await rateLimit("login-ip:abc", 3, 60)
    expect((await pg.query("select key from invitation_rate_limits order by key")).rows).toEqual([{ key: "login-ip:abc" }])
    await expect(rateLimit("", 3, 60)).rejects.toThrow()
  })

  it("purges expired sessions and stale lockout rows when a session is created", async () => {
    const row = await seed()
    await pg.query("insert into invitation_sessions values ('old', $1, now() - interval '1 minute')", [row.id])
    await pg.query("insert into invitation_login_attempts (reference, attempts, reset_at) values ($1, 9, now() - interval '2 days')", [row.reference])
    await createOwnerSession(row.id)
    expect((await pg.query("select token_hash from invitation_sessions where token_hash = 'old'")).rows).toHaveLength(0)
    expect((await pg.query("select count(*)::int as n from invitation_sessions")).rows).toEqual([{ n: 1 }])
    expect((await pg.query("select count(*)::int as n from invitation_login_attempts")).rows).toEqual([{ n: 0 }])
    await pg.query("delete from invitation_orders where id = $1", [row.id])
    expect((await pg.query("select count(*)::int as n from invitation_sessions")).rows).toEqual([{ n: 0 }])
  })
})
