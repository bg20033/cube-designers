import { useState, type FormEvent } from "react"
import { CalendarDays, Check, CheckCheck, CircleCheck, ListChecks, Pencil, Plus, Trash2 } from "lucide-react"
import InvitationDialog from "./InvitationDialog"
import { formatDate } from "./model"
import { todayInKosovo, weddingPlan, type WeddingTask } from "./planning-model"
import type { PlanningProps } from "./planning-ui"

function TaskEditor({ task, wedding, onSave, onClose, busy, serverError }: {
  task?: WeddingTask; wedding: PlanningProps["wedding"]; onSave: (task: WeddingTask) => Promise<boolean>
  onClose: () => void; busy: boolean; serverError: string
}) {
  const [draft, setDraft] = useState<WeddingTask>(() => task ?? { id: crypto.randomUUID(), title: "", eventId: "", dueDate: "", done: false })
  const [error, setError] = useState("")
  const [waiting, setWaiting] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (waiting || busy) return
    if (!draft.title.trim()) { setError("Shkruaj çfarë duhet bërë."); return }
    setWaiting(true)
    if (await onSave({ ...draft, title: draft.title.trim() })) onClose()
    else setError("Detyra nuk u ruajt. Provo përsëri.")
    setWaiting(false)
  }
  return <InvitationDialog title={task ? "Ndrysho detyrën" : "Edhe një detaj, në vendin e vet"} onClose={onClose}><form className="inv-form inv-planner-form" onSubmit={submit}><fieldset disabled={busy || waiting}><label>Çfarë duhet bërë?<input autoFocus required maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="p.sh. Konfirmo orarin me fotografin" /></label><div className="inv-form-row"><label>Afati<input type="date" min="2020-01-01" max="2100-12-31" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} /></label><label>Eventi<select value={draft.eventId} onChange={(e) => setDraft({ ...draft, eventId: e.target.value })}><option value="">Planifikimi i përgjithshëm</option>{wedding.events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label></div></fieldset>{(serverError || error) && <p className="inv-form-error" role="alert">{serverError || error}</p>}<div className="inv-form-actions"><button type="button" className="inv-button inv-button-outline" onClick={onClose}>Anulo</button><button type="submit" className="inv-button inv-button-primary" disabled={busy || waiting}><Check size={16} />Ruaj detyrën</button></div></form></InvitationDialog>
}

export default function WeddingChecklist({ wedding, onSave, busy, error }: PlanningProps) {
  const plan = weddingPlan(wedding)
  const [filter, setFilter] = useState("pending")
  const [editor, setEditor] = useState<WeddingTask | "new" | null>(null)
  const [deleting, setDeleting] = useState<WeddingTask | null>(null)
  const today = todayInKosovo()
  const completed = plan.tasks.filter((t) => t.done).length
  const overdue = plan.tasks.filter((t) => !t.done && t.dueDate && t.dueDate < today).length
  const progress = plan.tasks.length ? Math.round(completed / plan.tasks.length * 100) : 0
  const visible = plan.tasks.filter((t) => filter === "all" || filter === "done" && t.done || filter === "pending" && !t.done || filter === "overdue" && !t.done && t.dueDate && t.dueDate < today).toSorted((a, b) => Number(a.done) - Number(b.done) || (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))
  async function save(task: WeddingTask) {
    const exists = plan.tasks.some((t) => t.id === task.id)
    return onSave({ ...plan, tasks: exists ? plan.tasks.map((t) => t.id === task.id ? task : t) : [...plan.tasks, task] }, "Detyra u ruajt në planin tuaj.")
  }
  return <div className="inv-planner"><section className="inv-task-hero"><span className="inv-service-icon"><ListChecks size={28} /></span><div><span className="inv-eyebrow">HAP PAS HAPI, DREJT DITËS SUAJ</span><h2>Pak më afër <em>gjithçkaje gati.</em></h2><p>{completed} nga {plan.tasks.length} detyra të përfunduara{overdue ? ` · ${overdue} me afat të kaluar` : ""}.</p><div className="inv-task-progress" role="progressbar" aria-label="Përfundimi i detyrave" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div></div><strong>{progress}<small>%</small></strong></section><section className="inv-panel inv-tasks-panel"><div className="inv-panel-heading"><div><h2>Lista juaj e detyrave</h2><p>Vendosni afatet tuaja dhe ndiqni çfarë ka mbetur.</p></div><button className="inv-button inv-button-primary" onClick={() => setEditor("new")} disabled={busy || plan.tasks.length >= 500}><Plus size={16} />Shto detyrë</button></div><div className="inv-task-filters" role="group" aria-label="Filtro detyrat">{[{ id: "pending", label: "Për t’u bërë", count: plan.tasks.length - completed }, { id: "done", label: "Të kryera", count: completed }, { id: "overdue", label: "Afati kaloi", count: overdue }, { id: "all", label: "Të gjitha", count: plan.tasks.length }].map((f) => <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}<span>{f.count}</span></button>)}</div><div className="inv-task-list">{visible.map((task) => <article key={task.id} className={`inv-task-row${task.done ? " is-done" : ""}`}><label className="inv-task-checkbox"><input type="checkbox" aria-label={`Përfundo: ${task.title}`} checked={task.done} disabled={busy} onChange={() => void save({ ...task, done: !task.done })} /><span><Check size={13} /></span></label><div className="inv-task-copy"><h3>{task.title}</h3><p>{task.dueDate && <span className={!task.done && task.dueDate < today ? "inv-task-overdue" : ""}><CalendarDays size={12} />{formatDate(task.dueDate, true)}</span>}{task.eventId && <span>{wedding.events.find((e) => e.id === task.eventId)?.name}</span>}{!task.dueDate && !task.eventId && <span>Pa afat të caktuar</span>}</p></div><div className="inv-task-row-actions">{task.done && <span className="inv-task-done-label"><CheckCheck size={13} />U krye</span>}<button className="inv-icon-button" aria-label={`Ndrysho detyrën ${task.title}`} onClick={() => setEditor(task)}><Pencil size={15} /></button><button className="inv-icon-button inv-delete-button" aria-label={`Hiq detyrën ${task.title}`} onClick={() => setDeleting(task)}><Trash2 size={15} /></button></div></article>)}</div>{!visible.length && <div className="inv-empty"><CircleCheck size={32} /><h3>{filter === "pending" && plan.tasks.length ? "Gjithçka nga lista është kryer." : "Asnjë detyrë në këtë përzgjedhje"}</h3><p>Mund të shtosh një detyrë të re ose të zgjedhësh një filtër tjetër.</p></div>}</section>
    {editor && <TaskEditor task={editor === "new" ? undefined : editor} wedding={wedding} onSave={save} onClose={() => setEditor(null)} busy={busy} serverError={error} />}
    {deleting && <InvitationDialog title="Të hiqet kjo detyrë?" onClose={() => setDeleting(null)}><div className="inv-form"><p>{deleting.title}</p>{error && <p className="inv-form-error" role="alert">{error}</p>}<div className="inv-form-actions"><button className="inv-button inv-button-outline" onClick={() => setDeleting(null)}>Mbaje detyrën</button><button className="inv-button inv-button-danger" disabled={busy} onClick={async () => { if (await onSave({ ...plan, tasks: plan.tasks.filter((t) => t.id !== deleting.id) }, "Detyra u hoq nga lista.")) setDeleting(null) }}>Hiqe detyrën</button></div></div></InvitationDialog>}
  </div>
}
