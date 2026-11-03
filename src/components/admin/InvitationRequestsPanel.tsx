import { useState, type FormEvent } from "react"
import { ArrowRight, Check, RefreshCw, Save, UserPlus, X } from "lucide-react"
import { apiRequest } from "@/lib/api"
import { formatDate, type Submission } from "./types"
import type { InvitationAccess } from "@/components/invitations/online-types"

export type InvitationRequest = Submission & { account_id?: string | null; account_reference?: string | null }
const labels = { new: "E re", in_progress: "Në shqyrtim", done: "E miratuar", archived: "E refuzuar" }

export function InvitationRequestsPanel({ requests, onRefresh, onUnauthorized, onCreated, onOpenAccount }: {
  requests: InvitationRequest[] | null
  onRefresh: () => Promise<void>
  onUnauthorized: () => void
  onCreated: (access: InvitationAccess) => Promise<void>
  onOpenAccount: (id: string) => void
}) {
  const [filter, setFilter] = useState("all")
  const [selectedId, setSelectedId] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const visible = (requests ?? []).filter((item) => filter === "all" || item.status === filter)
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0]
  async function review(item: InvitationRequest, changes: Record<string, unknown>) {
    if (busy) return
    setBusy(true); setError("")
    const result = await apiRequest("/api/admin/submissions", { method: "PATCH", body: { id: item.id, ...changes } })
    if (result.ok) await onRefresh()
    else if (result.status === 401) onUnauthorized()
    else setError(result.error)
    setBusy(false)
  }
  async function create(item: InvitationRequest, event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const fields = new FormData(event.currentTarget)
    setBusy(true); setError("")
    const result = await apiRequest<InvitationAccess>("/api/admin/invitations", { method: "POST", body: {
      submissionId: item.id, names: fields.get("names"), date: fields.get("date"), phone: fields.get("phone"), activate: fields.get("activate") === "on",
    } })
    if (result.ok) await onCreated(result.data)
    else if (result.status === 401) onUnauthorized()
    else setError(result.error)
    setBusy(false)
  }
  return <>
    <div className="admin-panel-head"><p>{requests?.length ?? 0} kërkesa për ftesa online</p><div className="admin-toolbar"><select className="admin-select" aria-label="Filtro kërkesat e ftesave" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Të gjitha kërkesat</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="admin-button is-ghost" onClick={() => void onRefresh()} disabled={busy}><RefreshCw />Rifresko kërkesat</button></div></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {!requests ? <p className="admin-empty">Duke ngarkuar kërkesat…</p> : !visible.length ? <p className="admin-empty">Nuk ka kërkesa në këtë kategori.</p> : <div className="admin-split">
      <ul className="admin-list">{visible.map((item) => <li key={item.id}><button className={selected?.id === item.id ? "is-selected" : ""} onClick={() => setSelectedId(item.id)}><span className="admin-list-top"><strong>{item.name}</strong><span className={`admin-status is-${item.status === "done" ? "confirmed" : item.status === "archived" ? "cancelled" : "new"}`}>{labels[item.status]}</span></span><span className="admin-list-meta">{item.email}</span><span className="admin-list-preview">{formatDate(item.created_at)}{item.account_reference ? ` · ${item.account_reference}` : ""}</span></button></li>)}</ul>
      {selected && <article className="admin-detail" key={selected.id}>
        <header><span>Kërkesë për ftesa online</span><h2>{selected.name}</h2><p>{formatDate(selected.created_at)}</p></header>
        <dl className="admin-fields"><div><dt>Emaili</dt><dd><a href={`mailto:${selected.email}`}>{selected.email}</a></dd></div><div><dt>Statusi</dt><dd>{labels[selected.status]}</dd></div></dl>
        {selected.account_id ? <div className="admin-invitation-actions"><button className="admin-button is-primary" onClick={() => onOpenAccount(selected.account_id!)}>Hap llogarinë {selected.account_reference}<ArrowRight /></button></div> : ["archived", "done"].includes(selected.status) ? <div className="admin-invitation-actions"><button className="admin-button is-ghost" disabled={busy} onClick={() => void review(selected, { status: "new" })}>Rihap kërkesën</button></div> : <>
          <div className="admin-invitation-actions"><button className="admin-button is-ghost" disabled={busy || selected.status === "in_progress"} onClick={() => void review(selected, { status: "in_progress" })}><Check />Shëno në shqyrtim</button><button className="admin-button is-danger" disabled={busy} onClick={() => void review(selected, { status: "archived" })}><X />Refuzo kërkesën</button></div>
          <form className="admin-invitation-create admin-record-controls" onSubmit={(event) => void create(selected, event)}>
            <h3>Krijo llogarinë e klientit</h3><p>Plotëso detajet pasi t’i kesh konfirmuar me klientin. Fjalëkalimi krijohet automatikisht.</p>
            <label><span>Emrat e çiftit</span><input className="admin-select" name="names" required maxLength={100} placeholder="Arbër & Hana" disabled={busy} /></label>
            <label><span>Data e dasmës</span><input className="admin-select" name="date" type="date" min="2020-01-03" max="2100-12-31" required disabled={busy} /></label>
            <label><span>Telefoni (opsional)</span><input className="admin-select" name="phone" type="tel" maxLength={40} disabled={busy} /></label>
            <label className="admin-invitation-check"><input name="activate" type="checkbox" disabled={busy} /><span>Pagesa u konfirmua. Aktivizo llogarinë tani.</span></label>
            <button type="submit" className="admin-button is-primary" disabled={busy}><UserPlus />{busy ? "Duke krijuar…" : "Krijo llogarinë"}</button>
            <p className="admin-note">Pa aktivizim, klienti mund të kyçet dhe të shohë statusin. Menaxhimi dhe ftesat publike hapen pas konfirmimit të pagesës.</p>
          </form>
        </>}
        <RequestNotes key={`${selected.id}-${selected.notes}`} item={selected} busy={busy} onSave={(notes) => void review(selected, { notes })} />
      </article>}
    </div>}
  </>
}

function RequestNotes({ item, busy, onSave }: { item: InvitationRequest; busy: boolean; onSave: (notes: string) => void }) {
  const [notes, setNotes] = useState(item.notes)
  return <form className="admin-record-controls" onSubmit={(event) => { event.preventDefault(); onSave(notes) }}><label><span>Shënime për kërkesën</span><textarea rows={3} maxLength={5000} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={busy} /></label><button className="admin-button is-ghost" type="submit" disabled={busy || notes === item.notes}><Save />Ruaj shënimet e kërkesës</button></form>
}
