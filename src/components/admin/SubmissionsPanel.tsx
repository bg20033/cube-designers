import { useState } from "react"
import { Mail, RefreshCw } from "lucide-react"

import { apiRequest } from "@/lib/api"
import { RecordControls, StatusPill } from "@/components/admin/RecordControls"
import {
  formatDate,
  submissionStatusLabels,
  type Submission,
  type SubmissionStatus,
} from "@/components/admin/types"

type Filter = "all" | "contact" | "project"

const kindLabels = { contact: "Kontakt", project: "Start project" }

type Props = {
  submissions: Submission[] | null
  onChange: (next: Submission[]) => void
  onRefresh: () => Promise<void>
}

export function SubmissionsPanel({ submissions, onChange, onRefresh }: Props) {
  const [filter, setFilter] = useState<Filter>("all")
  const [showArchived, setShowArchived] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState("")

  if (!submissions) return <p className="admin-empty">Duke i ngarku kërkesat…</p>

  const visible = submissions.filter(
    (item) =>
      (filter === "all" || item.kind === filter) &&
      (showArchived || item.status !== "archived"),
  )
  const selected = submissions.find((item) => item.id === selectedId) ?? visible[0]

  async function save(
    item: Submission,
    changes: { status?: SubmissionStatus; notes?: string },
  ) {
    const result = await apiRequest("/api/admin/submissions", {
      method: "PATCH",
      body: { id: item.id, ...changes },
    })
    if (!result.ok) {
      setError(result.error)
      return false
    }
    setError("")
    onChange(submissions!.map((row) => (row.id === item.id ? { ...row, ...changes } : row)))
    return true
  }

  async function remove(item: Submission) {
    if (!window.confirm(`Me fshi kërkesën nga ${item.name}? Kjo s'kthehet mbrapsht.`)) return
    const result = await apiRequest(`/api/admin/submissions?id=${item.id}`, { method: "DELETE" })
    if (!result.ok) return setError(result.error)
    onChange(submissions!.filter((row) => row.id !== item.id))
    setSelectedId(null)
  }

  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h1>Kërkesat</h1>
          <p>Mesazhet nga forma e kontaktit dhe brief-et nga Start project.</p>
        </div>
        <div className="admin-toolbar">
          {(["all", "project", "contact"] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`admin-chip ${filter === key ? "is-active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {key === "all" ? "Të gjitha" : kindLabels[key]}
            </button>
          ))}
          <label className="admin-check">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            Arkivuarat
          </label>
          <button className="admin-button is-ghost" type="button" onClick={() => void onRefresh()}>
            <RefreshCw />
            <span>Rifresko</span>
          </button>
        </div>
      </header>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {!visible.length ? (
        <p className="admin-empty">Asnjë kërkesë ende.</p>
      ) : (
        <div className="admin-split">
          <ul className="admin-list">
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={selected?.id === item.id ? "is-selected" : ""}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="admin-list-top">
                    <strong>{item.name}</strong>
                    <StatusPill status={item.status} label={submissionStatusLabels[item.status]} />
                  </span>
                  <span className="admin-list-meta">
                    {kindLabels[item.kind]} · {formatDate(item.created_at)}
                  </span>
                  <span className="admin-list-preview">{item.message}</span>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <article className="admin-detail">
              <header>
                <span>{kindLabels[selected.kind]} · #{selected.id}</span>
                <h2>{selected.name}</h2>
                <p>{formatDate(selected.created_at)}</p>
              </header>

              <dl className="admin-fields">
                <div>
                  <dt>Email</dt>
                  <dd><a href={`mailto:${selected.email}`}>{selected.email}</a></dd>
                </div>
                {selected.company && (
                  <div><dt>Kompania</dt><dd>{selected.company}</dd></div>
                )}
                {!!selected.details.services?.length && (
                  <div><dt>Shërbimet</dt><dd>{selected.details.services.join(" · ")}</dd></div>
                )}
                {selected.details.engagement && (
                  <div><dt>Bashkëpunimi</dt><dd>{selected.details.engagement}</dd></div>
                )}
                {selected.details.budget && (
                  <div><dt>Buxheti</dt><dd>{selected.details.budget}</dd></div>
                )}
                {selected.details.timeline && (
                  <div><dt>Afati</dt><dd>{selected.details.timeline}</dd></div>
                )}
              </dl>

              <div className="admin-message">
                <span>{selected.kind === "project" ? "Projekti" : "Mesazhi"}</span>
                <p>{selected.message}</p>
              </div>
              {selected.details.success && (
                <div className="admin-message">
                  <span>Suksesi do të thotë</span>
                  <p>{selected.details.success}</p>
                </div>
              )}

              <a
                className="admin-button is-secondary"
                href={`mailto:${selected.email}?subject=${encodeURIComponent(
                  selected.kind === "project" ? "Brief-i juaj te CUBE DESIGNERS" : "Re: mesazhi juaj",
                )}`}
              >
                <Mail />
                Përgjigju me email
              </a>

              <RecordControls
                status={selected.status}
                notes={selected.notes}
                labels={submissionStatusLabels}
                onSave={(changes) => save(selected, changes)}
                onDelete={() => void remove(selected)}
              />
            </article>
          )}
        </div>
      )}
    </section>
  )
}
