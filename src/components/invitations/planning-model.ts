import type { Wedding } from "./model.js"

export const contactCategories = {
  tent: "Tenda", photo: "Fotografi", video: "Kamerë & video", photo_video: "Foto & video",
  venue: "Restorant & sallë", music: "Muzikë & DJ", decor: "Dekor & lule",
  beauty: "Grim & flokë", transport: "Transport", other: "Të tjera",
} as const
export const expenseCategories = {
  tent: "Tenda", venue: "Restoranti", photo_video: "Foto & video", music: "Muzika", decor: "Dekori & lulet",
  clothing: "Veshjet", beauty: "Grim & flokë", transport: "Transporti", invitations: "Ftesat", other: "Të tjera",
} as const
export const contactStatuses = { shortlist: "Në listë", contacted: "I kontaktuar", booked: "I rezervuar", declined: "Nuk u zgjodh" } as const
export type ContactCategory = keyof typeof contactCategories
export type ExpenseCategory = keyof typeof expenseCategories
// The planner groups every contact and expense into these few services.
export const serviceGroups = { tent: "Tenda", photo_video: "Video & foto", music: "Muzika", venue: "Restoranti", decor: "Dekori", other: "Të tjera" } as const
export type ServiceGroup = keyof typeof serviceGroups
export function serviceGroup(category: string): ServiceGroup {
  if (category === "photo" || category === "video") return "photo_video"
  return Object.hasOwn(serviceGroups, category) ? category as ServiceGroup : "other"
}
export type WeddingContact = {
  id: string; name: string; category: ContactCategory; person: string; phone: string
  email: string; website: string; city: string; status: keyof typeof contactStatuses
  eventIds: string[]; notes: string
}
export type WeddingExpense = {
  id: string; label: string; category: ExpenseCategory; eventId: string; vendorId: string
  pricing: "fixed" | "per_guest"; unitCents: number; quantity: number
  paidCents: number; dueDate: string; notes: string
}
export type WeddingTask = { id: string; title: string; eventId: string; dueDate: string; done: boolean }
export type WeddingBudget = { targetCents: number; reservePercent: number; guestSource: "invited" | "confirmed" | "custom"; customGuests: number }
export type WeddingPlan = { budget: WeddingBudget; expenses: WeddingExpense[]; contacts: WeddingContact[]; tasks: WeddingTask[] }

export function createWeddingPlan(eventId = "dasma"): WeddingPlan {
  return {
    budget: { targetCents: 0, reservePercent: 0, guestSource: "invited", customGuests: 0 }, contacts: [],
    expenses: ([
      ["venue", "Menuja e restorantit", "per_guest"], ["photo_video", "Fotografi & video", "fixed"],
      ["music", "Muzika e mbrëmjes", "fixed"], ["decor", "Dekori & lulet", "fixed"],
      ["clothing", "Veshjet tona", "fixed"], ["invitations", "Ftesat e dasmës", "fixed"],
    ] as const).map(([category, label, pricing]) => ({ id: `expense-${category}`, label, category, pricing, eventId: ["clothing", "invitations"].includes(category) ? "" : eventId, vendorId: "", unitCents: 0, quantity: 1, paidCents: 0, dueDate: "", notes: "" })),
    tasks: ["Përcaktoni buxhetin", "Rezervoni restorantin", "Zgjidhni fotografin dhe videon", "Konfirmoni muzikën", "Përfundoni listën e mysafirëve", "Dërgoni ftesat personale", "Konfirmoni numrin me restorantin", "Kontrolloni pagesat e mbetura"].map((title, i) => ({ id: `task-${i}`, title, eventId: "", dueDate: "", done: false })),
  }
}
export function weddingPlan(wedding: Wedding): WeddingPlan {
  return wedding.planning ?? createWeddingPlan(wedding.events.find((e) => e.id === "dasma")?.id ?? wedding.events[0].id)
}
export function formatMoney(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100)
}
export function moneyInput(cents: number) { return (cents / 100).toFixed(2).replace(/\.00$/, "") }
export function parseMoney(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".")
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const [whole, fraction = ""] = normalized.split(".")
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"))
  return Number.isSafeInteger(cents) && cents <= 1_000_000_000 ? cents : null
}
export function guestsForEvent(wedding: Wedding, eventId: string, budget: WeddingBudget) {
  if (budget.guestSource === "custom") return budget.customGuests
  return wedding.guests.filter((g) => g.events.includes(eventId)).reduce((sum, g) => sum + (budget.guestSource === "invited" ? g.capacity : g.responses[eventId]?.count ?? 0), 0)
}
export function expenseTotal(wedding: Wedding, budget: WeddingBudget, expense: WeddingExpense) {
  return expense.unitCents * (expense.pricing === "per_guest" ? guestsForEvent(wedding, expense.eventId, budget) : expense.quantity)
}
export function calculateBudget(wedding: Wedding, plan = weddingPlan(wedding)) {
  let baseCents = 0, paidCents = 0, outstandingCents = 0, overpaidCents = 0
  const categories = Object.fromEntries(Object.keys(expenseCategories).map((key) => [key, 0])) as Record<ExpenseCategory, number>
  for (const expense of plan.expenses) {
    const total = expenseTotal(wedding, plan.budget, expense)
    baseCents += total; paidCents += expense.paidCents
    outstandingCents += Math.max(0, total - expense.paidCents)
    overpaidCents += Math.max(0, expense.paidCents - total)
    categories[expense.category] += total
  }
  const reserveCents = Math.trunc(baseCents / 100) * plan.budget.reservePercent + Math.round((baseCents % 100) * plan.budget.reservePercent / 100)
  return { baseCents, paidCents, outstandingCents, overpaidCents, reserveCents, totalCents: baseCents + reserveCents, availableCents: plan.budget.targetCents - baseCents - reserveCents, categories }
}
export function todayInKosovo(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now)
  return ["year", "month", "day"].map((key) => parts.find((p) => p.type === key)!.value).join("-")
}
export const phoneHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function safeWebsite(value: string) {
  if (!value) return true
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password } catch { return false }
}
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v)
const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max
const id = (v: unknown): v is string => str(v, 80) && !!v.trim()
const money = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= 1_000_000_000
const count = (v: unknown, min = 0) => Number.isInteger(v) && Number(v) >= min && Number(v) <= 10000
const member = (v: unknown, options: object) => typeof v === "string" && Object.hasOwn(options, v)
const optionalDate = (v: unknown) => v === "" || validDate(v)

export function isWeddingPlan(value: unknown, eventIds: string[]): value is WeddingPlan {
  if (!object(value) || !object(value.budget)) return false
  const b = value.budget
  if (!money(b.targetCents) || !Number.isInteger(b.reservePercent) || Number(b.reservePercent) < 0 || Number(b.reservePercent) > 50 || !["invited", "confirmed", "custom"].includes(String(b.guestSource)) || !count(b.customGuests)) return false
  if (!Array.isArray(value.contacts) || value.contacts.length > 500 || !Array.isArray(value.expenses) || value.expenses.length > 300 || !Array.isArray(value.tasks) || value.tasks.length > 500) return false
  const event = (v: unknown) => v === "" || typeof v === "string" && eventIds.includes(v)
  if (!value.contacts.every((c) => object(c) && id(c.id) && str(c.name, 150) && !!c.name.trim() && member(c.category, contactCategories) && member(c.status, contactStatuses) && str(c.person, 100) && str(c.phone, 40) && (!c.phone || /^\+?[\d\s().-]{3,40}$/.test(c.phone)) && str(c.email, 254) && (!c.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) && str(c.website, 500) && safeWebsite(c.website) && str(c.city, 100) && str(c.notes, 2000) && Array.isArray(c.eventIds) && c.eventIds.length <= eventIds.length && c.eventIds.every((e) => typeof e === "string" && eventIds.includes(e)) && new Set(c.eventIds).size === c.eventIds.length)) return false
  const contactIds = value.contacts.map((c) => (c as WeddingContact).id)
  if (new Set(contactIds).size !== contactIds.length) return false
  if (!value.expenses.every((e) => object(e) && id(e.id) && str(e.label, 150) && !!e.label.trim() && member(e.category, expenseCategories) && event(e.eventId) && (e.pricing === "fixed" || e.pricing === "per_guest" && !!e.eventId) && money(e.unitCents) && money(e.paidCents) && count(e.quantity, 1) && optionalDate(e.dueDate) && str(e.notes, 2000) && (e.vendorId === "" || typeof e.vendorId === "string" && contactIds.includes(e.vendorId)))) return false
  if (!value.tasks.every((t) => object(t) && id(t.id) && str(t.title, 200) && !!t.title.trim() && event(t.eventId) && optionalDate(t.dueDate) && typeof t.done === "boolean")) return false
  return new Set(value.expenses.map((e) => (e as WeddingExpense).id)).size === value.expenses.length && new Set(value.tasks.map((t) => (t as WeddingTask).id)).size === value.tasks.length
}

export function cleanWeddingPlan(plan: WeddingPlan): WeddingPlan {
  return {
    budget: { targetCents: plan.budget.targetCents, reservePercent: plan.budget.reservePercent, guestSource: plan.budget.guestSource, customGuests: plan.budget.customGuests },
    contacts: plan.contacts.map((c) => ({ id: c.id, name: c.name.trim(), category: c.category, person: c.person.trim(), phone: c.phone.trim(), email: c.email.trim(), website: c.website.trim(), city: c.city.trim(), status: c.status, eventIds: [...c.eventIds], notes: c.notes.trim() })),
    expenses: plan.expenses.map((e) => ({ id: e.id, label: e.label.trim(), category: e.category, eventId: e.eventId, vendorId: e.vendorId, pricing: e.pricing, unitCents: e.unitCents, quantity: e.quantity, paidCents: e.paidCents, dueDate: e.dueDate, notes: e.notes.trim() })),
    tasks: plan.tasks.map((t) => ({ id: t.id, title: t.title.trim(), eventId: t.eventId, dueDate: t.dueDate, done: t.done })),
  }
}
