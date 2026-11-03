import { useState, type FormEvent } from "react"
import { Copy, Link2, LoaderCircle } from "lucide-react"
import InvitationDialog from "./InvitationDialog"
import type { GeneralLink, Wedding } from "./model"

export default function GeneralLinkDialog({ wedding, busy, onClose, onSave }: {
  wedding: Wedding; busy: boolean; onClose: () => void; onSave: (link: GeneralLink) => Promise<boolean>
}) {
  const [events, setEvents] = useState(wedding.generalLink?.events ?? [wedding.events.find((event) => event.id === "dasma")?.id ?? wedding.events[0].id])
  const [capacity, setCapacity] = useState(wedding.generalLink?.capacity ?? 6)
  const [enabled, setEnabled] = useState(wedding.generalLink?.enabled ?? true)
  const [error, setError] = useState("")
  const [waiting, setWaiting] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (waiting || busy) return
    if (!events.length) { setError("Zgjidh të paktën një event."); return }
    setWaiting(true)
    const token = wedding.generalLink?.token ?? Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("")
    if (await onSave({ enabled, token, events, capacity })) onClose()
    else setError("Linku nuk u ruajt. Provo përsëri.")
    setWaiting(false)
  }
  return <InvitationDialog title="Link për të gjithë" onClose={onClose}><form className="inv-form" onSubmit={submit}>
    <p className="inv-form-intro"><Link2 size={17} /> Një link i njëjtë për të gjithë. Mysafiri shkruan emrin, numrin e personave dhe konfirmon pjesëmarrjen.</p>
    <fieldset disabled={waiting || busy}><legend>Çfarë eventesh do të shfaqen?</legend><div className="inv-event-checkboxes">{wedding.events.map((event) => <label key={event.id}><input type="checkbox" checked={events.includes(event.id)} onChange={(change) => setEvents(change.target.checked ? [...events, event.id] : events.filter((id) => id !== event.id))} /><span>{event.name}</span></label>)}</div></fieldset>
    <label>Maksimumi i personave për një konfirmim<select value={capacity} onChange={(event) => setCapacity(Number(event.target.value))}>{Array.from({ length: 30 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label>
    {wedding.generalLink && <label className="inv-general-enabled"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />Linku është aktiv</label>}
    <p className="inv-form-intro">Në këtë link shfaqen vetëm eventet e zgjedhura. Për ftesa me vende të caktuara, përdor linket personale.</p>
    {error && <p className="inv-form-error" role="alert">{error}</p>}
    <div className="inv-form-actions"><button className="inv-button inv-button-outline" type="button" onClick={onClose}>Anulo</button><button className="inv-button inv-button-primary" type="submit" disabled={waiting || busy}>{waiting || busy ? <LoaderCircle size={16} className="inv-spinner" aria-hidden="true" /> : <Copy size={16} />}{enabled ? "Ruaj dhe kopjo linkun" : "Ruaj ndryshimet"}</button></div>
  </form></InvitationDialog>
}
