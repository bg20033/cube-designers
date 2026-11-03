import { useState, type FormEvent } from "react"
import { Check, Pencil, Phone, Plus, Trash2, X } from "lucide-react"
import InvitationDialog from "./InvitationDialog"
import { calculateBudget, contactStatuses, expenseTotal, formatMoney, guestsForEvent, moneyInput, parseMoney, phoneHref, serviceGroup, serviceGroups, weddingPlan, type ServiceGroup, type WeddingBudget, type WeddingContact, type WeddingExpense, type WeddingPlan } from "./planning-model"
import { ServiceIcon, type PlanningProps } from "./planning-ui"
import type { Wedding } from "./model"
import "./planner.css"

// One row is one person or business: the contact, its agreed price and what was agreed.
type Row = { id: string; group: ServiceGroup; contact?: WeddingContact; expense?: WeddingExpense }
const groupIds = Object.keys(serviceGroups) as ServiceGroup[]
const addLabels: Record<ServiceGroup, string> = { tent: "Shto tendë", photo_video: "Shto video & foto", music: "Shto muzikë", venue: "Shto restorant", decor: "Shto dekor", other: "Shto tjetër" }

export function serviceRows(plan: WeddingPlan): Row[] {
  const linked = new Set(plan.expenses.map((e) => e.vendorId).filter(Boolean))
  return [
    ...plan.expenses.map((expense) => ({ id: expense.id, group: serviceGroup(expense.category), expense, contact: plan.contacts.find((c) => c.id === expense.vendorId) })),
    ...plan.contacts.filter((c) => !linked.has(c.id)).map((contact) => ({ id: contact.id, group: serviceGroup(contact.category), contact })),
  ]
}

export function saveRow(plan: WeddingPlan, row: Row, values: { group: ServiceGroup; name: string; person: string; phone: string; status: WeddingContact["status"]; pricing: WeddingExpense["pricing"]; eventId: string; unitCents: number; paidCents: number; deal: string }): WeddingPlan {
  // Keep a finer category (e.g. "Veshjet") unless the row was moved to another group.
  const keep = (category: string | undefined) => category && serviceGroup(category) === values.group ? category : values.group
  const contact: WeddingContact = { id: crypto.randomUUID(), email: "", website: "", city: "", eventIds: [], ...row.contact,
    name: values.name, person: values.person, phone: values.phone, status: values.status, category: keep(row.contact?.category) as WeddingContact["category"], notes: "" }
  const expense: WeddingExpense = { id: crypto.randomUUID(), dueDate: "", ...row.expense,
    label: values.name, category: keep(row.expense?.category) as WeddingExpense["category"], vendorId: contact.id, pricing: values.pricing,
    eventId: values.pricing === "per_guest" ? values.eventId : row.expense?.eventId ?? "", unitCents: values.unitCents, quantity: 1, paidCents: values.paidCents, notes: values.deal }
  const upsert = <T extends { id: string }>(items: T[], item: T) => items.some((i) => i.id === item.id) ? items.map((i) => i.id === item.id ? item : i) : [...items, item]
  return { ...plan, contacts: upsert(plan.contacts, contact), expenses: upsert(plan.expenses, expense) }
}

function rowTotal(wedding: Wedding, budget: WeddingBudget, row: Row) { return row.expense ? expenseTotal(wedding, budget, row.expense) : 0 }

function RowEditor({ row, wedding, plan, onSave, onClose, busy, serverError }: {
  row: Row; wedding: Wedding; plan: WeddingPlan; onSave: (plan: WeddingPlan) => Promise<boolean>; onClose: () => void; busy: boolean; serverError: string
}) {
  const mainEvent = wedding.events.find((e) => e.id === "dasma") ?? wedding.events[0]
  const fixedTotal = row.expense ? row.expense.unitCents * (row.expense.pricing === "fixed" ? row.expense.quantity : 1) : 0
  const [draft, setDraft] = useState({
    group: row.group, name: row.contact?.name ?? row.expense?.label ?? "", person: row.contact?.person ?? "", phone: row.contact?.phone ?? "",
    status: row.contact?.status ?? "contacted" as WeddingContact["status"], pricing: row.expense?.pricing ?? (row.group === "venue" ? "per_guest" : "fixed") as WeddingExpense["pricing"],
    eventId: row.expense?.eventId || mainEvent.id, price: fixedTotal ? moneyInput(fixedTotal) : "", paid: row.expense?.paidCents ? moneyInput(row.expense.paidCents) : "",
    deal: row.expense?.notes || row.contact?.notes || "",
  })
  const [error, setError] = useState("")
  const [waiting, setWaiting] = useState(false)
  const set = (values: Partial<typeof draft>) => setDraft({ ...draft, ...values })
  const unitCents = parseMoney(draft.price || "0"), paidCents = parseMoney(draft.paid || "0")
  const guests = guestsForEvent(wedding, draft.eventId, plan.budget)
  const priceCents = (unitCents ?? 0) * (draft.pricing === "per_guest" ? guests : 1)
  // A warning only: an advance can legitimately exceed a price that is still being agreed.
  const overpaid = priceCents > 0 && paidCents !== null && paidCents > priceCents ? paidCents - priceCents : 0
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (waiting || busy) return
    if (!draft.name.trim()) { setError("Shkruaj emrin."); return }
    if (draft.phone.trim() && !/^\+?[\d\s().-]{3,40}$/.test(draft.phone.trim())) { setError("Telefoni duhet të përmbajë vetëm numrin dhe, nëse duhet, prefiksin +."); return }
    if (unitCents === null || paidCents === null) { setError("Shkruaj shumat si 1200 ose 1200,50."); return }
    if (!row.contact && plan.contacts.length >= 500 || !row.expense && plan.expenses.length >= 300) { setError("Lista është plot. Hiq diçka që nuk të duhet më."); return }
    setWaiting(true); setError("")
    const next = saveRow(plan, row, { ...draft, name: draft.name.trim(), person: draft.person.trim(), phone: draft.phone.trim(), deal: draft.deal.trim(), unitCents, paidCents })
    if (await onSave(next)) onClose()
    else setError("Nuk u ruajt. Provo përsëri.")
    setWaiting(false)
  }
  return <InvitationDialog title={row.contact || row.expense ? "Ndrysho" : addLabels[row.group]} onClose={onClose}><form className="inv-form inv-planner-form" onSubmit={submit}>
    <fieldset disabled={waiting || busy}>
      <div className="inv-form-row"><label>Për çka<select value={draft.group} onChange={(e) => set({ group: e.target.value as ServiceGroup })}>{groupIds.map((id) => <option key={id} value={id}>{serviceGroups[id]}</option>)}</select></label><label>Statusi<select value={draft.status} onChange={(e) => set({ status: e.target.value as WeddingContact["status"] })}>{Object.entries(contactStatuses).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
      <label>Emri<input autoFocus required maxLength={150} value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="p.sh. Tenda Gashi, DJ Arti, Restorant Emerald" /></label>
      <div className="inv-form-row"><label>Personi<input maxLength={100} value={draft.person} onChange={(e) => set({ person: e.target.value })} /></label><label>Telefoni<input type="tel" maxLength={40} value={draft.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+383 …" /></label></div>
      <div className="inv-pricing-toggle" role="group" aria-label="Si llogaritet çmimi"><button type="button" aria-pressed={draft.pricing === "fixed"} onClick={() => set({ pricing: "fixed" })}>Çmim i plotë</button><button type="button" aria-pressed={draft.pricing === "per_guest"} onClick={() => set({ pricing: "per_guest" })}>Për person</button></div>
      <div className="inv-form-row"><label>{draft.pricing === "per_guest" ? "Çmimi për person (€)" : "Çmimi (€)"}<input inputMode="decimal" value={draft.price} onChange={(e) => set({ price: e.target.value })} placeholder="0" /></label><label>Paguar deri tani (€)<input inputMode="decimal" value={draft.paid} onChange={(e) => set({ paid: e.target.value })} placeholder="0" aria-describedby={overpaid ? "inv-overpaid-warning" : undefined} /></label></div>
      {overpaid > 0 && <p id="inv-overpaid-warning" className="inv-plan-warning" role="status">Paguar më shumë se çmimi: {formatMoney(overpaid)} mbi {formatMoney(priceCents)}. Kontrollo shumat. Mund ta ruash edhe kështu.</p>}
      {draft.pricing === "per_guest" && <><label>Për cilin event<select value={draft.eventId} onChange={(e) => set({ eventId: e.target.value })}>{wedding.events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label><div className="inv-expense-calculation"><span>{guests} persona × {formatMoney(unitCents ?? 0)}</span><strong>{formatMoney((unitCents ?? 0) * guests)}</strong></div></>}
      <label>Si u morëm vesh<textarea rows={3} maxLength={2000} value={draft.deal} onChange={(e) => set({ deal: e.target.value })} placeholder="p.sh. 6 orë muzikë, paradhënie 200 €, pjesa tjetër ditën e dasmës" /></label>
    </fieldset>
    {(serverError || error) && <p className="inv-form-error" role="alert">{serverError || error}</p>}
    <div className="inv-form-actions"><button type="button" className="inv-button inv-button-outline" onClick={onClose}>Anulo</button><button type="submit" className="inv-button inv-button-primary" disabled={waiting || busy}><Check size={16} />{waiting ? "Duke ruajtur…" : "Ruaj"}</button></div>
  </form></InvitationDialog>
}

export default function WeddingPlanner({ wedding, onSave, busy, error }: PlanningProps) {
  const plan = weddingPlan(wedding)
  const summary = calculateBudget(wedding, plan)
  const rows = serviceRows(plan)
  const [editor, setEditor] = useState<Row | null>(null)
  const [deleting, setDeleting] = useState<Row | null>(null)
  const [target, setTarget] = useState(plan.budget.targetCents ? moneyInput(plan.budget.targetCents) : "")
  const [customGuests, setCustomGuests] = useState(String(plan.budget.customGuests))
  const [task, setTask] = useState("")
  const mainEvent = wedding.events.find((e) => e.id === "dasma") ?? wedding.events[0]
  const saveBudget = (budget: Partial<WeddingBudget>) => onSave({ ...plan, budget: { ...plan.budget, ...budget } }, "Buxheti u ruajt.")
  function saveTarget() {
    const cents = parseMoney(target || "0")
    if (cents !== null && cents !== plan.budget.targetCents) void saveBudget({ targetCents: cents })
  }
  function saveCustomGuests() {
    const count = Number(customGuests)
    if (Number.isInteger(count) && count >= 0 && count <= 10000 && count !== plan.budget.customGuests) void saveBudget({ customGuests: count })
  }
  async function remove(row: Row) {
    const sharedContact = row.contact && plan.expenses.some((e) => e.vendorId === row.contact!.id && e.id !== row.expense?.id)
    const next = { ...plan, expenses: plan.expenses.filter((e) => e.id !== row.expense?.id), contacts: sharedContact ? plan.contacts : plan.contacts.filter((c) => c.id !== row.contact?.id) }
    if (await onSave(next, "U hoq nga lista.")) setDeleting(null)
  }
  async function addTask(event: FormEvent) {
    event.preventDefault()
    if (!task.trim() || busy || plan.tasks.length >= 500) return
    if (await onSave({ ...plan, tasks: [...plan.tasks, { id: crypto.randomUUID(), title: task.trim(), eventId: "", dueDate: "", done: false }] }, "Detyra u shtua.")) setTask("")
  }
  const left = plan.budget.targetCents - summary.totalCents
  const tasksDone = plan.tasks.filter((t) => t.done).length

  return <div className="inv-plan">
    <section className="inv-plan-summary" aria-label="Sa kushton dasma">
      <div className="inv-plan-total"><span>Gjithsej{plan.budget.reservePercent ? ` (me ${plan.budget.reservePercent}% rezervë)` : ""}</span><strong data-testid="budget-total">{formatMoney(summary.totalCents)}</strong></div>
      <div><span>Paguar</span><strong>{formatMoney(summary.paidCents)}</strong></div>
      <div><span>Mbeten për pagesë</span><strong data-testid="budget-outstanding">{formatMoney(summary.outstandingCents)}</strong></div>
      <label className="inv-plan-target"><span>Buxheti ynë (€)</span><input inputMode="decimal" value={target} disabled={busy} onChange={(e) => setTarget(e.target.value)} onBlur={saveTarget} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }} placeholder="p.sh. 15000" />{plan.budget.targetCents > 0 && <small className={left < 0 ? "is-over" : ""}>{left < 0 ? `${formatMoney(-left)} mbi buxhet` : `${formatMoney(left)} të lira`}</small>}</label>
    </section>
    {summary.overpaidCents > 0 && <p className="inv-plan-warning" role="note">{formatMoney(summary.overpaidCents)} janë paguar mbi çmimin e disa shërbimeve. Nuk zbriten nga pagesat e tjera.</p>}
    <p className="inv-plan-guests">Çmimet për person llogariten me{" "}
      <select aria-label="Numri i personave për çmimet për person" value={plan.budget.guestSource} disabled={busy} onChange={(e) => void saveBudget({ guestSource: e.target.value as WeddingBudget["guestSource"] })}><option value="invited">të ftuarit</option><option value="confirmed">të konfirmuarit</option><option value="custom">numrin tim</option></select>
      {plan.budget.guestSource === "custom" ? <input type="number" min={0} max={10000} aria-label="Numri i personave" value={customGuests} disabled={busy} onChange={(e) => setCustomGuests(e.target.value)} onBlur={saveCustomGuests} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }} /> : <strong>{guestsForEvent(wedding, mainEvent.id, plan.budget)} persona në {mainEvent.name}</strong>}
    </p>

    <div className="inv-plan-groups">{groupIds.map((group) => {
      const items = rows.filter((row) => row.group === group)
      const subtotal = items.reduce((sum, row) => sum + rowTotal(wedding, plan.budget, row), 0)
      return <section className="inv-plan-group" key={group} aria-label={serviceGroups[group]}>
        <header><span className={`inv-service-icon inv-category-${group}`}><ServiceIcon category={group} size={18} /></span><h2>{serviceGroups[group]}</h2>{subtotal > 0 && <strong>{formatMoney(subtotal)}</strong>}<button className="inv-button inv-button-outline" disabled={busy} onClick={() => setEditor({ id: "", group })}><Plus size={14} />Shto</button></header>
        {items.map((row) => {
          const total = rowTotal(wedding, plan.budget, row), paid = row.expense?.paidCents ?? 0, deal = row.expense?.notes || row.contact?.notes
          return <article className="inv-plan-row" key={row.id}>
            <div className="inv-plan-who"><strong>{row.contact?.name ?? row.expense?.label}</strong>{row.contact && <span className={`inv-contact-status inv-contact-status-${row.contact.status}`}>{contactStatuses[row.contact.status]}</span>}<small>{row.contact?.person}{row.contact?.phone && <a href={phoneHref(row.contact.phone)}><Phone size={12} />{row.contact.phone}</a>}</small></div>
            <p className="inv-plan-deal">{deal || <span>Shkruaj si u morët vesh…</span>}</p>
            <dl className="inv-plan-money"><div><dt>Çmimi</dt><dd>{total ? formatMoney(total) : "—"}</dd>{row.expense?.pricing === "per_guest" && <small>{guestsForEvent(wedding, row.expense.eventId, plan.budget)} × {formatMoney(row.expense.unitCents)}</small>}</div><div><dt>Paguar</dt><dd>{formatMoney(paid)}</dd>{total > 0 && paid > total && <small className="inv-plan-over">{formatMoney(paid - total)} mbi çmim</small>}</div><div><dt>Mbeten</dt><dd className={total > paid ? "inv-amount-due" : ""}>{formatMoney(Math.max(0, total - paid))}</dd></div></dl>
            <div className="inv-plan-actions"><button className="inv-icon-button" aria-label={`Ndrysho ${row.contact?.name ?? row.expense?.label}`} onClick={() => setEditor(row)}><Pencil size={15} /></button><button className="inv-icon-button inv-delete-button" aria-label={`Hiq ${row.contact?.name ?? row.expense?.label}`} onClick={() => setDeleting(row)}><Trash2 size={15} /></button></div>
          </article>
        })}
        {!items.length && <button className="inv-plan-empty" disabled={busy} onClick={() => setEditor({ id: "", group })}><Plus size={14} />{addLabels[group]}</button>}
      </section>
    })}</div>

    <section className="inv-plan-tasks" aria-label="Detyrat">
      <header><h2>Detyrat</h2><span>{tasksDone} nga {plan.tasks.length} të kryera</span></header>
      <form onSubmit={addTask}><input aria-label="Detyrë e re" maxLength={200} value={task} onChange={(e) => setTask(e.target.value)} placeholder="Shto detyrë, p.sh. Konfirmo orarin me fotografin" disabled={busy} /><button className="inv-button inv-button-primary" disabled={busy || !task.trim()}><Plus size={15} />Shto</button></form>
      <ul>{plan.tasks.toSorted((a, b) => Number(a.done) - Number(b.done)).map((t) => <li key={t.id} className={t.done ? "is-done" : ""}><label className="inv-task-checkbox"><input type="checkbox" aria-label={`Kryer: ${t.title}`} checked={t.done} disabled={busy} onChange={() => void onSave({ ...plan, tasks: plan.tasks.map((item) => item.id === t.id ? { ...item, done: !item.done } : item) }, t.done ? "Detyra u rihap." : "Detyra u krye.")} /><span><Check size={13} /></span></label><span>{t.title}</span><button className="inv-icon-button inv-delete-button" aria-label={`Hiq detyrën ${t.title}`} disabled={busy} onClick={() => void onSave({ ...plan, tasks: plan.tasks.filter((item) => item.id !== t.id) }, "Detyra u hoq.")}><X size={14} /></button></li>)}</ul>
    </section>

    {editor && <RowEditor row={editor} wedding={wedding} plan={plan} busy={busy} serverError={error} onClose={() => setEditor(null)} onSave={(next) => onSave(next, "U ruajt.")} />}
    {deleting && <InvitationDialog title="Ta heqim nga lista?" onClose={() => setDeleting(null)}><div className="inv-form"><p><strong>{deleting.contact?.name ?? deleting.expense?.label}</strong> do të hiqet bashkë me çmimin dhe pagesat.</p>{error && <p className="inv-form-error" role="alert">{error}</p>}<div className="inv-form-actions"><button className="inv-button inv-button-outline" onClick={() => setDeleting(null)}>Mbaje</button><button className="inv-button inv-button-danger" disabled={busy} onClick={() => void remove(deleting)}>Hiqe</button></div></div></InvitationDialog>}
  </div>
}
