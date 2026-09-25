import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"

type RecordControlsProps<Status extends string> = {
  status: Status
  notes: string
  labels: Record<Status, string>
  onSave: (changes: { status?: Status; notes?: string }) => Promise<boolean>
  onDelete: () => void
}

// Status picker, internal notes and delete, shared by requests and orders.
export function RecordControls<Status extends string>({
  status,
  notes,
  labels,
  onSave,
  onDelete,
}: RecordControlsProps<Status>) {
  const [draft, setDraft] = useState(notes)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft(notes)
    setSaved(false)
  }, [notes])

  return (
    <div className="admin-record-controls">
      <label>
        <span>Statusi</span>
        <select
          value={status}
          onChange={(event) => void onSave({ status: event.target.value as Status })}
        >
          {(Object.keys(labels) as Status[]).map((key) => (
            <option key={key} value={key}>
              {labels[key]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Shënime të brendshme</span>
        <textarea
          rows={4}
          value={draft}
          placeholder="Vetëm ekipi i sheh këto shënime…"
          onChange={(event) => {
            setDraft(event.target.value)
            setSaved(false)
          }}
        />
      </label>
      <div className="admin-record-actions">
        <button
          className="admin-button is-primary"
          type="button"
          disabled={draft === notes}
          onClick={async () => setSaved(await onSave({ notes: draft }))}
        >
          {saved ? "U ruajt" : "Ruaj shënimet"}
        </button>
        <button className="admin-button is-danger" type="button" onClick={onDelete}>
          <Trash2 />
          Fshij
        </button>
      </div>
    </div>
  )
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  return <span className={`admin-status is-${status}`}>{label}</span>
}
