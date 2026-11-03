import { limits, throttle } from "../_lib/throttle.js"
import { handle, HttpError, json, readJson, text } from "../_lib/http.js"
import { makeInvitation, makeGeneralInvitation, type Guest, type Wedding } from "../../src/components/invitations/model.js"
import { appendGeneralGuest, generalOrder, parseResponses, publicOrder, publicToken, randomToken, recordGuestResponses, requestKey, tokenHash } from "../_lib/invitations.js"

export const GET = handle(async (request) => {
  if (new URL(request.url).searchParams.has("general")) return json(makeGeneralInvitation((await generalOrder(publicToken(request))).document))
  const { row, guest } = await publicOrder(publicToken(request))
  return json(personalInvitation(row.document, guest))
})

// The only shape a guest ever receives: shared wedding details, the events this
// guest is invited to, and the guest's own entry (with their own replies).
// Never other guests, the general link, planning or order data.
function personalInvitation(wedding: Wedding, guest: Guest) {
  const { id, token, name, kind, capacity, events, message, responses } = guest
  return { ...makeInvitation(wedding, guest), guest: { id, token, name, kind, capacity, events, message, responses } }
}

export const POST = handle(async (request) => {
  const token = publicToken(request)
  const body = await readJson(request, 3000)
  if (new URL(request.url).searchParams.has("general")) return registerGuest(request, token, body)
  for (let attempt = 0; attempt < 3; attempt++) {
    const { row, guest } = await publicOrder(token)
    const responses = parseResponses(body.responses, guest)
    // Counted only for real guests, so random tokens never create counters.
    if (attempt === 0) await throttle([limits.rsvpPerGuest(token)])
    // Atomic and revision-free: only fails if the organizer changed this guest
    // (capacity/events) or the order was deactivated since it was read.
    // `invitation` lets the page show the saved reply in place without a reload.
    if (await recordGuestResponses(row.id, guest, responses)) return json({ ok: true, responses, invitation: personalInvitation(row.document, { ...guest, responses }) })
  }
  throw new HttpError(409, "Ftesa u ndryshua ndërkohë. Rifresko dhe provo përsëri.")
})

async function registerGuest(request: Request, token: string, body: Record<string, unknown>) {
  if (text(body.website, "website")) throw new HttpError(400, "Kërkesa nuk mund të pranohet.")
  const name = text(body.name, "emri", { required: true, max: 100 })
  const key = requestKey(body.requestId)
  const id = `general-${tokenHash(`${token}:${key}`)}`
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await generalOrder(token)
    const existing = row.document.guests.find((guest) => guest.id === id)
    if (existing) return json({ invitation: personalInvitation(row.document, existing) })
    const link = row.document.generalLink!
    if (!Number.isInteger(body.capacity) || Number(body.capacity) < 1 || Number(body.capacity) > link.capacity) throw new HttpError(400, `Zgjidh nga 1 deri në ${link.capacity} persona.`)
    if (row.document.guests.length >= 2000) throw new HttpError(409, "Lista e mysafirëve është plot. Kontakto organizatorin.")
    // Idempotent retries above are free; only new registrations are counted.
    if (attempt === 0) await throttle([limits.generalPerIp(request, token), limits.generalPerLink(token)])
    const capacity = Number(body.capacity)
    const guest: Guest = { id, token: randomToken(), name, kind: capacity === 1 ? "individual" : capacity === 2 ? "couple" : "family", capacity, events: link.events, message: "", responses: {} }
    guest.responses = parseResponses(body.responses, guest)
    // On false (concurrent retry of this requestId, link changed, list full)
    // the next round re-reads and either returns the existing guest or re-validates.
    if (await appendGeneralGuest(row.id, link, guest)) return json({ invitation: personalInvitation(row.document, guest) }, 201)
  }
  throw new HttpError(409, "Një ndryshim tjetër mbërriti ndërkohë. Provo përsëri.")
}
