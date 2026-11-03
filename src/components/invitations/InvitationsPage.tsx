import { useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowRight, ArrowUpRight, Calculator, Check, CircleHelp, Copy, CreditCard, Flower2, Heart, LayoutDashboard, LogOut, Palette, Plus, ShieldCheck, Trash2, UsersRound, X } from "lucide-react"
import InvitationDialog from "./InvitationDialog"
import GuestInvitation from "./GuestInvitation"
import GuestEditor from "./GuestEditor"
import GuestTable from "./GuestTable"
import WeddingPlanner from "./WeddingPlanner"
import InvitationEditor from "./InvitationEditor"
import OverviewCharts from "./WeddingCharts"
import GeneralLinkDialog from "./GeneralLinkDialog"
import { copyText } from "./copy-link"
import type { WeddingPlan } from "./planning-model"
import { createDemoWedding, MAX_EVENTS, removeEvent, safeLink, sortEvents, exportGuests, invitationLink, isInvitation, isWedding, makeInvitation, readInvitation, STORAGE_KEY, generalInvitationLink, type GeneralLink, type Attendance, type Guest, type Invitation, type Wedding, type WeddingEvent } from "./model"
import type { OnlineController } from "./online-types"
import "./invitations.css"
import "./planning.css"
import "./flat.css"
import "./compact.css"

type Tab = "overview" | "guests" | "designs" | "budget"
const tabs = [
  { id: "overview", label: "Kryefaqja", icon: LayoutDashboard },
  { id: "guests", label: "Mysafirët", icon: UsersRound },
  { id: "designs", label: "Ftesa", icon: Palette },
  { id: "budget", label: "Planifikimi", icon: Calculator },
] as const
const validTabs: Tab[] = ["overview", "guests", "designs", "budget"]
const tabGroup = (tab: Tab) => tab

const pageCopy: Record<Tab, { title: string; emphasis: string; intro: string }> = {
  overview: { title: "Kryefaqja", emphasis: "", intro: "Eventet tuaja dhe kush vjen në secilin." },
  guests: { title: "Mysafirët", emphasis: "", intro: "Menaxho emrat, vendet, eventet dhe linket personale." },
  designs: { title: "Ftesa", emphasis: "", intro: "Zgjidh dizajnin, shkruaj emrat dhe mesazhin. Ftesa ndryshon ndërsa shkruan." },
  budget: { title: "Planifikimi", emphasis: "", intro: "Kontaktet, çmimet, si u morët vesh dhe detyrat. Totali llogaritet vetë." },
}

function EventEditor({ event, isNew, busy, onSave, onDelete, onClose }: { event: WeddingEvent; isNew: boolean; busy: boolean; onSave: (event: WeddingEvent) => void; onDelete: () => Promise<string>; onClose: () => void }) {
  const [draft, setDraft] = useState(event)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState("")
  function submit(e: FormEvent) {
    e.preventDefault()
    let mapUrl = (draft.mapUrl ?? "").trim()
    if (mapUrl && !/^[a-z][a-z0-9+.-]*:/i.test(mapUrl)) mapUrl = `https://${mapUrl}`
    if (!safeLink(mapUrl)) { setError("Linku i lokacionit duhet të jetë një link interneti, p.sh. https://maps.app.goo.gl/…"); return }
    const { mapUrl: _old, ...rest } = draft
    onSave({ ...rest, name: draft.name.trim(), venue: draft.venue.trim(), address: draft.address.trim(), ...(mapUrl ? { mapUrl } : {}) })
  }
  async function remove() {
    if (!confirming) { setConfirming(true); return }
    setError(await onDelete())
  }
  return <InvitationDialog title={isNew ? "Shto event" : `Detajet · ${event.name}`} onClose={onClose}><form className="inv-form" onSubmit={submit}><p className="inv-form-intro">Këto detaje shfaqen vetëm te mysafirët që i fton në këtë event.</p><fieldset disabled={busy}><label>Emri i eventit<input required maxLength={100} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="p.sh. Kanagjegji, Synetia, Pritja" pattern=".*\S.*" /></label><div className="inv-form-row"><label>Data<input type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label><label>Ora<input type="time" required value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></label></div><fieldset className="inv-location-fields"><legend>Lokacioni</legend><label>Emri i lokacionit<input required maxLength={150} value={draft.venue} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} placeholder="p.sh. Emerald Hotel, Shtëpia e nuses" pattern=".*\S.*" /></label><label>Linku i lokacionit<input inputMode="url" autoCapitalize="off" autoCorrect="off" maxLength={500} value={draft.mapUrl ?? ""} onChange={(e) => setDraft({ ...draft, mapUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" /><small>Hap Google Maps, shtyp “Share / Shpërndaj” dhe ngjite linkun këtu. Mysafirët e hapin me “Shiko lokacionin”.</small></label><label>Adresa <small>(opsionale)</small><input maxLength={250} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Qyteti, rruga" /></label></fieldset></fieldset><div className="inv-form-actions">{error && <p className="inv-form-error inv-actions-message" role="alert">{error}</p>}{confirming && !error && <p className="inv-form-error inv-actions-message" role="status">Eventi hiqet nga ftesat, mysafirët dhe planifikimi. Përgjigjet për këtë event fshihen. Shtyp përsëri “Hiqe eventin” për ta konfirmuar.</p>}{!isNew && <button type="button" className="inv-button inv-button-danger inv-event-delete" disabled={busy} onClick={() => void remove()}><Trash2 size={16} />Hiqe eventin</button>}<button type="button" className="inv-button inv-button-outline" onClick={onClose}>Anulo</button><button className="inv-button inv-button-primary" type="submit" disabled={busy}><Check size={17} />{isNew ? "Shto eventin" : "Ruaj eventin"}</button></div></form></InvitationDialog>
}

function DemoCheckout({ wedding, onActivate, onBack, error }: { wedding: Wedding; onActivate: () => void; onBack: () => void; error: string }) {
  const [agree, setAgree] = useState(false)
  return <main className="inv-checkout"><a className="inv-brand" href="/ftesa"><Heart size={24} /><span>ftesa<span className="inv-brand-dot">.</span></span></a><div className="inv-checkout-card"><span className="inv-demo-pill">Simulim · pa pagesë reale</span><div className="inv-package-icon"><CreditCard size={28} /></div><h1>Një hap më afër<br /><em>ditës suaj.</em></h1><p>Kështu hapet dashboard-i pasi përfundon pagesa.</p><div className="inv-checkout-summary"><span>Paketa e ftesave<strong>{wedding.names}</strong></span><span>DEMO<strong>Pa tarifim</strong></span></div><ul><li><Check size={16} />Zgjedhja e dizajnit</li><li><Check size={16} />Mysafirë, familje dhe +1</li><li><Check size={16} />Ftesa për të tre eventet</li><li><Check size={16} />Linke personale dhe konfirmime demo</li></ul><label className="inv-checkout-agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />E kuptoj që kjo është pagesë demonstruese dhe nuk bëhet asnjë transaksion.</label>{error && <p className="inv-form-error" role="alert">{error}</p>}<button className="inv-button inv-button-primary" disabled={!agree} onClick={onActivate}>Përfundo pagesën demo<ArrowRight size={18} /></button><button className="inv-text-button" onClick={onBack}>Kthehu në dashboard</button><p className="inv-demo-note"><ShieldCheck size={14} />Nuk kërkohen të dhëna kartele.</p></div></main>
}

export default function InvitationsPage({ remote }: { remote?: OnlineController } = {}) {
  const [wedding, setWedding] = useState<Wedding>(() => remote?.data.wedding ?? createDemoWedding())
  const savingRef = useRef(false)
  const navRef = useRef<HTMLElement>(null)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<Tab>("overview")
  const [editor, setEditor] = useState<Guest | "new" | null>(null)
  const [guestFilter, setGuestFilter] = useState({ event: "", status: "" })
  const [editingEvent, setEditingEvent] = useState<{ event: WeddingEvent; isNew: boolean } | null>(null)
  const [deleting, setDeleting] = useState<Guest | null>(null)
  const [generalEditor, setGeneralEditor] = useState(false)
  const [preview, setPreview] = useState<Guest | null>(null)
  const [publicInvite, setPublicInvite] = useState<Invitation | null>(null)
  const [invalidLink, setInvalidLink] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const [help, setHelp] = useState(false)
  const [toast, setToast] = useState("")
  const [storageWarning, setStorageWarning] = useState("")

  useEffect(() => {
    const revealActiveTab = () => {
      if (window.matchMedia("(max-width: 700px)").matches) navRef.current?.querySelector<HTMLButtonElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" })
    }
    revealActiveTab()
    window.addEventListener("resize", revealActiveTab)
    return () => window.removeEventListener("resize", revealActiveTab)
  }, [tab])

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab")
    if (validTabs.includes(requestedTab as Tab)) setTab(requestedTab as Tab)
    else if (requestedTab === "contacts" || requestedTab === "checklist") setTab("budget")
    else if (requestedTab === "settings") setTab("designs")
    else if (requestedTab === "events") setTab("overview")
    if (remote) { setLoaded(true); return }
    let storedWedding: Wedding | undefined
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) { const parsed: unknown = JSON.parse(raw); if (isWedding(parsed)) { storedWedding = parsed; setWedding(parsed) } else setStorageWarning("Të dhënat e ruajtura nuk lexohen. Po shfaqet demoja fillestare.") }
    } catch { setStorageWarning("Ruajtja në shfletues nuk është e disponueshme. Ndryshimet mund të humbin pas rifreskimit.") }
    if (new URLSearchParams(window.location.search).get("preview") === "1") setPreview((storedWedding ?? createDemoWedding()).guests[0] ?? null)
    function readHash() {
      const hash = window.location.hash
      const hasInvite = new URLSearchParams(hash.slice(1)).has("ftese")
      const invite = hasInvite ? readInvitation(hash) : null
      if (invite) {
        // Nothing stored yet: the dashboard shows the built-in demo, so its answers apply here too.
        let owner: Wedding | undefined = storedWedding
        try { const raw = localStorage.getItem(STORAGE_KEY); const parsed: unknown = raw === null ? createDemoWedding() : JSON.parse(raw); if (isWedding(parsed)) owner = parsed } catch { owner ??= createDemoWedding() }
        const ownerGuest = owner?.guests.find((g) => g.id === invite.guest.id && g.token === invite.guest.token)
        if (ownerGuest) invite.guest.responses = Object.fromEntries(Object.entries(ownerGuest.responses).filter(([id]) => invite.guest.events.includes(id)))
        try {
          const responseKey = `cube-ftesa-rsvp-${invite.guest.token}`
          const saved = localStorage.getItem(responseKey)
          if (saved) {
            const candidate = { ...invite, guest: { ...invite.guest, responses: JSON.parse(saved) } }
            if (isInvitation(candidate)) invite.guest.responses = candidate.guest.responses
          }
        } catch { /* The invitation still opens without browser storage. */ }
      }
      setPublicInvite(invite); setInvalidLink(hasInvite && !invite); setCheckout(hash === "#pagesa")
    }
    readHash()
    setLoaded(true)
    window.addEventListener("hashchange", readHash)
    function sync(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try { const next: unknown = JSON.parse(event.newValue); if (isWedding(next)) { storedWedding = next; setWedding(next) } } catch { /* Ignore invalid data from another tab. */ }
    }
    window.addEventListener("storage", sync)
    return () => { window.removeEventListener("hashchange", readHash); window.removeEventListener("storage", sync) }
  }, [])
  useEffect(() => { if (remote) setWedding(remote.data.wedding) }, [remote?.data.wedding])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 4500); return () => window.clearTimeout(timer) }, [toast])
  async function persist(next: Wedding) {
    if (!loaded || savingRef.current) return false
    savingRef.current = true
    setSaving(true)
    try {
      const saved = remote ? await remote.save(next) : next
      if (!remote) localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
      setWedding(saved)
      setStorageWarning("")
      return saved
    } catch (reason) {
      setStorageWarning(remote && reason instanceof Error ? reason.message : "Ndryshimet nuk u ruajtën. Lejo ruajtjen në shfletues dhe provo përsëri.")
      return false
    } finally { savingRef.current = false; setSaving(false) }
  }
  async function update(next: Wedding, message: string) {
    const saved = await persist(next)
    if (saved) setToast(message)
    return Boolean(saved)
  }
  async function saveGuest(guest: Guest) {
    const exists = wedding.guests.some((g) => g.id === guest.id)
    const next = { ...wedding, guests: exists ? wedding.guests.map((item) => item.id === guest.id ? guest : item) : [...wedding.guests, guest] }
    const saved = await persist(next)
    if (saved) {
      setEditor(null)
      const current = saved.guests.find((item) => item.id === guest.id)!
      const url = invitationLink(saved, current, window.location.origin, Boolean(remote))
      await copyLink(url, "Mysafiri u ruajt. Linku")
    }
  }

  async function saveResponse(invite: Invitation, responses: Record<string, Attendance>) {
    if (remote) return remote.respond(invite.guest.token, responses)
    try {
      const latest = localStorage.getItem(STORAGE_KEY)
      const parsed: unknown = latest ? JSON.parse(latest) : wedding
      const owner = isWedding(parsed) ? parsed : wedding
      const guest = owner.guests.find((g) => g.id === invite.guest.id && g.token === invite.guest.token)
      if (guest) {
        const compatible = Object.fromEntries(Object.entries(responses).filter(([id]) => guest.events.includes(id)).map(([id, r]) => [id, { ...r, count: Math.min(r.count, guest.capacity) }]))
        if (!await persist({ ...owner, guests: owner.guests.map((g) => g.id === guest.id ? { ...g, responses: { ...g.responses, ...compatible } } : g) })) return false
      }
      localStorage.setItem(`cube-ftesa-rsvp-${invite.guest.token}`, JSON.stringify(responses))
      return true
    } catch { return false }
  }
  async function copyLink(url: string, label: string) {
    const success = await copyText(url)
    setToast(success ? `${label} u kopjua.` : "Shfletuesi e bllokoi kopjimin. Lejo clipboard dhe provo përsëri.")
    return success
  }
  async function copyGuest(guest: Guest) {
    const url = invitationLink(wedding, guest, window.location.origin, Boolean(remote))
    await copyLink(url, "Linku personal")
  }
  async function copyAll(guests: Guest[]) {
    const text = guests.map((guest) => `${guest.name}\n${invitationLink(wedding, guest, window.location.origin, Boolean(remote))}`).join("\n\n")
    await copyLink(text, `${guests.length} linke personale`)
  }
  async function saveGeneral(link: GeneralLink) {
    const saved = await persist({ ...wedding, generalLink: link })
    if (!saved) return false
    if (!link.enabled) { setToast("Linku i përgjithshëm u çaktivizua."); return true }
    const url = generalInvitationLink(saved, window.location.origin, Boolean(remote))
    await copyLink(url, "Linku për të gjithë")
    return true
  }
  async function copyGeneral() {
    const mainEvent = wedding.events.find((e) => e.id === "dasma") ?? wedding.events[0]
    const url = generalInvitationLink(wedding, window.location.origin, Boolean(remote))
    if (url) await copyLink(url, "Linku për të gjithë")
    else await saveGeneral({ enabled: true, token: wedding.generalLink?.token ?? Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join(""), events: wedding.generalLink?.events ?? [mainEvent.id], capacity: wedding.generalLink?.capacity ?? 6 })
  }
  function exportCsv(guests = wedding.guests) {
    const blob = new Blob([exportGuests(wedding, window.location.origin, guests, Boolean(remote))], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "ftesat-personale.csv"; anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setToast(`${guests.length} ftesa me linke personale u eksportuan.`)
  }
  function closePreview() {
    const url = new URL(window.location.href)
    url.searchParams.delete("preview")
    history.replaceState(null, "", url)
    setPreview(null)
    window.scrollTo({ top: 0, behavior: "instant" })
  }
  function closeCheckout() { history.replaceState(null, "", remote ? "/ftesa" : "/ftesa?demo=1"); setCheckout(false) }
  function navigate(next: Tab, filter = { event: "", status: "" }) {
    setTab(next); setGuestFilter(filter)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", next)
    history.replaceState(null, "", url)
    window.scrollTo({ top: 0, behavior: "instant" })
  }

  if (invalidLink) return <div className="inv-public inv-invalid"><Heart size={35} /><h1>Kjo ftesë nuk hapet.</h1><p>Linku është i paplotë ose i pavlefshëm. Kërkoje përsëri nga personi që të ka ftuar.</p><a className="inv-button inv-button-primary" href="/ftesa">Hap demon e ftesave</a></div>
  if (publicInvite) return <GuestInvitation key={publicInvite.guest.token} invitation={publicInvite} onRespond={(responses) => saveResponse(publicInvite, responses)} />
  if (preview) {
    const current = wedding.guests.find((g) => g.id === preview.id) ?? preview
    const invitation = { ...makeInvitation(wedding, current), guest: current }
    return <GuestInvitation invitation={invitation} online={Boolean(remote)} preview onBack={closePreview} onRespond={(responses) => saveResponse(invitation, responses)} />
  }
  if (checkout) return <DemoCheckout wedding={wedding} error={storageWarning} onBack={closeCheckout} onActivate={async () => { if (await persist({ ...wedding, demoActivated: true })) { closeCheckout(); setTab("overview"); setToast("Pagesa demo përfundoi. Mirë se erdhe në dashboard!") } else setToast("Aktivizimi nuk u ruajt. Lejo ruajtjen në shfletues dhe provo përsëri.") }} />

  const planningProps = { wedding, busy: saving, error: storageWarning, onSave: (planning: WeddingPlan, message: string) => update({ ...wedding, planning }, message) }
  const tableProps = { wedding, onAdd: () => setEditor("new"), onEdit: (g: Guest) => setEditor(g), onDelete: (g: Guest) => setDeleting(g), onShare: (g: Guest) => { void copyGuest(g) }, onCopyAll: (guests: Guest[]) => { void copyAll(guests) }, onPreview: (g: Guest) => setPreview(g), onExport: exportCsv, onViewAll: () => navigate("guests") }

  return <div className="inv-app" aria-busy={saving}>
    <aside className="inv-sidebar" aria-label="Hapësira e çiftit"><a className="inv-brand" href="/ftesa"><span className="inv-brand-symbol"><Heart size={20} /></span><span>ftesa<span className="inv-brand-dot">.</span></span></a><span className="inv-studio-label">NGA CUBE DESIGNERS</span>
      <span className="inv-nav-caption">HAPËSIRA JUAJ</span><nav ref={navRef} aria-label="Navigimi i ftesave">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tabGroup(tab) === id ? "is-active" : ""} onClick={() => navigate(id)} aria-current={tabGroup(tab) === id ? "page" : undefined}><Icon size={18} /><span>{label}</span>{id === "guests" && <small aria-hidden="true">{wedding.guests.length}</small>}</button>)}</nav>
      <div className="inv-sidebar-bottom"><div className="inv-sidebar-note"><Flower2 size={25} /><strong>Ditë e madhe.<br />Detaje të vogla.</strong><p>Ftesat, buxheti dhe plani juaj,<br />në një vend.</p><button onClick={() => setHelp(true)}>Si funksionon?<ArrowUpRight size={15} /></button></div><button className="inv-sidebar-help" onClick={() => setHelp(true)}><CircleHelp size={17} />Të duhet ndihmë?</button><a href="/" className="inv-sidebar-help"><LogOut size={17} />Te Cube Designers</a><div className="inv-sidebar-demo"><span />{remote ? "Ftesat ruhen online" : "Demo lokale · pa pagesë reale"}</div></div>
    </aside>
    <div className="inv-workspace"><header className="inv-topbar"><div className="inv-breadcrumb">Dasma jonë<span>/</span><strong>{pageCopy[tab].title}</strong></div><div className="inv-topbar-right"><span className="inv-save-indicator"><span />{storageWarning ? "Ruajtja ka nevojë për vëmendje" : saving ? "Duke ruajtur…" : remote ? "Të dhënat ruhen online" : "Demo në këtë shfletues"}</span><button className="inv-profile" aria-label="Hap cilësimet e çiftit" onClick={() => navigate("designs")}>{wedding.names[0]}</button></div></header>
      <main className="inv-main">
        {storageWarning && <div className="inv-storage-warning" role="alert">{storageWarning}</div>}
        <div className="inv-page-heading">{tab === "overview" ? <div><h1>{wedding.names}</h1></div> : <div><div className="inv-eyebrow"><span />DASMA JUAJ</div><h1>{pageCopy[tab].title} <em>{pageCopy[tab].emphasis}</em></h1><p>{pageCopy[tab].intro}</p></div>}{tab === "overview" && <button className="inv-button inv-button-primary" onClick={() => void copyGeneral()} disabled={!loaded || saving}><Copy size={17} />Kopjo linkun</button>}{tab === "guests" && <div className="inv-heading-actions"><button className="inv-button inv-button-outline" onClick={() => setGeneralEditor(true)} disabled={!loaded}><Copy size={17} />Linku për të gjithë</button><button className="inv-button inv-button-primary" onClick={() => setEditor("new")} disabled={!loaded}><Plus size={17} />Shto mysafir</button></div>}</div>

        {tab === "overview" && <OverviewCharts wedding={wedding} onEdit={(event) => setEditingEvent({ event, isNew: false })} onAdd={wedding.events.length < MAX_EVENTS ? () => setEditingEvent({ isNew: true, event: { id: `event-${crypto.randomUUID().slice(0, 8)}`, name: "", date: (wedding.events.find((e) => e.id === "dasma") ?? wedding.events[0]).date, time: "18:00", venue: "", address: "" } }) : undefined} onFilter={(event, status) => navigate("guests", { event, status })} />}

        {tab === "guests" && <GuestTable key={guestFilter.event + guestFilter.status} {...tableProps} initialEvent={guestFilter.event} initialStatus={guestFilter.status} />}
        {tab === "designs" && <InvitationEditor key={wedding.design + wedding.names + wedding.message} wedding={wedding} busy={saving} online={Boolean(remote)} onPreview={wedding.guests[0] ? () => setPreview(wedding.guests[0]) : undefined} onSave={(values) => update({ ...wedding, ...values }, "Ftesa u ruajt.")} />}
        {tab === "budget" && <WeddingPlanner {...planningProps} />}
      </main>
    </div>
    {generalEditor && <GeneralLinkDialog wedding={wedding} busy={saving} onClose={() => setGeneralEditor(false)} onSave={saveGeneral} />}
    {editor && <GuestEditor guest={editor === "new" ? undefined : editor} events={wedding.events} onSave={saveGuest} busy={saving} saveError={storageWarning} onClose={() => setEditor(null)} />}
    {editingEvent && <EventEditor event={editingEvent.event} isNew={editingEvent.isNew} busy={saving} onClose={() => setEditingEvent(null)} onSave={async (event) => { const events = editingEvent.isNew ? [...wedding.events, event] : wedding.events.map((e) => e.id === event.id ? event : e); if (await update({ ...wedding, events: sortEvents(events) }, editingEvent.isNew ? "Eventi u shtua. Tani mund t’i ftosh mysafirët në të." : "Detajet e eventit u ruajtën.")) setEditingEvent(null) }} onDelete={async () => { const next = removeEvent(wedding, editingEvent.event.id); if (typeof next === "string") return next; if (await update(next, `Eventi “${editingEvent.event.name}” u hoq.`)) { setEditingEvent(null); return "" } return "Eventi nuk u hoq. Provo përsëri." }} />}
    {deleting && <InvitationDialog title="Të hiqet kjo ftesë?" onClose={() => setDeleting(null)}><div className="inv-form"><p>Ftesa për <strong>{deleting.name}</strong>, me {deleting.capacity} vende, do të hiqet nga lista bashkë me përgjigjet. {remote ? "Linku i këtij mysafiri nuk do të hapet më." : "Linket demo të kopjuara më herët mbeten kopje të pavarura."}</p><div className="inv-form-actions"><button className="inv-button inv-button-outline" onClick={() => setDeleting(null)}>Mbaje ftesën</button><button className="inv-button inv-button-danger" onClick={async () => { const saved = await update({ ...wedding, guests: wedding.guests.filter((g) => g.id !== deleting.id) }, "Ftesa u hoq nga lista."); if (saved) setDeleting(null) }}>Hiqe ftesën</button></div></div></InvitationDialog>}

    {help && <InvitationDialog title="Nga një ftesë, te një kujtim" onClose={() => setHelp(false)}><div className="inv-form inv-help-content"><p>Provoje sistemin nga fillimi në fund:</p><ol><li><strong>{remote ? "Porosia dhe pagesa." : "Pagesa demo."}</strong> {remote ? "Pas konfirmimit të pagesës nga admini, dashboard-i juaj aktivizohet." : "Simulo aktivizimin e paketës, pa kartelë dhe pa transaksion."}</li><li><strong>Zgjidh dizajnin.</strong> Ndrysho emrat dhe mesazhin te cilësimet.</li><li><strong>Vendos eventet.</strong> Përditëso datën, orën dhe lokacionin për secilin.</li><li><strong>Shto mysafirët.</strong> Zgjidh familje, +1 ose individuale, vendet dhe eventet.</li><li><strong>Ndaj linkun personal.</strong> Kopjo një link ose eksporto të gjitha ftesat në CSV.</li><li><strong>Provo konfirmimin.</strong> Hape “Shiko si mysafir” dhe përgjigju për çdo event.</li><li><strong>Planifiko buxhetin.</strong> Shto çmime fikse ose për mysafir, pagesat e kryera dhe rezervën.</li><li><strong>Organizo ekipin.</strong> Ruaj kontaktet private, lidhi me shpenzimet dhe ndiq detyrat me afate.</li></ol><p className="inv-demo-note">{remote ? "Mysafirët, dizajni dhe përgjigjet ruhen online. Kyçu me referencën e porosisë dhe fjalëkalimin nga çdo pajisje. Dashboard-i i merr konfirmimet e reja automatikisht." : "Kjo është demo lokale, pa llogari dhe pa pagesa reale. Përgjigjet kthehen në dashboard vetëm brenda të njëjtit shfletues. Linket janë kopje të detajeve kur krijohen; nuk përditësohen ose revokohen nga larg."}</p><button className="inv-button inv-button-primary" onClick={() => setHelp(false)}>E kuptova<Check size={17} /></button></div></InvitationDialog>}
    {toast && <div className="inv-toast" role="status"><CheckCircleIcon /><span>{toast}</span><button aria-label="Mbyll njoftimin" onClick={() => setToast("")}><X size={15} /></button></div>}
  </div>
}

function CheckCircleIcon() { return <span className="inv-toast-icon"><Check size={14} /></span> }
