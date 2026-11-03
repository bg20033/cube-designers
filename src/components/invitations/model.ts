import { isWeddingPlan, validDate, type WeddingPlan } from "./planning-model.js"

export type GuestKind = "family" | "couple" | "individual"
export type DesignId = "lilac" | "olive" | "midnight" | "rose"
export type Attendance = { status: "accepted" | "declined"; count: number }
export type WeddingEvent = {
  id: string
  name: string
  date: string
  time: string
  venue: string
  address: string
  mapUrl?: string
}
export type Guest = {
  id: string
  token: string
  name: string
  kind: GuestKind
  capacity: number
  events: string[]
  message: string
  responses: Record<string, Attendance>
}
// `rotate: true` is a save-time request only: the server mints a new token
// (the old link stops working) and never stores the flag.
export type GeneralLink = { enabled: boolean; token: string; events: string[]; capacity: number; rotate?: boolean }
export type GeneralInvitation = Pick<Wedding, "version" | "names" | "message" | "design" | "events"> & { capacity: number; demoToken?: string }
export type Wedding = {
  version: 1
  names: string
  message: string
  design: DesignId
  events: WeddingEvent[]
  guests: Guest[]
  demoActivated: boolean
  generalLink?: GeneralLink
  planning?: WeddingPlan
}
export type Invitation = {
  version: 1
  names: string
  message: string
  design: DesignId
  events: WeddingEvent[]
  guest: Guest
}

export const STORAGE_KEY = "cube-ftesa-demo-v1"
export const MAX_EVENTS = 8
export const kindLabels: Record<GuestKind, string> = {
  family: "Familje", couple: "Me +1", individual: "Individuale",
}
export const designs: { id: DesignId; name: string; description: string; color: string }[] = [
  { id: "lilac", name: "Fildish", description: "Letër fildishi me detaje ari", color: "#e9d9b0" },
  { id: "olive", name: "Botanika", description: "Gjethe në reliev dhe tone të gjelbra", color: "#6f9160" },
  { id: "midnight", name: "Nën yje", description: "Blu mesnate, unaza dhe ar", color: "#1f2b4d" },
  { id: "rose", name: "Perla", description: "Rozë e butë dhe shtresa skulpturore", color: "#e8c6c3" },
]

export function createDemoWedding(): Wedding {
  const events: WeddingEvent[] = [
    { id: "kanagjegji", name: "Kanagjegji", date: "2027-06-18", time: "19:00", venue: "Shtëpia e nuses", address: "Prishtinë, Kosovë" },
    { id: "nata", name: "Nata e dasmës", date: "2027-06-19", time: "20:00", venue: "Garden Events", address: "Prishtinë, Kosovë" },
    { id: "dasma", name: "Dasma", date: "2027-06-20", time: "18:00", venue: "Emerald Hotel", address: "Prishtinë, Kosovë" },
  ]
  const guests: Guest[] = [
    { id: "g1", token: "demo-gashi-1", name: "Familja Gashi", kind: "family", capacity: 5, events: ["nata", "dasma"], message: "Mezi presim ta ndajmë këtë gëzim me familjen tuaj!", responses: { nata: { status: "accepted", count: 5 }, dasma: { status: "accepted", count: 5 } } },
    { id: "g2", token: "demo-krasniqi-2", name: "Familja Krasniqi", kind: "family", capacity: 4, events: ["dasma"], message: "", responses: {} },
    { id: "g3", token: "demo-elira-3", name: "Elira Berisha", kind: "couple", capacity: 2, events: ["kanagjegji", "dasma"], message: "E dashur Elira, kjo ditë s’do të ishte e njëjtë pa ty.", responses: { kanagjegji: { status: "accepted", count: 2 }, dasma: { status: "accepted", count: 2 } } },
    { id: "g4", token: "demo-ardit-4", name: "Ardit Hoxha", kind: "individual", capacity: 1, events: ["nata", "dasma"], message: "", responses: {} },
    { id: "g5", token: "demo-bytyqi-5", name: "Familja Bytyqi", kind: "family", capacity: 6, events: ["dasma"], message: "", responses: { dasma: { status: "accepted", count: 4 } } },
    { id: "g6", token: "demo-dafina-6", name: "Dafina Morina", kind: "couple", capacity: 2, events: ["kanagjegji", "dasma"], message: "", responses: {} },
    { id: "g7", token: "demo-rita-7", name: "Rita Shala", kind: "individual", capacity: 1, events: ["kanagjegji", "dasma"], message: "", responses: { kanagjegji: { status: "declined", count: 0 }, dasma: { status: "declined", count: 0 } } },
    { id: "g8", token: "demo-morina-8", name: "Familja Morina", kind: "family", capacity: 4, events: ["nata", "dasma"], message: "", responses: { dasma: { status: "accepted", count: 4 } } },
  ]
  return { version: 1, names: "Arbër & Hana", message: "Me zemrat plot dashuri, ju ftojmë të festoni me ne fillimin e kapitullit tonë më të bukur.", design: "lilac", events, guests, demoActivated: false }
}

// Events always read in calendar order on the dashboard and in invitations.
export function sortEvents(events: WeddingEvent[]) {
  return events.toSorted((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
}

// Removes an event and every reference to it, or explains why it can't be removed.
export function removeEvent(wedding: Wedding, eventId: string): Wedding | string {
  const events = wedding.events.filter((event) => event.id !== eventId)
  if (!events.length) return "Duhet të mbetet të paktën një event."
  const onlyHere = wedding.guests.filter((guest) => guest.events.length === 1 && guest.events[0] === eventId)
  if (onlyHere.length) return `${onlyHere.length === 1 ? "1 mysafir është ftuar" : `${onlyHere.length} mysafirë janë ftuar`} vetëm në këtë event (${onlyHere.slice(0, 3).map((g) => g.name).join(", ")}${onlyHere.length > 3 ? "…" : ""}). Ftoji në një event tjetër ose hiqi nga lista më parë.`
  const main = (events.find((event) => event.id === "dasma") ?? events[0]).id
  const guests = wedding.guests.map((guest) => ({ ...guest, events: guest.events.filter((id) => id !== eventId), responses: Object.fromEntries(Object.entries(guest.responses).filter(([id]) => id !== eventId)) }))
  const linkEvents = wedding.generalLink?.events.filter((id) => id !== eventId) ?? []
  const generalLink = wedding.generalLink && (linkEvents.length ? { ...wedding.generalLink, events: linkEvents } : { ...wedding.generalLink, events: [main], enabled: false })
  const plan = wedding.planning
  const planning = plan && { ...plan,
    expenses: plan.expenses.map((e) => e.eventId !== eventId ? e : { ...e, eventId: e.pricing === "per_guest" ? main : "" }),
    tasks: plan.tasks.map((t) => t.eventId === eventId ? { ...t, eventId: "" } : t),
    contacts: plan.contacts.map((c) => ({ ...c, eventIds: c.eventIds.filter((id) => id !== eventId) })),
  }
  return { ...wedding, events, guests, ...(generalLink ? { generalLink } : {}), ...(planning ? { planning } : {}) }
}

export function guestStatus(guest: Guest) {
  const responses = guest.events.map((id) => guest.responses[id])
  if (responses.length && responses.every((r) => r?.status === "declined")) return "declined"
  if (responses.length && responses.every(Boolean)) return "accepted"
  return "pending"
}

export function totals(wedding: Wedding) {
  return {
    invited: wedding.guests.reduce((sum, g) => sum + g.capacity, 0),
    confirmed: wedding.guests.reduce((sum, g) => sum + Math.max(0, ...g.events.map((id) => g.responses[id]?.count ?? 0)), 0),
    pending: wedding.guests.filter((g) => guestStatus(g) === "pending").length,
    invitations: wedding.guests.length,
  }
}

export function formatDate(date: string, short = false) {
  // Chromium builds without Albanian ICU data fall back to English. Keep the
  // invitation language and server/client rendering identical on every device.
  const months = short
    ? ["jan", "shk", "mar", "pri", "maj", "qer", "kor", "gush", "sht", "tet", "nën", "dhj"]
    : ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"]
  const [year, month, day] = date.split("-").map(Number)
  return `${day} ${months[month - 1]} ${year}`
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}
function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max
}
// Only plain web links (e.g. Google Maps) are kept for a location.
export function safeLink(value: string) {
  if (!value) return true
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password } catch { return false }
}
function validEvent(value: unknown): value is WeddingEvent {
  if (!record(value)) return false
  return boundedText(value.id, 80) && !!value.id && boundedText(value.name, 100) && !!value.name.trim() &&
    validDate(value.date) &&
    typeof value.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.time) && boundedText(value.venue, 150) && boundedText(value.address, 250) &&
    (value.mapUrl === undefined || boundedText(value.mapUrl, 500) && safeLink(value.mapUrl))
}
function validGuest(value: unknown, eventIds: string[]): value is Guest {
  if (!record(value)) return false
  if (!boundedText(value.id, 80) || !value.id || !boundedText(value.token, 100) || !value.token || !boundedText(value.name, 100) || !value.name.trim() ||
    !["family", "couple", "individual"].includes(String(value.kind)) || !Number.isInteger(value.capacity) || Number(value.capacity) < 1 || Number(value.capacity) > 30 ||
    !Array.isArray(value.events) || !value.events.length || value.events.length > MAX_EVENTS || new Set(value.events).size !== value.events.length || !value.events.every((id) => eventIds.includes(id)) ||
    !boundedText(value.message, 1000) || !record(value.responses)) return false
  if (value.kind === "individual" && value.capacity !== 1 || value.kind === "couple" && value.capacity !== 2) return false
  return Object.entries(value.responses).every(([id, r]) => value.events instanceof Array && value.events.includes(id) && record(r) &&
    ["accepted", "declined"].includes(String(r.status)) && Number.isInteger(r.count) &&
    (r.status === "declined" ? r.count === 0 : Number(r.count) >= 1 && Number(r.count) <= Number(value.capacity)))
}
function validShared(value: unknown): value is Omit<Invitation, "guest"> & Record<string, unknown> {
  if (!record(value) || value.version !== 1 || !boundedText(value.names, 100) || !value.names.trim() || !boundedText(value.message, 1000) ||
    !designs.some((d) => d.id === value.design) || !Array.isArray(value.events) || value.events.length < 1 || value.events.length > MAX_EVENTS || !value.events.every(validEvent)) return false
  const ids = value.events.map((e) => e.id)
  return new Set(ids).size === ids.length
}
export function validGeneralLink(value: unknown, eventIds: string[]): value is GeneralLink {
  return record(value) && typeof value.enabled === "boolean" && typeof value.token === "string" && /^[a-f0-9]{64}$/.test(value.token) &&
    (value.rotate === undefined || typeof value.rotate === "boolean") &&
    Number.isInteger(value.capacity) && Number(value.capacity) >= 1 && Number(value.capacity) <= 30 &&
    Array.isArray(value.events) && value.events.length > 0 && value.events.length <= eventIds.length &&
    new Set(value.events).size === value.events.length && value.events.every((id) => typeof id === "string" && eventIds.includes(id))
}
export function makeGeneralInvitation(wedding: Wedding): GeneralInvitation {
  return { version: 1, names: wedding.names, message: wedding.message, design: wedding.design,
    events: wedding.events.filter((event) => wedding.generalLink?.events.includes(event.id)), capacity: wedding.generalLink?.capacity ?? 6 }
}
export function isGeneralInvitation(value: unknown): value is GeneralInvitation {
  return validShared(value) && Number.isInteger(value.capacity) && Number(value.capacity) >= 1 && Number(value.capacity) <= 30
}
export function generalInvitationLink(wedding: Wedding, origin: string, online = false) {
  if (!wedding.generalLink?.enabled) return ""
  if (online) return `${origin}/ftesa#teftuar=${wedding.generalLink.token}`
  const bytes = new TextEncoder().encode(JSON.stringify({ ...makeGeneralInvitation(wedding), demoToken: wedding.generalLink.token }))
  return `${origin}/ftesa#teftuar-demo=${encodeURIComponent(btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")))}`
}
export function readGeneralInvitation(hash: string): GeneralInvitation | null {
  try {
    const encoded = new URLSearchParams(hash.replace(/^#/, "")).get("teftuar-demo")
    if (!encoded || encoded.length > 40000) return null
    const value: unknown = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))))
    return isGeneralInvitation(value) ? value : null
  } catch { return null }
}

export function isWedding(value: unknown): value is Wedding {
  return validShared(value) && record(value) && typeof value.demoActivated === "boolean" && Array.isArray(value.guests) && value.guests.length <= 2000 &&
    value.guests.every((g) => validGuest(g, value.events.map((e) => e.id))) && new Set(value.guests.map((g) => g.id)).size === value.guests.length &&
    (value.planning === undefined || isWeddingPlan(value.planning, value.events.map((e) => e.id))) &&
    (value.generalLink === undefined || validGeneralLink(value.generalLink, value.events.map((e) => e.id)))
}

export function isInvitation(value: unknown): value is Invitation {
  return validShared(value) && validGuest(value.guest, value.events.map((event) => event.id))
}

export function makeInvitation(wedding: Wedding, guest: Guest): Invitation {
  return { version: 1, names: wedding.names, message: wedding.message, design: wedding.design, events: wedding.events.filter((e) => guest.events.includes(e.id)), guest: { ...guest, responses: {} } }
}

export function invitationLink(wedding: Wedding, guest: Guest, origin: string, online = false) {
  if (online) return `${origin}/ftesa#ftesa=${guest.token}`
  const bytes = new TextEncoder().encode(JSON.stringify(makeInvitation(wedding, guest)))
  const encoded = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
  return `${origin}/ftesa#ftese=${encodeURIComponent(encoded)}`
}
export function readInvitation(hash: string): Invitation | null {
  try {
    const encoded = new URLSearchParams(hash.replace(/^#/, "")).get("ftese")
    if (!encoded || encoded.length > 40000) return null
    const decoded: unknown = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))))
    return isInvitation(decoded) ? decoded : null
  } catch { return null }
}

export function csvCell(value: string | number) {
  const text = String(value)
  // A spreadsheet must treat user-entered names and addresses as text.
  return `"${(/^[\s]*[=+\-@\t\r]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`
}
export function exportGuests(wedding: Wedding, origin: string, guests = wedding.guests, online = false) {
  return "\uFEFF" + [
    ["Mysafiri", "Lloji", "Vendet", "Eventet", "Statusi", "Linku personal"].map(csvCell).join(","),
    ...guests.map((g) => [g.name, kindLabels[g.kind], g.capacity, wedding.events.filter((e) => g.events.includes(e.id)).map((e) => e.name).join(" / "), guestStatus(g) === "pending" ? "Në pritje" : guestStatus(g) === "declined" ? "Nuk vjen" : "U përgjigj", invitationLink(wedding, g, origin, online)].map(csvCell).join(",")),
  ].join("\r\n")
}
