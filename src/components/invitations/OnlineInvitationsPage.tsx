import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowRight, Heart, LogOut, RefreshCw, ShieldCheck } from "lucide-react"
import { apiRequest } from "@/lib/api"
import InvitationsPage from "./InvitationsPage"
import GuestInvitation from "./GuestInvitation"
import GeneralInvitationPage from "./GeneralInvitationPage"
import InvitationsLanding from "./InvitationsLanding"
import { invitationStatusLabels, type InvitationDashboard, type OnlineController } from "./online-types"
import { readGeneralInvitation, isInvitation, isWedding, invitationLink, STORAGE_KEY, type Attendance, type Invitation, type Wedding, type GeneralInvitation } from "./model"
import "./invitations.css"
import "./flat.css"

type Availability = { available: boolean; price: number | null; administrationConfigured: boolean }
type Mode = "loading" | "demo" | "account" | "guest" | "dashboard" | "general" | "error"
const priceLabel = (value: number | null) => value === null ? "Çmimi me ofertë" : `${value.toFixed(2)} €`

function AccountForm({ availability, error: parentError, onLogin }: {
  availability: Availability | null; error: string
  onLogin: () => Promise<void>
}) {
  const [login, setLogin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [emailFallback, setEmailFallback] = useState("")
  function navigateEntry(view: "overview" | "apply" | "login") {
    setLogin(view === "login")
    setError("")
    setEmailFallback("")
    const url = new URL(window.location.href)
    if (view === "overview") url.searchParams.delete("view")
    else url.searchParams.set("view", view)
    url.hash = view === "login" ? "kycu" : view === "apply" ? "porosit" : "perfshin"
    window.history.replaceState(null, "", url)
    window.requestAnimationFrame(() => {
      if (view === "login") {
        window.scrollTo({ top: 0, behavior: "instant" })
        document.getElementById("inv-account-title")?.focus({ preventScroll: true })
      } else document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: "instant", block: "start" })
    })
  }
  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get("view")
    if (view === "login" || window.location.hash === "#kycu") navigateEntry("login")
    else if (view === "apply") navigateEntry("apply")
  }, [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setError("")
    setEmailFallback("")
    const fields = new FormData(event.currentTarget)
    if (login) {
      setBusy(true)
      const result = await apiRequest<InvitationDashboard>("/api/invitation-session", {
        method: "POST", body: { reference: fields.get("reference"), password: fields.get("password") },
      })
      if (result.ok) await onLogin()
      else setError(result.error)
      setBusy(false)
      return
    }
    const firstName = String(fields.get("firstName") ?? "").trim()
    const lastName = String(fields.get("lastName") ?? "").trim()
    const email = String(fields.get("email") ?? "").trim()
    if (!firstName || !lastName || !email) {
      setError("Plotësoni emrin, mbiemrin dhe emailin.")
      return
    }
    setBusy(true)
    const name = `${firstName} ${lastName}`
    const result = await apiRequest<{ ok: boolean; id: number }>("/api/submissions", {
      method: "POST",
      body: {
        kind: "project", name, email, services: ["Ftesa online"],
        message: "Kërkesë për ftesa online. Ju lutem më kontaktoni me email për detajet dhe hapat e radhës.",
        website: fields.get("website"),
      },
    })
    if (result.ok) {
      setSubmitted(true)
      window.requestAnimationFrame(() => document.getElementById("inv-account-title")?.focus({ preventScroll: true }))
    } else {
      setError("Kërkesa nuk u dërgua. Provo përsëri ose dërgoje me email.")
      setEmailFallback(`mailto:info@cube-designers.com?subject=${encodeURIComponent("Kërkesë për ftesa online")}&body=${encodeURIComponent(`Emri: ${name}\nEmaili: ${email}\n\nDëshiroj të di më shumë për ftesat online.`)}`)
    }
    setBusy(false)
  }
  const available = availability?.available === true
  return <InvitationsLanding login={login} packagePrice={priceLabel(availability?.price ?? null)} onCreate={() => navigateEntry("apply")} onLogin={() => navigateEntry("login")} onExplore={() => navigateEntry("overview")}>
    <section className="inv-checkout inv-online-entry ftl-account" aria-labelledby="inv-account-title">
      <section className="inv-checkout-card inv-online-form-card">
        <h2 id="inv-account-title" tabIndex={-1}>{login ? "Kyçu te ftesat tuaja" : submitted ? "Kërkesa u dërgua." : "Apliko për ftesat"}</h2>
        {!login && submitted ? <p role="status">Faleminderit! Do t’ju kontaktojmë në email për detajet e ftesave.</p> : <>
          <p>{login ? "Kyçu me referencën e porosisë dhe fjalëkalimin që ke zgjedhur." : "Lini kontaktin. Për detajet kujdesemi bashkë."}</p>
          {login && !available && <p className="inv-form-error" role="status">{availability === null ? "Duke kontrolluar shërbimin…" : <>Kyçja online përkohësisht nuk është e disponueshme. <a href="mailto:info@cube-designers.com">Na shkruani</a>.</>}</p>}
          <form className="inv-form" onSubmit={submit} key={login ? "login" : "apply"}>
            <fieldset disabled={busy}>
              {login ? <>
                <label>Referenca e porosisë<input name="reference" required maxLength={30} placeholder="FTE-…" autoComplete="username" /></label>
                <label>Fjalëkalimi<input name="password" type="password" minLength={12} maxLength={200} required autoComplete="current-password" /></label>
              </> : <>
                <div className="inv-form-row">
                  <label>Emri<input name="firstName" required maxLength={80} autoComplete="given-name" /></label>
                  <label>Mbiemri<input name="lastName" required maxLength={80} autoComplete="family-name" /></label>
                </div>
                <label>Emaili<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
                <label className="inv-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
              </>}
            </fieldset>
            {(error || (login && parentError)) && <p className="inv-form-error" role="alert">{error || parentError}{emailFallback && <> <a href={emailFallback}>Përgatit emailin</a>. Emailin e dërgoni nga aplikacioni juaj.</>}</p>}
            <button type="submit" className="inv-button inv-button-primary inv-full-width" disabled={busy || (login && !available)}>{busy ? "Duke dërguar…" : login ? "Kyçu në dashboard" : "Dërgo kërkesën"}<ArrowRight size={17} /></button>
          </form>
        </>}
      </section>
    </section>
  </InvitationsLanding>
}

export default function OnlineInvitationsPage() {
  const [mode, setMode] = useState<Mode>("account")
  const [data, setData] = useState<InvitationDashboard | null>(null)
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [error, setError] = useState("")
  const [token, setToken] = useState("")
  const [general, setGeneral] = useState<GeneralInvitation | null>(null)
  const registrationId = useRef("")
  const generalHash = useRef("")
  const dataRef = useRef<InvitationDashboard | null>(null)
  const writePending = useRef(false)
  const endpoint = useRef("/api/invitations")

  const accept = useCallback((next: InvitationDashboard) => {
    if (dataRef.current?.order.id === next.order.id && dataRef.current.order.revision > next.order.revision) return
    dataRef.current = next; setData(next); setMode("dashboard"); setError("")
  }, [])
  const refresh = useCallback(async () => {
    const result = await apiRequest<InvitationDashboard>(endpoint.current)
    if (result.ok) accept(result.data)
    else if (result.status === 401) { dataRef.current = null; setData(null); setMode("account") }
    else setError(result.error)
  }, [accept])

  useEffect(() => {
    let active = true
    async function boot() {
      const query = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.slice(1))
      if (query.get("demo") === "1" || hash.has("ftese") || hash.has("teftuar-demo")) {
        const administrator = await apiRequest<{ authenticated: boolean }>("/api/admin/session")
        if (!active) return
        if (!administrator.ok || !administrator.data.authenticated) {
          query.delete("demo"); query.delete("preview"); hash.delete("ftese"); hash.delete("teftuar-demo")
          window.history.replaceState(null, "", "/ftesa")
        }
      }
      if (hash.has("teftuar") || hash.has("teftuar-demo")) {
        const generalToken = hash.get("teftuar") ?? ""
        setToken(generalToken); setMode("loading")
        registrationId.current = crypto.randomUUID()
        generalHash.current = window.location.hash
        if (hash.has("teftuar-demo")) {
          const value = readGeneralInvitation(window.location.hash)
          if (value) { setGeneral(value); setMode("general") } else { setError("Linku është i paplotë ose i pavlefshëm."); setMode("error") }
          return
        }
        const result = await apiRequest<GeneralInvitation>("/api/invitation-public?general=1", { headers: { authorization: `Bearer ${generalToken}` } })
        if (!active) return
        if (result.ok) { setGeneral(result.data); setMode("general") } else { setError(result.error); setMode("error") }
        return
      }
      if (query.get("demo") === "1" || hash.has("ftese")) { setMode("demo"); return }
      if (hash.has("ftesa")) {
        const guestToken = hash.get("ftesa") ?? ""
        setToken(guestToken); setMode("loading")
        const result = await apiRequest<Invitation>("/api/invitation-public", { headers: { authorization: `Bearer ${guestToken}` } })
        if (!active) return
        if (result.ok) { setInvitation(result.data); setMode("guest") }
        else { setError(result.error); setMode("error") }
        return
      }
      endpoint.current = `/api/invitations${query.has("order") ? `?order=${encodeURIComponent(query.get("order")!)}` : ""}`
      const results = await Promise.all([
        apiRequest<Availability>("/api/invitations?action=status"),
        apiRequest<InvitationDashboard>(endpoint.current),
      ])
      if (!active) return
      setAvailability(results[0].ok ? results[0].data : { available: false, price: null, administrationConfigured: false })
      const result = results[1]
      if (result.ok) accept(result.data)
      else { setMode("account"); if (result.status !== 401 || query.has("order")) setError(query.has("order") && result.status === 401 ? "Kyçu në /admin për ta hapur këtë porosi si administrator." : result.error) }
    }
    void boot()
    window.addEventListener("hashchange", boot)
    return () => { active = false; window.removeEventListener("hashchange", boot) }
  }, [accept])

  useEffect(() => {
    if (mode !== "dashboard") return
    const poll = () => { if (!document.hidden && !writePending.current) void refresh() }
    const timer = window.setInterval(poll, 12000)
    window.addEventListener("focus", poll)
    return () => { window.clearInterval(timer); window.removeEventListener("focus", poll) }
  }, [mode, refresh])

  async function logout() {
    if (data?.administrator) { window.location.href = "/admin"; return }
    const result = await apiRequest("/api/invitation-session", { method: "DELETE" })
    if (!result.ok) { setError(result.error); return }
    dataRef.current = null; setData(null); setMode("account"); setError("")
  }
  async function respond(guestToken: string, responses: Record<string, Attendance>) {
    const result = await apiRequest("/api/invitation-public", { method: "POST", headers: { authorization: `Bearer ${guestToken}` }, body: { responses } })
    if (!result.ok) throw new Error(result.error)
    if (dataRef.current) await refresh()
    return true
  }

  // Demo general link: the registration lives in this browser only. Saving again
  // (an edit after confirming) reuses the same guest id and token.
  function saveDemoRegistration(name: string, capacity: number, responses: Record<string, Attendance>) {
    if (!general) throw new Error("Ftesa nuk u gjet.")
    const storageKey = `cube-general-rsvp-${general.demoToken ?? generalHash.current}`
    let previous: Invitation | null = null
    try { const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null"); if (isInvitation(stored)) previous = stored } catch { /* A new demo registration still works. */ }
    const guest: Invitation["guest"] = { id: previous?.guest.id ?? crypto.randomUUID(), token: previous?.guest.token ?? crypto.randomUUID(), name, capacity, kind: capacity === 1 ? "individual" : capacity === 2 ? "couple" : "family", events: general.events.map((event) => event.id), message: "", responses }
    const personal: Invitation = { version: 1, names: general.names, message: general.message, design: general.design, events: general.events, guest }
    localStorage.setItem(storageKey, JSON.stringify(personal))
    localStorage.setItem(`cube-ftesa-rsvp-${guest.token}`, JSON.stringify(responses))
    let stored: unknown = null
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") } catch { /* No owner dashboard in this browser. */ }
    if (isWedding(stored) && stored.generalLink?.token === general.demoToken && stored.generalLink?.enabled) {
      const next = { ...stored, guests: [...stored.guests.filter((item) => item.id !== guest.id), guest] }
      if (!isWedding(next)) throw new Error("Lista e mysafirëve nuk mund të përditësohet.")
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
    return personal
  }

  // The general page turns into the guest's personal invitation in place: only the
  // address changes (replaceState fires no hashchange), so nothing reloads or remounts.
  async function register(name: string, capacity: number, responses: Record<string, Attendance>): Promise<Invitation | false> {
    if (!general) return false
    if (token) {
      const result = await apiRequest<{ invitation: Invitation }>("/api/invitation-public?general=1", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: { name, capacity, responses, requestId: registrationId.current } })
      if (!result.ok) throw new Error(result.error)
      history.replaceState(null, "", `/ftesa#ftesa=${result.data.invitation.guest.token}`)
      return result.data.invitation
    }
    const personal = saveDemoRegistration(name, capacity, responses)
    const snapshot: Wedding = { ...personal, guests: [personal.guest], demoActivated: false }
    history.replaceState(null, "", invitationLink(snapshot, personal.guest, window.location.origin))
    return personal
  }
  async function respondRegistered(personal: Invitation, responses: Record<string, Attendance>) {
    if (token) return respond(personal.guest.token, responses)
    saveDemoRegistration(personal.guest.name, personal.guest.capacity, responses)
    return true
  }

  if (mode === "general" && general) return <GeneralInvitationPage invitation={general} online={Boolean(token)} onRegister={register} onRespond={respondRegistered} />
  if (mode === "demo") return <InvitationsPage />
  if (mode === "loading") return <main className="inv-checkout inv-loading" role="status"><Heart size={30} /><p>Duke hapur ftesat tuaja…</p></main>
  if (mode === "error") return <main className="inv-public inv-invalid"><Heart size={35} /><h1>Kjo ftesë nuk hapet.</h1><p>{error}</p><button className="inv-button inv-button-primary" onClick={() => window.location.reload()}>Provo përsëri</button></main>
  if (mode === "guest" && invitation) return <GuestInvitation key={invitation.guest.token} online invitation={invitation} onRespond={(responses) => respond(token, responses)} />
  if (mode === "account" || !data) return <AccountForm availability={availability} error={error} onLogin={refresh} />

  if (!data.administrator && (data.order.status !== "active" || data.order.payment_status !== "paid")) return <main className="inv-checkout"><a className="inv-brand" href="/ftesa"><Heart size={24} /><span>ftesa.</span></a><section className="inv-checkout-card"><span className="inv-demo-pill">{invitationStatusLabels[data.order.status]}</span><ShieldCheck size={42} className="inv-pending-icon" /><h1>{data.order.status === "pending" ? <>Porosia u ruajt.<br /><em>Hapi tjetër: pagesa.</em></> : <>Porosia juaj<br /><em>{invitationStatusLabels[data.order.status].toLowerCase()}.</em></>}</h1><p>Ruaje referencën dhe fjalëkalimin për t’u kyçur nga çdo pajisje.</p><div className="inv-checkout-summary"><span>Referenca<strong>{data.order.reference}</strong></span><span>Paketa<strong>{priceLabel(data.order.total)}</strong></span></div><p className="inv-pending-note">Pagesa konfirmohet nga ekipi në admin. Pasi të aktivizohet porosia, këtu hapet dashboard-i me dizajnet dhe mysafirët tuaj.</p>{error && <p role="alert" className="inv-form-error">{error}</p>}<button className="inv-button inv-button-primary" onClick={() => void refresh()}><RefreshCw size={16} />Kontrollo aktivizimin</button><button className="inv-text-button" onClick={() => void logout()}>Dil nga llogaria<LogOut size={15} /></button></section></main>

  const controller: OnlineController = {
    data, refresh, logout, respond,
    save: async (wedding: Wedding) => {
      if (writePending.current) throw new Error("Një ndryshim tjetër po ruhet. Provo përsëri.")
      writePending.current = true
      try {
        const result = await apiRequest<InvitationDashboard>(endpoint.current, { method: "PATCH", body: { wedding, revision: dataRef.current!.order.revision } })
        if (!result.ok) { if (result.status === 409 || result.status === 403) await refresh(); throw new Error(result.error) }
        accept(result.data)
        return result.data.wedding
      } finally { writePending.current = false }
    },
  }
  return <><div className="inv-accountbar" role="region" aria-label="Porosia juaj"><span>{data.administrator ? "Admin · " : "Porosia · "}{data.order.reference}</span>{error && <span role="alert">{error}</span>}<button onClick={() => void refresh()}><RefreshCw size={13} />Rifresko</button><button onClick={() => void logout()}><LogOut size={13} />{data.administrator ? "Kthehu në admin" : "Dil"}</button></div><InvitationsPage remote={controller} /></>
}
