import { describe, expect, it } from "vitest"
import { createDemoWedding, exportGuests, formatDate, guestStatus, invitationLink, isWedding, readInvitation, removeEvent, sortEvents, totals } from "./model"

describe("wedding invitations", () => {
  it("renders dates in Albanian without depending on device locale support", () => {
    expect(formatDate("2027-06-20")).toBe("20 qershor 2027")
    expect(formatDate("2027-11-03", true)).toBe("3 nën 2027")
  })
  it("counts seats and confirmed people without counting the same guest twice across events", () => {
    const wedding = createDemoWedding()
    expect(isWedding(wedding)).toBe(true)
    expect(totals(wedding)).toEqual({ invited: 25, confirmed: 15, pending: 4, invitations: 8 })
    expect(guestStatus(wedding.guests[6])).toBe("declined")
    expect(guestStatus(wedding.guests[7])).toBe("pending")
  })

  it("shares a portable Unicode invitation with only that guest's events and no other guest data", () => {
    const wedding = createDemoWedding()
    const guest = { ...wedding.guests[1], name: "Familja Çela — ❤️", message: "Ju presim me kënaqësi!" }
    const link = new URL(invitationLink(wedding, guest, "https://example.com"))
    const invitation = readInvitation(link.hash)!
    expect(invitation.guest.name).toBe(guest.name)
    expect(invitation.guest.message).toBe(guest.message)
    expect(invitation.events.map((e) => e.id)).toEqual(["dasma"])
    expect(invitation.guest.responses).toEqual({})
    expect(JSON.stringify(invitation)).not.toContain("Familja Gashi")
    expect(invitation).not.toHaveProperty("guests")
  })

  it("rejects malformed, oversized and inconsistent invitations", () => {
    const wedding = createDemoWedding()
    const valid = readInvitation(new URL(invitationLink(wedding, wedding.guests[0], "https://example.com")).hash)!
    function encode(value: unknown) { return `#ftese=${encodeURIComponent(btoa(JSON.stringify(value)))}` }
    expect(readInvitation("#ftese=broken")).toBeNull()
    expect(readInvitation(`#ftese=${"a".repeat(40001)}`)).toBeNull()
    expect(readInvitation(encode({ ...valid, guest: { ...valid.guest, capacity: -1 } }))).toBeNull()
    expect(readInvitation(encode({ ...valid, guest: { ...valid.guest, events: ["private-event"] } }))).toBeNull()
    expect(readInvitation(encode({ ...valid, guest: { ...valid.guest, responses: { dasma: { status: "accepted", count: 100 } } } }))).toBeNull()
    expect(readInvitation(encode({ ...valid, events: [{ ...valid.events[0], date: "not-a-date" }] }))).toBeNull()
    expect(isWedding({ ...wedding, guests: [...wedding.guests, wedding.guests[0]] })).toBe(false)
  })

  it("exports one personalized link per selected invitation and neutralizes spreadsheet formulas", () => {
    const wedding = createDemoWedding()
    const csv = exportGuests(wedding, "https://example.com", [{ ...wedding.guests[0], name: '=HYPERLINK("bad")' }])
    expect(csv.split("\r\n")).toHaveLength(2)
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"')
    expect(csv).toContain("https://example.com/ftesa#ftese=")
    expect(csv).not.toContain("Familja Krasniqi")
  })
})

describe("configurable events", () => {
  it("removes an event everywhere, but never strands a guest invited only there", () => {
    const wedding = createDemoWedding()
    const blocked = removeEvent(wedding, "dasma")
    expect(blocked).toMatch(/vetëm në këtë event/)
    const next = removeEvent({ ...wedding, generalLink: { enabled: true, token: "a".repeat(64), events: ["nata"], capacity: 4 } }, "nata")
    if (typeof next === "string") throw new Error(next)
    expect(next.events.map((e) => e.id)).toEqual(["kanagjegji", "dasma"])
    expect(next.guests.every((g) => !g.events.includes("nata") && !("nata" in g.responses))).toBe(true)
    expect(next.generalLink).toMatchObject({ enabled: false, events: ["dasma"] })
    expect(isWedding(next)).toBe(true)
    expect(removeEvent({ ...wedding, events: [wedding.events[0]], guests: [] }, "kanagjegji")).toMatch(/të paktën një event/)
  })

  it("accepts up to eight events in calendar order", () => {
    const wedding = createDemoWedding()
    const extra = Array.from({ length: 5 }, (_, i) => ({ id: `event-${i}`, name: `Event ${i}`, date: `2027-05-0${i + 1}`, time: "18:00", venue: "Salla", address: "Prishtinë" }))
    const events = sortEvents([...wedding.events, ...extra])
    expect(events[0].id).toBe("event-0")
    expect(isWedding({ ...wedding, events })).toBe(true)
    expect(isWedding({ ...wedding, events: [...events, { ...extra[0], id: "too-many" }] })).toBe(false)
  })
})
