import { useState, type FormEvent } from "react"
import { Check, Heart, LoaderCircle, UserRound, UsersRound } from "lucide-react"
import InvitationDialog from "./InvitationDialog"
import { kindLabels, type Guest, type GuestKind, type WeddingEvent } from "./model"

export default function GuestEditor({ guest, events, onSave, onClose, busy = false, saveError = "" }: { guest?: Guest; events: WeddingEvent[]; onSave: (guest: Guest) => void; onClose: () => void; busy?: boolean; saveError?: string }) {
  const [name, setName] = useState(guest?.name ?? "")
  const [kind, setKind] = useState<GuestKind>(guest?.kind ?? "family")
  const [capacity, setCapacity] = useState(guest?.capacity ?? 4)
  const [selected, setSelected] = useState(guest?.events ?? [events.find((event) => event.id === "dasma")?.id ?? events[0].id])
  const [message, setMessage] = useState(guest?.message ?? "")
  const [error, setError] = useState("")
  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Shkruaj emrin e mysafirit ose të familjes."); return }
    if (!selected.length) { setError("Zgjidh të paktën një event."); return }
    const count = kind === "individual" ? 1 : kind === "couple" ? 2 : capacity
    if (!Number.isInteger(count) || count < 1 || count > 30) { setError("Zgjidh nga 1 deri në 30 vende."); return }
    const responses = Object.fromEntries(Object.entries(guest?.responses ?? {}).filter(([id]) => selected.includes(id)).map(([id, r]) => [id, { ...r, count: Math.min(r.count, count) }]))
    onSave({ id: guest?.id ?? crypto.randomUUID(), token: guest?.token ?? crypto.randomUUID(), name: name.trim(), kind, capacity: count, events: selected, message: message.trim(), responses })
  }
  return <InvitationDialog title={guest ? "Ndrysho mysafirin" : "Shto mysafir"} onClose={onClose}>
    <form className="inv-form" onSubmit={submit} aria-busy={busy}>
      <p className="inv-form-intro">Plotëso emrin dhe personat. Linku krijohet dhe kopjohet menjëherë.</p>
      <div className="inv-kind-picker" role="group" aria-label="Lloji i ftesës">{(["family", "couple", "individual"] as GuestKind[]).map((value) => {
        const Icon = value === "family" ? UsersRound : value === "couple" ? Heart : UserRound
        return <button type="button" key={value} className={kind === value ? "is-selected" : ""} aria-pressed={kind === value} onClick={() => { setKind(value); setCapacity(value === "individual" ? 1 : value === "couple" ? 2 : 4) }}><Icon size={21} />{kindLabels[value]}</button>
      })}</div>
      <div className="inv-form-row"><label>Emri në ftesë<input autoFocus required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "family" ? "p.sh. Familja Gashi" : "p.sh. Elira Berisha"} /></label><label className="inv-capacity-field">Vendet<input type="number" min={1} max={30} required disabled={kind !== "family"} value={kind === "individual" ? 1 : kind === "couple" ? 2 : capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></label></div>
      <fieldset><legend>Në cilat evente i fton?</legend><div className="inv-event-checkboxes">{events.map((event) => <label key={event.id}><input type="checkbox" checked={selected.includes(event.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, event.id] : selected.filter((id) => id !== event.id))} /><span>{event.name}</span></label>)}</div></fieldset>
      <label>Mesazh personal <span className="inv-label-optional">opsional</span><textarea rows={2} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Lëre bosh për mesazhin e ftesës." /></label>
      {(error || saveError) && <p role="alert" className="inv-form-error">{error || saveError}</p>}
      <div className="inv-form-actions"><button className="inv-button inv-button-outline" type="button" onClick={onClose}>Anulo</button><button className="inv-button inv-button-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="inv-spinner" aria-hidden="true" /> : <Check size={17} />}{guest ? "Ruaj ndryshimet" : "Krijo dhe kopjo linkun"}</button></div>
    </form>
  </InvitationDialog>
}
