import type { Invitation, WeddingEvent } from "./model.js"

export function coupleNames(names: string) {
  const parts = names.split(/\s*&\s*/).map((part) => part.trim()).filter(Boolean)
  return { first: parts[0] || names, second: parts.slice(1).join(" & "), initials: parts.map((part) => Array.from(part)[0]).slice(0, 2).join("") }
}

// Interpret the organizer's wall-clock time in Kosovo, independently of the
// guest's device timezone, including CET/CEST changes.
export function eventTimestamp(event: Pick<WeddingEvent, "date" | "time">) {
  const [year, month, day] = event.date.split("-").map(Number)
  const [hour, minute] = event.time.split(":").map(Number)
  const target = Date.UTC(year, month - 1, day, hour, minute)
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
  let guess = target
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(guess))
    const number = (type: string) => Number(parts.find((part) => part.type === type)?.value)
    const localAsUtc = Date.UTC(number("year"), number("month") - 1, number("day"), number("hour"), number("minute"), number("second"))
    const difference = target - localAsUtc
    guess += difference
    if (difference === 0) break
  }
  return guess
}

export function timeUntil(event: Pick<WeddingEvent, "date" | "time">, now: number) {
  const remaining = Math.max(0, Math.floor((eventTimestamp(event) - now) / 60000))
  return { days: Math.floor(remaining / 1440), hours: Math.floor(remaining % 1440 / 60), minutes: remaining % 60, passed: eventTimestamp(event) <= now }
}

const escapeCalendar = (value: string) => value.replaceAll("\\", "\\\\").replace(/\r\n|\r|\n/g, "\\n").replaceAll(";", "\\;").replaceAll(",", "\\,")
function foldCalendarLine(line: string) {
  const chunks: string[] = []
  let chunk = "", bytes = 0
  for (const character of line) {
    const length = new TextEncoder().encode(character).length
    if (bytes + length > (chunks.length ? 74 : 75)) { chunks.push(chunk); chunk = ""; bytes = 0 }
    chunk += character; bytes += length
  }
  chunks.push(chunk)
  return chunks.join("\r\n ")
}
export function calendarFile(invitation: Invitation, event: WeddingEvent, now = new Date()) {
  const timestamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
  let hash = 2166136261
  for (const char of `${invitation.names}:${event.id}:${invitation.guest.id}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CUBE DESIGNERS//Ftesa//SQ", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:ftesa-${(hash >>> 0).toString(16)}@cube-designers.com`, `DTSTAMP:${timestamp(now)}`,
    `DTSTART:${timestamp(new Date(eventTimestamp(event)))}`,
    `SUMMARY:${escapeCalendar(`${event.name} · ${invitation.names}`)}`,
    `LOCATION:${escapeCalendar([event.venue, event.address].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${escapeCalendar(`Ftesë për ${invitation.guest.name}. ${invitation.guest.message || invitation.message}`)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].map(foldCalendarLine).join("\r\n") + "\r\n"
}
export function downloadCalendar(invitation: Invitation, event: WeddingEvent) {
  const url = URL.createObjectURL(new Blob([calendarFile(invitation, event)], { type: "text/calendar;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url; link.download = `ftesa-${event.id.replace(/[^a-z0-9-]/gi, "").slice(0, 50)}.ics`; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}
