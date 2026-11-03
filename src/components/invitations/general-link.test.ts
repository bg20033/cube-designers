import { describe, expect, it } from "vitest"
import { createDemoWedding, generalInvitationLink, isWedding, makeGeneralInvitation, makeInvitation, readGeneralInvitation } from "./model"
import { createWeddingPlan } from "./planning-model"

describe("general invitation links", () => {
  it("shares selected events without the guest list, private plan or personal tokens", () => {
    const wedding = createDemoWedding()
    wedding.generalLink = { enabled: true, token: "c".repeat(64), events: ["dasma"], capacity: 6 }
    wedding.planning = createWeddingPlan()
    const publicView = makeGeneralInvitation(wedding)
    expect(publicView.events.map((event) => event.id)).toEqual(["dasma"])
    expect(publicView).not.toHaveProperty("guests")
    expect(publicView).not.toHaveProperty("planning")
    expect(publicView).not.toHaveProperty("generalLink")
    expect(makeInvitation(wedding, wedding.guests[0])).not.toHaveProperty("generalLink")
    const url = generalInvitationLink(wedding, "https://example.test")
    expect(readGeneralInvitation(new URL(url).hash)).toMatchObject({ ...publicView, demoToken: wedding.generalLink.token })
    expect(url).not.toContain(wedding.guests[0].token)
    expect(generalInvitationLink(wedding, "https://example.test", true)).toBe(`https://example.test/ftesa#teftuar=${"c".repeat(64)}`)
  })
  it("accepts older weddings, rejects invalid configuration and stops sharing when disabled", () => {
    const wedding = createDemoWedding()
    expect(isWedding(wedding)).toBe(true)
    expect(generalInvitationLink(wedding, "https://example.test")).toBe("")
    const generalLink = { enabled: true, token: "a".repeat(64), events: ["dasma"], capacity: 6 }
    expect(isWedding({ ...wedding, generalLink })).toBe(true)
    for (const change of [{ capacity: 31 }, { capacity: 0 }, { events: ["private-unknown"] }, { events: [] }, { events: ["dasma", "dasma"] }, { token: "predictable" }]) expect(isWedding({ ...wedding, generalLink: { ...generalLink, ...change } })).toBe(false)
    expect(generalInvitationLink({ ...wedding, generalLink: { ...generalLink, enabled: false } }, "https://example.test")).toBe("")
    expect(readGeneralInvitation("#teftuar-demo=broken")).toBeNull()
  })
})
