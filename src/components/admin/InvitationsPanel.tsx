import { useCallback, useEffect, useState } from "react"
import { ExternalLink, Heart, RefreshCw, Check, Save, Copy, KeyRound, Mail, X } from "lucide-react"
import { apiRequest } from "@/lib/api"
import { InvitationRequestsPanel, type InvitationRequest } from "./InvitationRequestsPanel"
import { currency, formatDate } from "./types"
import { invitationStatusLabels, type InvitationAccess, type InvitationOrder, type InvitationOrderStatus } from "@/components/invitations/online-types"

export function InvitationsPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [orders, setOrders] = useState<InvitationOrder[] | null>(null)
  const [requests, setRequests] = useState<InvitationRequest[] | null>(null)
  const [tab, setTab] = useState<"requests" | "accounts">("requests")
  const [access, setAccess] = useState<InvitationAccess | null>(null)
  const [selectedId, setSelectedId] = useState("")
  const [filter, setFilter] = useState<InvitationOrderStatus | "all">("all")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    const result = await apiRequest<{ orders: InvitationOrder[]; requests: InvitationRequest[] }>("/api/admin/invitations")
    if (result.ok) { setOrders(result.data.orders); setRequests(result.data.requests ?? []); setError("") }
    else if (result.status === 401) onUnauthorized()
    else setError(result.error)
  }, [onUnauthorized])
  useEffect(() => { void load() }, [load])

  async function save(order: InvitationOrder, changes: Record<string, unknown>) {
    if (busy) return
    setBusy(true); setError("")
    const result = await apiRequest<InvitationAccess | { ok: boolean }>("/api/admin/invitations", { method: "PATCH", body: { id: order.id, ...changes } })
    if (result.ok) {
      if ("password" in result.data) setAccess(result.data)
      await load()
    }
    else if (result.status === 401) onUnauthorized()
    else setError(result.error)
    setBusy(false)
  }
  const visible = (orders ?? []).filter((order) => filter === "all" || order.status === filter)
  const selected = visible.find((order) => order.id === selectedId) ?? visible[0]
  return <section className="admin-panel">
    <header className="admin-panel-head"><div><h1>Kontrolli i ftesave</h1><p>{requests?.filter((item) => item.status === "new").length ?? 0} kërkesa të reja · {orders?.filter((item) => item.status === "active").length ?? 0} llogari aktive</p></div></header>
    <div className="admin-invitation-tabs" role="group" aria-label="Paneli i ftesave"><button className="admin-button" aria-pressed={tab === "requests"} onClick={() => setTab("requests")}>Kërkesat ({requests?.length ?? 0})</button><button className="admin-button" aria-pressed={tab === "accounts"} onClick={() => setTab("accounts")}>Llogaritë ({orders?.length ?? 0})</button></div>
    {access && <AccessDetails key={access.password} access={access} onClose={() => setAccess(null)} />}
    {tab === "requests" ? <InvitationRequestsPanel requests={requests} onRefresh={load} onUnauthorized={onUnauthorized} onOpenAccount={(id) => { setSelectedId(id); setFilter("all"); setTab("accounts") }} onCreated={async (created) => { setAccess(created); setSelectedId(created.id); setFilter("all"); setTab("accounts"); await load() }} /> : <>

    <header className="admin-panel-head"><div><h2>Llogaritë e klientëve</h2><p>{orders?.length ?? 0} porosi · {orders?.filter((o) => o.status === "pending").length ?? 0} në pritje të pagesës</p></div><div className="admin-toolbar"><select className="admin-select" aria-label="Filtro porositë e ftesave" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="all">Të gjitha</option>{Object.entries(invitationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="admin-button is-ghost" onClick={() => void load()} disabled={busy}><RefreshCw />Rifresko</button></div></header>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {!orders ? <p className="admin-empty">Duke ngarkuar porositë nga databaza…</p> : !visible.length ? <p className="admin-empty">Asnjë porosi ftesash këtu.</p> : <div className="admin-split">
      <ul className="admin-list">{visible.map((order) => <li key={order.id}><button className={selected?.id === order.id ? "is-selected" : ""} onClick={() => setSelectedId(order.id)}><span className="admin-list-top"><strong>{order.reference}</strong><span className={`admin-status is-${order.status === "active" ? "confirmed" : order.status === "pending" ? "new" : "cancelled"}`}>{invitationStatusLabels[order.status]}</span></span><span className="admin-list-meta">{order.customer.name} · {formatDate(order.created_at)}</span><span className="admin-list-preview">{order.guest_count ?? 0} ftesa · {order.total === null ? "Me ofertë" : currency.format(order.total)} · {order.payment_status === "paid" ? "Paguar" : "Pa paguar"}</span></button></li>)}</ul>
      {selected && <InvitationOrderDetail key={`${selected.id}-${selected.revision}`} order={selected} busy={busy} onSave={(changes) => void save(selected, changes)} onReset={() => void save(selected, { resetPassword: true })} />}
    </div>}
    </>}
    {tab === "requests" && error && <p className="admin-error" role="alert">{error}</p>}
  </section>
}

function InvitationOrderDetail({ order, busy, onSave, onReset }: { order: InvitationOrder; busy: boolean; onSave: (changes: Record<string, unknown>) => void; onReset: () => void }) {
  const [total, setTotal] = useState(order.total === null ? "" : String(order.total))
  const [notes, setNotes] = useState(order.notes ?? "")
  return <article className="admin-detail"><header><span><Heart size={15} /> Paketa e ftesave</span><h2>{order.reference}</h2><p>{formatDate(order.created_at)}</p></header>
    <dl className="admin-fields"><div><dt>Klienti</dt><dd>{order.customer.name}</dd></div><div><dt>Email</dt><dd><a href={`mailto:${order.customer.email}`}>{order.customer.email}</a></dd></div><div><dt>Telefoni</dt><dd>{order.customer.phone ? <a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a> : "—"}</dd></div><div><dt>Pagesa</dt><dd>{order.payment_status === "paid" ? "E konfirmuar nga admini" : "Në pritje të konfirmimit"}</dd></div><div><dt>Ftesa personale</dt><dd>{order.guest_count ?? 0}</dd></div></dl>
    <div className="admin-invitation-actions"><button className="admin-button is-ghost" disabled={busy} onClick={() => { if (window.confirm("Të krijohet një fjalëkalim i ri? Klienti do të duhet të kyçet përsëri.")) onReset() }}><KeyRound />Ndrysho fjalëkalimin</button><a className="admin-button is-ghost" href={`/ftesa?order=${order.id}`} target="_blank" rel="noreferrer"><ExternalLink />Hap dashboard-in e klientit</a>{order.payment_status === "unpaid" && <button className="admin-button is-primary" disabled={busy} onClick={() => { if (window.confirm(`A është verifikuar pagesa për ${order.reference}? Kjo e aktivizon dashboard-in e klientit.`)) onSave({ status: "active", paymentStatus: "paid" }) }}><Check />Konfirmo pagesën dhe aktivizo</button>}</div>
    <form className="admin-record-controls" onSubmit={(event) => { event.preventDefault(); onSave({ total: total === "" ? null : Number(total), notes }) }}><label><span>Statusi i paketës</span><select aria-label="Statusi i paketës" value={order.status} disabled={busy} onChange={(event) => onSave({ status: event.target.value })}>{Object.entries(invitationStatusLabels).map(([value, label]) => <option key={value} value={value} disabled={value === "active" && order.payment_status !== "paid"}>{label}</option>)}</select></label><label><span>Çmimi i paketës (€)</span><input className="admin-select" type="number" min="0" max="100000" step="0.01" value={total} placeholder="Me ofertë" onChange={(event) => setTotal(event.target.value)} disabled={busy} /></label><label><span>Shënime të brendshme</span><textarea rows={4} maxLength={5000} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={busy} /></label><div className="admin-record-actions"><button className="admin-button is-primary" disabled={busy} type="submit"><Save />Ruaj çmimin dhe shënimet</button></div></form>
    <p className="admin-note">Aktivizimi bëhet vetëm pasi ekipi e verifikon pagesën. Pezullimi ose anulimi ndalon ftesat publike dhe ndryshimet e klientit; të dhënat ruhen në databazë.</p>
  </article>
}


function AccessDetails({ access, onClose }: { access: InvitationAccess; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const url = `${window.location.origin}/ftesa?view=login`
  const message = `Përshëndetje,\n\nLlogaria juaj për ftesat online është krijuar.\nKyçuni: ${url}\nReferenca: ${access.reference}\nFjalëkalimi: ${access.password}\n\nNëse llogaria është në pritje, menaxhimi hapet pas aktivizimit nga studioja.\nCUBE DESIGNERS`
  async function copy() {
    try { await navigator.clipboard.writeText(message); setCopied(true); setError("") }
    catch { setError("Kopjimi nuk u lejua. Zgjidhi dhe kopjoji të dhënat më poshtë.") }
  }
  return <section className="admin-access-card" aria-labelledby="admin-access-title"><div className="admin-access-head"><h2 id="admin-access-title">Të dhënat e kyçjes</h2><button className="admin-button is-ghost" aria-label="Mbyll të dhënat e kyçjes" onClick={onClose}><X /></button></div><p>Llogaria: {access.email}. Kopjoji të dhënat dhe dërgoja klientit. Fjalëkalimi shfaqet vetëm tani.</p><dl className="admin-fields"><div><dt>Referenca</dt><dd>{access.reference}</dd></div><div><dt>Fjalëkalimi</dt><dd><input className="admin-select" aria-label="Fjalëkalimi i klientit" value={access.password} readOnly /></dd></div><div><dt>Kyçja</dt><dd><a href={url}>{url}</a></dd></div></dl><div className="admin-invitation-actions"><button className="admin-button is-primary" onClick={() => void copy()}><Copy />{copied ? "U kopjuan" : "Kopjo të dhënat"}</button><a className="admin-button is-ghost" href={`mailto:${access.email}?subject=${encodeURIComponent("Llogaria juaj për ftesat online")}&body=${encodeURIComponent(message)}`}><Mail />Përgatit emailin</a></div><p className="admin-note">Emaili hapet si draft në aplikacionin tënd. Nuk dërgohet automatikisht.</p>{error && <p className="admin-error" role="alert">{error}</p>}</section>
}
