import { useState, type FormEvent } from "react"
import { ArrowUpRight, CalendarDays, Check, Download, Globe, Mail, MapPin, Pencil, Phone, Plus, Search, ShieldCheck, Trash2, UsersRound } from "lucide-react"
import InvitationDialog from "./InvitationDialog"
import { contactCategories, contactStatuses, expenseTotal, formatMoney, phoneHref, safeWebsite, weddingPlan, type ContactCategory, type WeddingContact } from "./planning-model"
import { contactsCsv, downloadCsv } from "./planning-export"
import { ServiceIcon, type PlanningProps } from "./planning-ui"
import type { Wedding } from "./model"

function ContactEditor({ contact, category, wedding, onSave, onClose, busy, serverError }: {
  contact?: WeddingContact; category: ContactCategory; wedding: Wedding
  onSave: (contact: WeddingContact) => Promise<boolean>; onClose: () => void; busy: boolean; serverError: string
}) {
  const [draft, setDraft] = useState<WeddingContact>(() => contact ?? { id: crypto.randomUUID(), name: "", category, person: "", phone: "", email: "", website: "", city: "", status: "shortlist", eventIds: [], notes: "" })
  const [error, setError] = useState("")
  const [waiting, setWaiting] = useState(false)
  const field = (key: keyof WeddingContact, value: string) => setDraft({ ...draft, [key]: value })
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (waiting || busy) return
    let website = draft.website.trim()
    if (website && !/^[a-z][a-z0-9+.-]*:/i.test(website)) website = `https://${website}`
    if (!draft.name.trim()) { setError("Shkruaj emrin e biznesit ose të kontaktit."); return }
    if (draft.phone && !/^\+?[\d\s().-]{3,40}$/.test(draft.phone.trim())) { setError("Telefoni duhet të përmbajë numrin dhe, nëse duhet, prefiksin +."); return }
    if (!safeWebsite(website)) { setError("Vendos një link website me https:// ose http://."); return }
    setWaiting(true); setError("")
    if (await onSave({ ...draft, name: draft.name.trim(), phone: draft.phone.trim(), website })) onClose()
    else setError("Kontakti nuk u ruajt. Kontrollo lidhjen dhe provo përsëri.")
    setWaiting(false)
  }
  return <InvitationDialog title={contact ? "Ndrysho kontaktin" : "Njerëzit pas ditës suaj"} onClose={onClose}>
    <form className="inv-form inv-planner-form" onSubmit={submit}>
      <p className="inv-form-intro">Këto të dhëna janë pjesë e listës suaj private dhe nuk shfaqen në ftesat e mysafirëve.</p>
      <fieldset disabled={waiting || busy}>
        <label>Emri i biznesit ose kontaktit<input autoFocus required maxLength={150} value={draft.name} onChange={(e) => field("name", e.target.value)} placeholder="p.sh. emri i studios, sallës ose grupit" /></label>
        <div className="inv-form-row"><label>Shërbimi<select value={draft.category} onChange={(e) => field("category", e.target.value)}>{Object.entries(contactCategories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Statusi<select value={draft.status} onChange={(e) => field("status", e.target.value)}>{Object.entries(contactStatuses).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
        <div className="inv-form-row"><label>Personi kontaktues<input maxLength={100} value={draft.person} onChange={(e) => field("person", e.target.value)} /></label><label>Telefoni<input type="tel" maxLength={40} value={draft.phone} onChange={(e) => field("phone", e.target.value)} placeholder="+383 …" /></label></div>
        <div className="inv-form-row"><label>Email<input type="email" maxLength={254} value={draft.email} onChange={(e) => field("email", e.target.value)} /></label><label>Qyteti<input maxLength={100} value={draft.city} onChange={(e) => field("city", e.target.value)} /></label></div>
        <label>Website ose profil<input maxLength={500} value={draft.website} onChange={(e) => field("website", e.target.value)} placeholder="https://…" /></label>
        <fieldset><legend>Eventet që mbulon</legend><div className="inv-event-checkboxes">{wedding.events.map((event) => <label key={event.id}><input type="checkbox" checked={draft.eventIds.includes(event.id)} onChange={(e) => setDraft({ ...draft, eventIds: e.target.checked ? [...draft.eventIds, event.id] : draft.eventIds.filter((id) => id !== event.id) })} />{event.name}</label>)}</div></fieldset>
        <label>Shënime private<textarea rows={3} maxLength={2000} value={draft.notes} onChange={(e) => field("notes", e.target.value)} placeholder="Oferta, disponueshmëria, stili që ju pëlqen…" /></label>
      </fieldset>
      {(serverError || error) && <p className="inv-form-error" role="alert">{serverError || error}</p>}
      <div className="inv-form-actions"><button type="button" className="inv-button inv-button-outline" onClick={onClose}>Anulo</button><button type="submit" className="inv-button inv-button-primary" disabled={waiting || busy}><Check size={16} />{waiting ? "Duke ruajtur…" : "Ruaj kontaktin"}</button></div>
    </form>
  </InvitationDialog>
}

export default function WeddingContacts({ wedding, onSave, busy, error, onAddExpense }: PlanningProps & { onAddExpense: (id: string) => void }) {
  const plan = weddingPlan(wedding)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<ContactCategory | "">("")
  const [status, setStatus] = useState("")
  const [editor, setEditor] = useState<WeddingContact | "new" | null>(null)
  const [deleting, setDeleting] = useState<WeddingContact | null>(null)
  const filtered = plan.contacts.filter((c) => (!category || c.category === category) && (!status || c.status === status) && [c.name, c.person, c.city, c.phone].join(" ").toLocaleLowerCase("sq").includes(query.toLocaleLowerCase("sq")))
  async function saveContact(contact: WeddingContact) {
    const exists = plan.contacts.some((c) => c.id === contact.id)
    return onSave({ ...plan, contacts: exists ? plan.contacts.map((c) => c.id === contact.id ? contact : c) : [...plan.contacts, contact] }, "Kontakti u ruajt në listën tuaj private.")
  }
  return <div className="inv-planner">
    <section className="inv-contact-intro"><div><span className="inv-eyebrow"><ShieldCheck size={13} />VETËM PËR ÇIFTIN TUAJ</span><h2>Ekipi që e bën <em>ditën tuaj.</em></h2><p>Fotografi, kamera, restoranti, muzika. Kontaktet, ofertat dhe shënimet që doni t’i keni afër.</p></div><div className="inv-planner-actions"><button className="inv-button inv-button-outline" disabled={!filtered.length} onClick={() => downloadCsv(contactsCsv(wedding, filtered), "kontaktet-e-dasmes.csv")}><Download size={16} />Eksporto</button><button className="inv-button inv-button-primary" disabled={busy || plan.contacts.length >= 500} onClick={() => setEditor("new")}><Plus size={16} />Shto kontakt</button></div></section>
    <div className="inv-service-categories" role="group" aria-label="Kategoritë e kontakteve">{(["photo", "video", "photo_video", "venue", "music"] as ContactCategory[]).map((id) => <button key={id} className={category === id ? "is-selected" : ""} aria-pressed={category === id} onClick={() => setCategory(category === id ? "" : id)}><span className={`inv-service-icon inv-category-${id}`}><ServiceIcon category={id} /></span><strong>{contactCategories[id]}</strong><small>{plan.contacts.filter((c) => c.category === id).length} kontakte</small></button>)}</div>
    <div className="inv-contacts-toolbar"><label className="inv-search"><Search size={17} /><input aria-label="Kërko kontakte" placeholder="Kërko emër, person ose qytet…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><select aria-label="Filtro kontaktet sipas shërbimit" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}><option value="">Të gjitha shërbimet</option>{Object.entries(contactCategories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><select aria-label="Filtro kontaktet sipas statusit" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Të gjitha statuset</option>{Object.entries(contactStatuses).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
    <div className="inv-contact-list-heading"><span>{filtered.length} kontakte{category ? ` · ${contactCategories[category]}` : ""}</span><span><Check size={13} />{plan.contacts.filter((c) => c.status === "booked").length} të rezervuara</span></div>
    <div className="inv-contacts-grid">{filtered.map((contact) => {
      const expenses = plan.expenses.filter((e) => e.vendorId === contact.id)
      const value = expenses.reduce((sum, e) => sum + expenseTotal(wedding, plan.budget, e), 0)
      return <article className="inv-contact-card" key={contact.id}><div className="inv-contact-card-top"><span className={`inv-service-icon inv-category-${contact.category}`}><ServiceIcon category={contact.category} /></span><span className={`inv-contact-status inv-contact-status-${contact.status}`}>{contactStatuses[contact.status]}</span><button className="inv-icon-button" aria-label={`Ndrysho kontaktin ${contact.name}`} onClick={() => setEditor(contact)}><Pencil size={16} /></button></div><span className="inv-contact-category">{contactCategories[contact.category]}</span><h3>{contact.name}</h3>{contact.person && <p className="inv-contact-person">{contact.person}</p>}<div className="inv-contact-details">{contact.city && <span><MapPin size={14} />{contact.city}</span>}{contact.phone && <a href={phoneHref(contact.phone)}><Phone size={14} />{contact.phone}</a>}{contact.email && <a href={`mailto:${contact.email}`}><Mail size={14} />{contact.email}</a>}{contact.website && <a href={contact.website} target="_blank" rel="noreferrer"><Globe size={14} />Hap website-in<ArrowUpRight size={12} /></a>}{contact.eventIds.length > 0 && <span><CalendarDays size={14} />{wedding.events.filter((e) => contact.eventIds.includes(e.id)).map((e) => e.name).join(" · ")}</span>}</div>{contact.notes && <p className="inv-contact-note">{contact.notes}</p>}<div className="inv-contact-budget"><span>{expenses.length ? `${expenses.length} shpenzime në buxhet` : "Ende pa shpenzim të lidhur"}</span>{expenses.length > 0 && <strong>{formatMoney(value)}</strong>}</div><div className="inv-contact-card-actions"><button className="inv-text-button" onClick={() => onAddExpense(contact.id)}>Shto shpenzim<Plus size={14} /></button><button className="inv-icon-button inv-delete-button" aria-label={`Hiq kontaktin ${contact.name}`} onClick={() => setDeleting(contact)}><Trash2 size={15} /></button></div></article>
    })}</div>
    {!filtered.length && <section className="inv-panel inv-contacts-empty"><span className="inv-service-icon"><UsersRound size={28} /></span><h3>{plan.contacts.length ? "Asnjë kontakt me këto filtra" : "Njerëzit e duhur, në të njëjtin vend."}</h3><p>{plan.contacts.length ? "Provo një kërkim tjetër ose hiqi filtrat." : "Filloni me fotografin, restorantin ose grupin tuaj muzikor. Çdo kontakt dhe shënim mbetet në hapësirën tuaj private."}</p>{plan.contacts.length ? <button className="inv-button inv-button-outline" onClick={() => { setCategory(""); setStatus(""); setQuery("") }}>Pastro filtrat</button> : <button className="inv-button inv-button-primary" onClick={() => setEditor("new")}><Plus size={16} />Shto kontaktin e parë</button>}</section>}
    <p className="inv-planner-privacy"><ShieldCheck size={14} />Kontaktet tuaja nuk përfshihen në linket e ftesave të mysafirëve.</p>
    {editor && <ContactEditor contact={editor === "new" ? undefined : editor} category={category || "photo"} wedding={wedding} onSave={saveContact} onClose={() => setEditor(null)} busy={busy} serverError={error} />}
    {deleting && <InvitationDialog title="Të hiqet ky kontakt?" onClose={() => setDeleting(null)}><div className="inv-form"><p><strong>{deleting.name}</strong> do të hiqet nga lista. Shpenzimet e lidhura mbeten në buxhet.</p>{error && <p className="inv-form-error" role="alert">{error}</p>}<div className="inv-form-actions"><button className="inv-button inv-button-outline" onClick={() => setDeleting(null)}>Mbaje kontaktin</button><button className="inv-button inv-button-danger" disabled={busy} onClick={async () => { if (await onSave({ ...plan, contacts: plan.contacts.filter((c) => c.id !== deleting.id), expenses: plan.expenses.map((e) => e.vendorId === deleting.id ? { ...e, vendorId: "" } : e) }, "Kontakti u hoq. Shpenzimet mbetën në buxhet.")) setDeleting(null) }}>Hiqe kontaktin</button></div></div></InvitationDialog>}
  </div>
}
