import { describe, expect, it } from "vitest"
import { coupleNames, calendarFile, eventTimestamp, timeUntil } from "./ceremony-utils"
import { createDemoWedding, makeInvitation } from "./model"

describe("personal invitation presentation", () => {
  it("derives names and initials without assuming that every title has two names", () => {
    expect(coupleNames("Arbër & Hana")).toEqual({ first: "Arbër", second: "Hana", initials: "AH" })
    expect(coupleNames("Elira")).toEqual({ first: "Elira", second: "", initials: "E" })
  })
  it("interprets event times in Kosovo with summer and winter time", () => {
    expect(new Date(eventTimestamp({ date: "2027-06-20", time: "18:00" })).toISOString()).toBe("2027-06-20T16:00:00.000Z")
    expect(new Date(eventTimestamp({ date: "2026-11-03", time: "18:00" })).toISOString()).toBe("2026-11-03T17:00:00.000Z")
    expect(timeUntil({ date: "2027-06-20", time: "18:00" }, Date.parse("2027-06-19T13:30:00Z"))).toEqual({ days: 1, hours: 2, minutes: 30, passed: false })
    expect(timeUntil({ date: "2027-06-20", time: "18:00" }, Date.parse("2027-06-21T00:00:00Z"))).toEqual({ days: 0, hours: 0, minutes: 0, passed: true })
  })
  it("exports only the selected event with escaped fields and valid UTF-8 line folding", () => {
    const wedding = createDemoWedding()
    const invitation = makeInvitation(wedding, wedding.guests[0])
    const event = { ...invitation.events[0], name: "Nata, e dasmës;\nBEGIN:EVIL" }
    invitation.guest.message = "ë".repeat(100)
    const file = calendarFile(invitation, event, new Date("2026-11-03T12:00:00Z"))
    expect(file).toContain("BEGIN:VCALENDAR\r\n")
    expect(file).toContain("DTSTART:20270619T180000Z")
    expect(file).toContain("SUMMARY:Nata\\, e dasmës\\;\\nBEGIN:EVIL")
    expect(file).not.toContain("\r\nBEGIN:EVIL")
    expect(file).not.toContain("Familja Krasniqi")
    expect(file).not.toContain(invitation.guest.token)
    expect(file).not.toContain("private@example")
    expect(file.match(/BEGIN:VEVENT/g)).toHaveLength(1)
    for (const line of file.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
  })
})
