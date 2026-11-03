import { csvCell, type Wedding } from "./model.js"
import { calculateBudget, contactCategories, contactStatuses, expenseCategories, expenseTotal, guestsForEvent, moneyInput, type WeddingPlan, type WeddingContact } from "./planning-model.js"

const csv = (rows: (string | number)[][]) => "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")
export function contactsCsv(wedding: Wedding, contacts: WeddingContact[]) {
  return csv([
    ["Biznesi / kontakti", "Shërbimi", "Personi", "Telefoni", "Email", "Website", "Qyteti", "Statusi", "Eventet", "Shënime"],
    ...contacts.map((c) => [c.name, contactCategories[c.category], c.person, c.phone, c.email, c.website, c.city, contactStatuses[c.status], wedding.events.filter((e) => c.eventIds.includes(e.id)).map((e) => e.name).join(" / "), c.notes]),
  ])
}
export function budgetCsv(wedding: Wedding, plan: WeddingPlan) {
  const summary = calculateBudget(wedding, plan)
  const summaryRow = (label: string, cents: number) => [label, "", "", "", "", "", "", moneyInput(cents), "", "", "", ""]
  return csv([
    ["Shpenzimi", "Kategoria", "Eventi", "Kontakti", "Llogaritja", "Çmimi EUR", "Numri / sasia", "Totali EUR", "Paguar EUR", "Mbeten EUR", "Afati", "Shënime"],
    ...plan.expenses.map((e) => {
      const total = expenseTotal(wedding, plan.budget, e)
      return [e.label, expenseCategories[e.category], wedding.events.find((event) => event.id === e.eventId)?.name ?? "Të gjitha", plan.contacts.find((c) => c.id === e.vendorId)?.name ?? "", e.pricing === "per_guest" ? "Për mysafir" : "Fikse", moneyInput(e.unitCents), e.pricing === "fixed" ? e.quantity : guestsForEvent(wedding, e.eventId, plan.budget), moneyInput(total), moneyInput(e.paidCents), moneyInput(Math.max(0, total - e.paidCents)), e.dueDate, e.notes]
    }),
    summaryRow("Shpenzimet bazë", summary.baseCents),
    summaryRow(`Rezerva ${plan.budget.reservePercent}%`, summary.reserveCents),
    summaryRow("Parashikimi me rezervë", summary.totalCents),
    summaryRow("Limiti i buxhetit", plan.budget.targetCents),
    summaryRow("Paguar gjithsej", summary.paidCents),
    summaryRow("Mbeten për pagesë (pa rezervë)", summary.outstandingCents),
  ])
}
export function downloadCsv(contents: string, filename: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8;" }))
  const anchor = document.createElement("a")
  anchor.href = url; anchor.download = filename; anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
