import { describe, expect, it } from "vitest"
import { createDemoWedding, isWedding } from "./model"
import { calculateBudget, createWeddingPlan, type WeddingContact } from "./planning-model"
import { saveRow, serviceRows } from "./WeddingPlanner"

const values = { group: "tent" as const, name: "Tenda Gashi", person: "Arben", phone: "+383 44 123 456", status: "booked" as const, pricing: "fixed" as const, eventId: "dasma", unitCents: 250000, paidCents: 50000, deal: "Montimi një ditë para" }

describe("wedding planner rows", () => {
  it("saves a contact with its price and agreement as one valid row", () => {
    const wedding = createDemoWedding(), plan = { ...createWeddingPlan(), expenses: [] }
    const next = saveRow(plan, { id: "", group: "tent" }, values)
    expect(isWedding({ ...wedding, planning: next })).toBe(true)
    const [row] = serviceRows(next)
    expect(row).toMatchObject({ group: "tent", contact: { name: "Tenda Gashi", category: "tent" }, expense: { notes: "Montimi një ditë para", vendorId: row.contact!.id } })
    expect(calculateBudget(wedding, next)).toMatchObject({ totalCents: 250000, paidCents: 50000, outstandingCents: 200000 })
    const edited = saveRow(next, row, { ...values, pricing: "per_guest", unitCents: 2000 })
    expect(edited.contacts).toHaveLength(1)
    expect(edited.expenses).toHaveLength(1)
    expect(calculateBudget(wedding, edited).totalCents).toBe(25 * 2000)
  })

  it("lists contacts without a price and keeps a finer category inside its group", () => {
    const plan = createWeddingPlan()
    const contact: WeddingContact = { id: "c1", name: "Studio", category: "photo", person: "", phone: "", email: "", website: "", city: "", status: "shortlist", eventIds: [], notes: "Oferta" }
    const rows = serviceRows({ ...plan, contacts: [contact] })
    expect(rows.find((r) => r.id === "c1")).toMatchObject({ group: "photo_video" })
    const clothing = rows.find((r) => r.expense?.category === "clothing")!
    expect(clothing.group).toBe("other")
    const next = saveRow(plan, clothing, { ...values, group: "other" })
    expect(next.expenses.find((e) => e.id === clothing.id)?.category).toBe("clothing")
  })
})
