import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react"
import { ArrowLeft, ArrowUpRight, CalendarPlus, Check, CheckCircle2, Copy, LoaderCircle, PencilLine } from "lucide-react"
import { copyText } from "./copy-link"
import InvitationCard from "./InvitationCard"
import { coupleNames, downloadCalendar, timeUntil } from "./ceremony-utils"
import { formatDate, type Attendance, type Invitation, type WeddingEvent } from "./model"
import "./ceremony.css"
import "./envelope.css"

const weekdays = ["E diel", "E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë"]
function dayParts(date: string) {
  const [year, month, day] = date.split("-").map(Number)
  return { day, month: formatDate(date).split(" ")[1], short: formatDate(date, true).split(" ")[1], year, weekday: weekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] }
}
const mapLink = (event: WeddingEvent) => event.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venue, event.address].filter(Boolean).join(", "))}`
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

// Scroll progress through the envelope section drives the opening (--p from 0 to 1).
function useEnvelope(enabled: boolean) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return
    let frame = 0
    const update = () => {
      frame = 0
      const bounds = element.getBoundingClientRect()
      const distance = bounds.height - window.innerHeight
      const progress = distance > 0 ? Math.min(1, Math.max(0, -bounds.top / distance)) : 1
      element.style.setProperty("--p", progress.toFixed(4))
      element.classList.toggle("is-open", progress > 0.16)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule) }
  }, [enabled])
  return ref
}

// Sections fade up once as they enter the screen.
function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const items = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-reveal]") ?? [])
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) { items.forEach((item) => item.classList.add("is-in")); return }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-in"); observer.unobserve(entry.target) }
    }), { rootMargin: "0px 0px -12% 0px", threshold: 0.12 })
    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [root])
}

/** A general (shared) link: the guest types a name, and the first save returns their personal invitation. */
export type GuestRegistration = {
  capacity: number
  onRegister: (name: string, count: number, responses: Record<string, Attendance>) => Promise<Invitation | false>
}

const answerLabel = (response: Attendance | undefined, capacity: number) => !response ? "Pa përgjigje"
  : response.status === "declined" ? capacity === 1 ? "S’mund të vij" : "S’mund të vijmë"
  : capacity === 1 ? "Do të vij" : `Do të vijmë · ${response.count} ${response.count === 1 ? "person" : "persona"}`

export default function GuestInvitation({ invitation: initialInvitation, onRespond, onBack, preview = false, online = false, registration: pendingRegistration }: {
  invitation: Invitation
  /** Receives the invitation being answered: after a general-link registration this is the new personal one. */
  onRespond: (responses: Record<string, Attendance>, invitation: Invitation) => boolean | Promise<boolean>
  onBack?: () => void
  preview?: boolean
  online?: boolean
  registration?: GuestRegistration
}) {
  // After a general-link registration the same page becomes the guest's personal
  // invitation in place: no reload, no remount, the envelope and scroll position stay.
  const [registered, setRegistered] = useState<Invitation | null>(null)
  const invitation = registered ?? initialInvitation
  const registration = registered ? undefined : pendingRegistration
  const [name, setName] = useState("")
  const [partySize, setPartySize] = useState(1)
  const guest = registration ? { ...invitation.guest, capacity: partySize } : invitation.guest
  const [responses, setResponses] = useState<Record<string, Attendance>>(guest.responses)
  const [saved, setSaved] = useState(!registration && invitation.events.every((event) => Boolean(invitation.guest.responses[event.id])))
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState("")
  const [animated, setAnimated] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const errorRef = useRef<HTMLParagraphElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const choicesRef = useRef<HTMLFieldSetElement>(null)
  const focusChoices = useRef(false)
  const pageRef = useRef<HTMLDivElement>(null)
  const heroRef = useEnvelope(animated)
  useReveal(pageRef)
  const events = invitation.events.toSorted((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
  const mainEvent = events.find((event) => event.id === "dasma") ?? events.at(-1)
  const names = coupleNames(invitation.names)
  useEffect(() => { setAnimated(!prefersReducedMotion()) }, [])
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer) }, [])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  // The success panel replaces the choices where they were: focus it without
  // scrolling, and only nudge it into view if the shorter content moved it off screen.
  useEffect(() => {
    if (confirmed) {
      const panel = successRef.current
      if (!panel) return
      panel.focus({ preventScroll: true })
      // Keep the panel and the saved button below it on screen, panel top first.
      const top = panel.getBoundingClientRect().top
      const bottom = (submitRef.current ?? panel).getBoundingClientRect().bottom
      const margin = 16
      const delta = top < margin ? top - margin : bottom > window.innerHeight - margin ? Math.min(bottom - window.innerHeight + margin, top - margin) : 0
      if (delta) window.scrollBy({ top: delta, behavior: prefersReducedMotion() ? "instant" : "smooth" })
    } else if (focusChoices.current) {
      focusChoices.current = false
      const choices = choicesRef.current
      const target = choices?.querySelector<HTMLButtonElement>("button.is-selected") ?? choices?.querySelector<HTMLButtonElement>("button")
      target?.focus({ preventScroll: true })
      if (target && target.getBoundingClientRect().top < 0) target.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "instant" : "smooth" })
    }
  }, [confirmed])
  async function save() {
    if (busy) return
    if (registration && !name.trim()) { setError("Shkruaj emrin tënd ose të familjes."); return }
    if (events.some((event) => !responses[event.id])) {
      setError("Zgjidh nëse do të marrësh pjesë në secilin event.")
      return
    }
    setBusy(true)
    try {
      const result = registration ? await registration.onRegister(name.trim(), partySize, responses) : await onRespond(responses, invitation)
      if (result) {
        if (typeof result === "object") {
          setRegistered(result)
          // Show what was stored (the server may cap counts to the reserved seats).
          if (result.events.every((event) => result.guest.responses[event.id])) setResponses(result.guest.responses)
        }
        setSaved(true); setConfirmed(true); setError(""); setCopied("")
      } else setError(online ? "Përgjigjja nuk u ruajt në server. Provo përsëri." : "Përgjigjja nuk u ruajt. Lejo ruajtjen në shfletues dhe provo përsëri.")
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Përgjigjja nuk u ruajt. Provo përsëri.") }
    finally { setBusy(false) }
  }
  function editAnswer() {
    focusChoices.current = true
    setConfirmed(false)
  }
  async function copyPersonalLink() {
    setCopied(await copyText(window.location.href) ? "Linku yt personal u kopjua." : "Kopjimi nuk funksionoi. Ruaje adresën e kësaj faqeje.")
  }
  function choose(eventId: string, response: Attendance) {
    setSaved(false); setError("")
    setResponses({ ...responses, [eventId]: response })
  }
  function openEnvelope() {
    const hero = heroRef.current
    if (hero) window.scrollTo({ top: hero.offsetTop + hero.offsetHeight - window.innerHeight, behavior: "smooth" })
  }
  const main = mainEvent && dayParts(mainEvent.date)
  const countdown = mainEvent && timeUntil(mainEvent, now)
  const addressee = registration ? "Ju dhe familja juaj" : guest.name

  return <div ref={pageRef} className={`inv-public simple-invitation ftesa-page public-theme-${invitation.design}`}>
    <header className="ftesa-top">
      <span className="ftesa-brand">ftesa.</span>
      <div>{preview && <span className="ftesa-preview">Parapamje</span>}{onBack && <button className="simple-back" onClick={onBack}><ArrowLeft size={16} />Kthehu në dashboard</button>}</div>
    </header>

    <section ref={heroRef} className={`ftesa-hero${animated ? " is-animated" : ""}`} aria-label="Ftesa juaj e personalizuar">
      <div className="ftesa-stage">
        <div className="ftesa-flora ftesa-flora-a" aria-hidden="true" /><div className="ftesa-flora ftesa-flora-b" aria-hidden="true" />
        {animated && <div className="ftesa-env ftesa-env-back" aria-hidden="true" />}
        <div className="ftesa-card-slot"><InvitationCard wedding={invitation} guest={registration ? undefined : guest} hero /></div>
        {animated && <>
          <div className="ftesa-env ftesa-env-front" aria-hidden="true"><span className="ftesa-env-for">Për</span><span className="ftesa-env-name">{addressee}</span></div>
          <div className="ftesa-env ftesa-env-flap" aria-hidden="true" />
          <div className="ftesa-env ftesa-env-ui"><button className="ftesa-seal" onClick={openEnvelope} aria-label="Hap ftesën">{names.initials}</button><span className="ftesa-hint" aria-hidden="true">Rrëshqit poshtë për ta hapur<i /></span></div>
        </>}
      </div>
    </section>

    <main className="ftesa-main">
      {main && countdown && !countdown.passed && <section className="ftesa-date" data-reveal aria-label={`${mainEvent.name}, ${formatDate(mainEvent.date)}`}>
        <span className="ftesa-eyebrow">{main.weekday} · {mainEvent.name}</span>
        <p className="ftesa-bigdate"><span>{main.day}</span><span className="ftesa-bigdate-month">{main.month}</span><span>{main.year}</span></p>
        <p className="ftesa-countdown"><strong>{countdown.days}</strong> ditë <strong>{countdown.hours}</strong> orë <strong>{countdown.minutes}</strong> minuta</p>
      </section>}

      <section className="ftesa-program" aria-labelledby="simple-events-title">
        <header data-reveal><span className="ftesa-eyebrow">Programi</span><h2 id="simple-events-title">Ku dhe kur</h2></header>
        <ol className="ftesa-timeline">{events.map((event, index) => {
          const day = dayParts(event.date)
          return <li key={event.id} data-reveal style={{ "--i": index } as CSSProperties}>
            <div className="ftesa-when"><strong>{day.day}</strong><span>{day.short}</span><small>{day.weekday}</small></div>
            <article className="ftesa-event">
              <h3>{event.name}</h3>
              <p className="ftesa-event-time">{event.time}<span aria-hidden="true">·</span>{event.venue || "Lokacioni do të përditësohet"}</p>
              {event.address && <p className="ftesa-event-address">{event.address}</p>}
              <div className="ftesa-event-actions">{(event.mapUrl || event.venue || event.address) && <a href={mapLink(event)} target="_blank" rel="noreferrer">Shiko lokacionin<ArrowUpRight size={14} /></a>}<button onClick={() => downloadCalendar(invitation, event)} aria-label={`Shto ${event.name} në kalendar`}><CalendarPlus size={14} />Shto në kalendar</button></div>
            </article>
          </li>
        })}</ol>
      </section>

      <section className="ftesa-rsvp" aria-labelledby="simple-rsvp-title" aria-busy={busy} data-reveal>
        <span className="ftesa-eyebrow">Përgjigjja juaj</span>
        <h2 id="simple-rsvp-title">Konfirmo pjesëmarrjen</h2>
        {confirmed ? <div ref={successRef} className="ftesa-success" role="status" tabIndex={-1} aria-labelledby="ftesa-success-title">
          <span className="ftesa-success-icon" aria-hidden="true"><Check size={22} strokeWidth={2.4} /></span>
          <h3 id="ftesa-success-title">Faleminderit! <span>Përgjigjja juaj u ruajt.</span></h3>
          <ul className="ftesa-success-list" aria-label="Përgjigjja juaj për secilin event">{events.map((event) => <li key={event.id}>
            <span>{event.name}</span>
            <strong className={responses[event.id]?.status === "declined" ? "is-declined" : ""}>{answerLabel(responses[event.id], guest.capacity)}</strong>
          </li>)}</ul>
          <div className="ftesa-success-actions">
            <button type="button" className="ftesa-success-edit" onClick={editAnswer}><PencilLine size={15} />Ndrysho përgjigjen</button>
            {registered && <button type="button" className="ftesa-success-copy" onClick={() => void copyPersonalLink()}><Copy size={15} />Kopjo linkun tënd</button>}
          </div>
          {registered && <p className="ftesa-success-hint">{copied || "Kjo faqe tani është ftesa juaj personale. Ruajeni linkun për ta ndryshuar përgjigjen më vonë."}</p>}
        </div> : <>
          <p className="ftesa-rsvp-intro">{registration ? "Shkruaj emrin, numrin e personave dhe përgjigju për eventet më poshtë." : guest.capacity === 1 ? "Ke 1 vend të rezervuar." : `Keni ${guest.capacity} vende të rezervuara.`}{guest.kind === "couple" ? " Për ju dhe personin që ju shoqëron." : ""} Përgjigjuni për secilin event.</p>
          {registration && <div className="general-registration-fields"><label>Emri yt ose i familjes<input autoComplete="name" maxLength={100} required value={name} onChange={(event) => { setName(event.target.value); setError("") }} placeholder="p.sh. Familja Gashi" disabled={busy} /></label><label>Numri i personave<select aria-label="Numri i personave" value={partySize} disabled={busy} onChange={(event) => { const count = Number(event.target.value); setPartySize(count); setResponses(Object.fromEntries(Object.entries(responses).map(([id, response]) => [id, response.status === "accepted" ? { ...response, count } : response]))) }}>{Array.from({ length: registration.capacity }, (_, i) => <option value={i + 1} key={i}>{i + 1}</option>)}</select></label></div>}
          <fieldset ref={choicesRef} disabled={busy} className="simple-response-events">
            <legend className="simple-sr-only">Pjesëmarrja juaj në eventet e ftesës</legend>
            {events.map((event) => <section className="ftesa-answer" key={event.id}>
              <div className="ftesa-answer-head"><h3><span className="simple-sr-only">Pjesëmarrja · </span>{event.name}</h3><p>{formatDate(event.date, true)} · {event.time}</p></div>
              <div className="simple-response-choices" role="group" aria-label={`Pjesëmarrja në ${event.name}`}>
                <button type="button" className={responses[event.id]?.status === "accepted" ? "is-selected" : ""} aria-pressed={responses[event.id]?.status === "accepted"} onClick={() => choose(event.id, { status: "accepted", count: responses[event.id]?.status === "accepted" ? responses[event.id].count : guest.capacity })}><Check size={16} />{guest.capacity === 1 ? "Do të vij" : "Do të vijmë"}</button>
                <button type="button" className={responses[event.id]?.status === "declined" ? "is-selected" : ""} aria-pressed={responses[event.id]?.status === "declined"} onClick={() => choose(event.id, { status: "declined", count: 0 })}>{guest.capacity === 1 ? "S’mund të vij" : "S’mund të vijmë"}</button>
              </div>
              {responses[event.id]?.status === "accepted" && guest.capacity > 1 && <label className="simple-attendance-count">Sa persona do të vini?<select aria-label={`Numri i personave për ${event.name}`} value={Math.min(responses[event.id].count, guest.capacity)} onChange={(e) => choose(event.id, { status: "accepted", count: Number(e.target.value) })}>{Array.from({ length: guest.capacity }, (_, i) => <option key={i} value={i + 1}>{i + 1} {i === 0 ? "person" : "persona"}</option>)}</select></label>}
            </section>)}
          </fieldset>
          {error && <p className="simple-response-error" role="alert" ref={errorRef} tabIndex={-1}>{error}</p>}
          {saved && !busy && <p className="simple-response-thanks">Përgjigjja juaj është ruajtur. Mund ta ndryshoni më lart.</p>}
        </>}
        <button ref={submitRef} type="button" className={`simple-submit${saved ? " is-saved" : ""}${busy ? " is-busy" : ""}`} onClick={() => void save()} disabled={busy || saved}>{busy ? <><LoaderCircle size={17} className="simple-spinner" aria-hidden="true" />Duke ruajtur…</> : saved ? <><CheckCircle2 size={17} />Përgjigjja u ruajt</> : "Konfirmo pjesëmarrjen"}</button>
        <p className="simple-response-note">{registration ? online ? "Pas konfirmimit, kjo faqe bëhet ftesa juaj personale dhe mund ta ndryshoni përgjigjen kur të doni." : "Demo: përgjigjja ruhet vetëm në këtë shfletues. Nuk dërgohet te organizatori në pajisje tjetër." : online ? "Mund ta ndryshoni përgjigjen duke e hapur përsëri këtë link." : "Demo: përgjigjja ruhet vetëm në këtë shfletues. Nuk dërgohet te organizatori në pajisje tjetër."}</p>
      </section>
    </main>

    <footer className="ftesa-foot" data-reveal><span className="ftesa-foot-mono" aria-hidden="true">{names.initials}</span><span className="ftesa-foot-names">{invitation.names}</span><small>{preview ? "Pamje paraprake e ftesës" : online ? "Ftesë personale" : "Ftesë demonstruese"} · ftesa. nga Cube Designers</small></footer>
  </div>
}
