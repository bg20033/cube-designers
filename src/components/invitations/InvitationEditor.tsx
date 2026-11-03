import { useState, type FormEvent } from "react"
import { Check, Eye } from "lucide-react"
import InvitationCard from "./InvitationCard"
import { designs, type DesignId, type Wedding } from "./model"

// Design, names and message on one page, with the invitation updating as you type.
export default function InvitationEditor({ wedding, busy, online, onSave, onPreview }: {
  wedding: Wedding; busy: boolean; online: boolean
  onSave: (values: { design: DesignId; names: string; message: string }) => Promise<boolean>; onPreview?: () => void
}) {
  const [design, setDesign] = useState(wedding.design)
  const [names, setNames] = useState(wedding.names)
  const [message, setMessage] = useState(wedding.message)
  const dirty = design !== wedding.design || names.trim() !== wedding.names || message.trim() !== wedding.message
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !names.trim()) return
    await onSave({ design, names: names.trim(), message: message.trim() })
  }
  return <div className="inv-editor">
    <form className="inv-panel inv-editor-form inv-form" onSubmit={submit}>
      <fieldset disabled={busy}>
        <legend>Dizajni</legend>
        <div className="inv-editor-designs">{designs.map((item) => <button type="button" key={item.id} aria-pressed={design === item.id} onClick={() => setDesign(item.id)}><span className="inv-design-swatch" style={{ background: item.color }} /><span><strong>{item.name}</strong><small>{item.description}</small></span>{design === item.id && <Check size={15} />}</button>)}</div>
      </fieldset>
      <fieldset disabled={busy}>
        <label>Emrat e çiftit<input required pattern=".*\S.*" maxLength={100} value={names} onChange={(e) => setNames(e.target.value)} placeholder="Arbër & Hana" /><small>Përdor & ndërmjet emrave, p.sh. Arbër & Hana.</small></label>
        <label>Mesazhi i ftesës<textarea rows={5} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} /><small>Çdo mysafir mund të ketë edhe një mesazh të veçantë te lista e mysafirëve.</small></label>
      </fieldset>
      <div className="inv-editor-actions">
        <button className="inv-button inv-button-primary" type="submit" disabled={busy || !dirty || !names.trim()}><Check size={16} />{busy ? "Duke ruajtur…" : "Ruaj ftesën"}</button>
        {onPreview && <button className="inv-button inv-button-outline" type="button" onClick={onPreview} disabled={dirty}><Eye size={16} />Shiko si mysafir</button>}
        {dirty && <span className="inv-unsaved-badge">Ndryshime të paruajtura</span>}
      </div>
      <p className="inv-editor-note">{online ? "Linket e ndara më herët e shfaqin automatikisht ftesën e re." : "Pas ndryshimit, kopjo përsëri linket për të ndarë ftesën e re."}</p>
    </form>
    <div className="inv-editor-preview" aria-label="Parapamja e ftesës"><InvitationCard wedding={{ names: names.trim() || "Emri & Emri", message, design, events: wedding.events }} /></div>
  </div>
}
