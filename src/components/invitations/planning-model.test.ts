import { describe, expect, it } from "vitest"
import { createDemoWedding, isWedding, makeInvitation } from "./model"
import { calculateBudget, createWeddingPlan, expenseTotal, guestsForEvent, isWeddingPlan, parseMoney, safeWebsite, todayInKosovo, type WeddingContact } from "./planning-model"
import { contactsCsv } from "./planning-export"

const contact: WeddingContact = { id: "private-photo", name: "Studioja private", category: "photo", person: "Personi kontaktues", phone: "+38344123456", email: "private@example.test", website: "https://example.test", city: "Prishtinë", status: "booked", eventIds: ["dasma"], notes: "OFERTA PRIVATE" }

describe("wedding planning", () => {
  it("parses euro amounts exactly in cents and rejects ambiguous or invalid amounts", () => {
    expect(parseMoney("1200,50")).toBe(120050)
    expect(parseMoney(" 1 200.05 ")).toBe(120005)
    expect(parseMoney("0.29")).toBe(29)
    for (const input of ["", "-1", "1e3", "1,000.50", "1.001", "Infinity", "10000001"]) expect(parseMoney(input)).toBeNull()
  })

  it("combines per-event menus, fixed expenses, deposits and reserve without double-counting people", () => {
    const wedding = createDemoWedding(), plan = createWeddingPlan()
    plan.budget = { targetCents: 300000, reservePercent: 10, guestSource: "invited", customGuests: 0 }
    plan.expenses.find((e) => e.category === "venue")!.unitCents = 4000
    plan.expenses.find((e) => e.category === "venue")!.paidCents = 20000
    plan.expenses.find((e) => e.category === "music")!.unitCents = 120000
    plan.expenses.find((e) => e.category === "music")!.paidCents = 30000
    plan.expenses.find((e) => e.category === "photo_video")!.unitCents = 50000
    expect(guestsForEvent(wedding, "dasma", plan.budget)).toBe(25)
    expect(guestsForEvent(wedding, "nata", plan.budget)).toBe(10)
    expect(calculateBudget(wedding, plan)).toMatchObject({ baseCents: 270000, reserveCents: 27000, totalCents: 297000, paidCents: 50000, outstandingCents: 220000, availableCents: 3000 })
    plan.budget.guestSource = "confirmed"
    expect(guestsForEvent(wedding, "dasma", plan.budget)).toBe(15)
    expect(calculateBudget(wedding, plan).totalCents).toBe(253000)
    plan.budget.guestSource = "custom"; plan.budget.customGuests = 200
    expect(expenseTotal(wedding, plan.budget, plan.expenses[0])).toBe(800000)
  })

  it("keeps overpayments separate instead of using them to hide another unpaid expense", () => {
    const wedding = createDemoWedding(), plan = createWeddingPlan()
    plan.budget.guestSource = "custom"; plan.budget.customGuests = 0
    plan.expenses[0].unitCents = 4000; plan.expenses[0].paidCents = 1000
    plan.expenses[1].unitCents = 1000
    expect(calculateBudget(wedding, plan)).toMatchObject({ baseCents: 1000, paidCents: 1000, outstandingCents: 1000, overpaidCents: 1000 })
  })

  it("validates private plans while keeping older wedding records compatible", () => {
    const wedding = createDemoWedding(), plan = createWeddingPlan()
    expect(isWedding(wedding)).toBe(true)
    expect(isWeddingPlan(plan, wedding.events.map((e) => e.id))).toBe(true)
    plan.contacts = [contact]; plan.expenses[1].vendorId = contact.id
    expect(isWedding({ ...wedding, planning: plan })).toBe(true)
    expect(isWedding({ ...wedding, planning: { ...plan, budget: { ...plan.budget, targetCents: -1 } } })).toBe(false)
    expect(isWeddingPlan({ ...plan, contacts: [contact, contact] }, ["dasma"])).toBe(false)
    expect(isWeddingPlan({ ...plan, contacts: [{ ...contact, website: "javascript:alert(1)" }] }, ["dasma"])).toBe(false)
    expect(isWeddingPlan({ ...plan, expenses: [{ ...plan.expenses[0], vendorId: "other-wedding-contact" }] }, ["dasma"])).toBe(false)
    expect(isWeddingPlan({ ...plan, tasks: [{ id: "x", title: "Task", done: false, dueDate: "2027-02-30", eventId: "" }] }, ["dasma"])).toBe(false)
  })

  it("never includes private contacts, budget or checklist in a guest invitation", () => {
    const wedding = createDemoWedding(), planning = createWeddingPlan()
    planning.contacts = [contact]; planning.budget.targetCents = 2500000
    const invitation = makeInvitation({ ...wedding, planning }, wedding.guests[0])
    expect(invitation).not.toHaveProperty("planning")
    expect(JSON.stringify(invitation)).not.toContain("OFERTA PRIVATE")
    expect(JSON.stringify(invitation)).not.toContain("private@example.test")
  })

  it("keeps spreadsheet exports safe and dates in the wedding's local timezone", () => {
    expect(contactsCsv(createDemoWedding(), [{ ...contact, name: "=SUM(1,2)" }])).toContain('"\'=SUM(1,2)"')
    expect(safeWebsite("https://username:secret@example.test")).toBe(false)
    expect(safeWebsite("https://example.test")).toBe(true)
    expect(todayInKosovo(new Date("2026-11-03T23:30:00Z"))).toBe("2026-11-04")
  })
})
