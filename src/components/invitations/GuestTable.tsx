import { ArrowUpRight, Check, Copy, Pencil, Search, Trash2, UsersRound, Plus, Download, MoreHorizontal, X } from "lucide-react"
import { useState } from "react"
import { guestStatus, kindLabels, type Guest, type Wedding } from "./model"

// With an event chosen, the answer filter follows that event: "declined" also covers seats a family won't use.
export function matchesAnswer(guest: Guest, eventId: string, status: string) {
  if (!status) return true
  if (!eventId) return guestStatus(guest) === status
  const response = guest.responses[eventId]
  if (status === "pending") return !response
  if (status === "accepted") return response?.status === "accepted"
  return response?.status === "declined" || response?.status === "accepted" && response.count < guest.capacity
}
const answerLabels: Record<string, string> = { accepted: "Vijnë", declined: "Nuk vijnë", pending: "Në pritje" }

export default function GuestTable({ wedding, compact = false, initialEvent = "", initialStatus = "", onAdd, onEdit, onDelete, onShare, onCopyAll, onPreview, onExport, onViewAll }: {
  wedding: Wedding; compact?: boolean; initialEvent?: string; initialStatus?: string; onAdd: () => void; onEdit: (guest: Guest) => void; onDelete: (guest: Guest) => void; onShare: (guest: Guest) => void; onCopyAll: (guests: Guest[]) => void; onPreview: (guest: Guest) => void; onExport: (guests: Guest[]) => void; onViewAll: () => void
}) {
  const [query, setQuery] = useState("")
  const [eventFilter, setEventFilter] = useState(initialEvent)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const filtered = wedding.guests.filter((guest) => guest.name.toLocaleLowerCase("sq").includes(query.toLocaleLowerCase("sq")) && (!eventFilter || guest.events.includes(eventFilter)) && matchesAnswer(guest, eventFilter, statusFilter))
  const filterLabel = [wedding.events.find((event) => event.id === eventFilter)?.name, statusFilter && answerLabels[statusFilter]].filter(Boolean).join(" · ")
  const visible = compact ? filtered.slice(-4).reverse() : filtered
  return <section className="inv-panel inv-guests-panel inv-easy-guests">
    <div className="inv-panel-heading"><div><h2>{compact ? "Mysafirët e fundit" : "Lista e mysafirëve"}</h2><p>{wedding.guests.length} ftesa · kopjo dhe dërgo linkun.</p></div>{compact ? <button className="inv-text-button" onClick={onViewAll}>Shiko të gjithë<ArrowUpRight size={16} /></button> : <button className="inv-button inv-button-outline" disabled={!filtered.length} onClick={() => onCopyAll(filtered)}><Copy size={15} />Kopjo të gjitha linket</button>}</div>
    {!compact && <div className="inv-easy-toolbar"><label className="inv-search"><Search size={17} /><input aria-label="Kërko mysafirë" placeholder="Kërko emër ose familje…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><details className="inv-list-options"><summary>Filtra & eksport</summary><div><label>Eventi<select aria-label="Filtro sipas eventit" value={eventFilter} onChange={(event) => setEventFilter(event.target.value)}><option value="">Të gjitha eventet</option>{wedding.events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label><label>Përgjigjja<select aria-label="Filtro sipas përgjigjes" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Të gjitha përgjigjet</option><option value="pending">Në pritje</option><option value="accepted">U përgjigj</option><option value="declined">Nuk vjen</option></select></label><button className="inv-button inv-button-outline" onClick={() => onExport(filtered)}><Download size={15} />Shkarko CSV</button></div></details></div>}
    {!compact && filterLabel && <div className="inv-active-filter" role="status"><span>Po shfaqen: <strong>{filterLabel}</strong> · {filtered.length}</span><button onClick={() => { setEventFilter(""); setStatusFilter("") }}><X size={13} />Hiq filtrin</button></div>}
    <div className="inv-table-scroll"><table className="inv-table"><thead><tr><th>Mysafiri</th><th>Eventet</th><th>Përgjigjja</th><th>Linku personal</th></tr></thead><tbody>{visible.map((guest) => {
      const status = guestStatus(guest)
      return <tr key={guest.id}><td><div className="inv-guest-name"><span><strong>{guest.name}</strong><small>{kindLabels[guest.kind]} · {guest.capacity} {guest.capacity === 1 ? "person" : "persona"}</small></span></div></td><td><div className="inv-event-dots">{wedding.events.filter((event) => guest.events.includes(event.id)).map((event) => <span className="inv-event-label" key={event.id}>{event.name}</span>)}</div></td><td><span className={`inv-status inv-status-${status}`}>{status === "accepted" && <Check size={12} />}{status === "pending" ? "Në pritje" : status === "declined" ? "Nuk vjen" : "U përgjigj"}</span></td><td><div className="inv-easy-row-actions"><button className="inv-copy-guest" aria-label={`Kopjo linkun për ${guest.name}`} onClick={() => onShare(guest)}><Copy size={14} />Kopjo<span className="inv-copy-word">linkun</span></button><button className="inv-icon-button" aria-label={`Shiko ftesën për ${guest.name}`} title="Shiko ftesën" onClick={() => onPreview(guest)}><ArrowUpRight size={17} /></button><details className="inv-guest-options" name="inv-guest-actions"><summary aria-label={`Më shumë për ${guest.name}`}><MoreHorizontal size={18} /></summary><div><button onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); onEdit(guest) }}><Pencil size={14} />Ndrysho</button><button onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); onDelete(guest) }}><Trash2 size={14} />Hiqe nga lista</button></div></details></div></td></tr>
    })}</tbody></table></div>
    {!visible.length && <div className="inv-empty"><UsersRound size={28} /><h3>{wedding.guests.length ? "Nuk u gjet asnjë mysafir" : "Shto mysafirin e parë"}</h3><p>{wedding.guests.length ? "Provo një emër tjetër ose hiq filtrat." : "Emri, personat dhe eventi. Linku krijohet menjëherë."}</p>{!wedding.guests.length && <button className="inv-button inv-button-primary" onClick={onAdd}><Plus size={16} />Shto mysafirin e parë</button>}</div>}
    {!compact && <div className="inv-table-footer"><span>{filtered.length} nga {wedding.guests.length} ftesa</span><span>Çdo link hap vetëm një ftesë</span></div>}
  </section>
}
