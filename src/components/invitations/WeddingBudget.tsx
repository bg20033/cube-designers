import { useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowDownToLine, ArrowUpRight, Calculator, Check, CircleHelp, Coins, Pencil, Plus, Receipt, Save, ShieldCheck, Trash2, Wallet } from "lucide-react"
import InvitationDialog from "./InvitationDialog"
import { BudgetCharts } from "./WeddingCharts"
import { formatDate } from "./model"
import { calculateBudget, expenseCategories, expenseTotal, formatMoney, guestsForEvent, moneyInput, parseMoney, todayInKosovo, weddingPlan, type ExpenseCategory, type WeddingBudget as BudgetSettings, type WeddingContact, type WeddingExpense } from "./planning-model"
import { budgetCsv, downloadCsv } from "./planning-export"
import { ServiceIcon, type PlanningProps } from "./planning-ui"

function newExpense(eventId: string, contact?: WeddingContact): WeddingExpense {
  const category: ExpenseCategory = contact?.category === "photo" || contact?.category === "video" ? "photo_video" : contact?.category && Object.hasOwn(expenseCategories, contact.category) ? contact.category as ExpenseCategory : "other"
  return { id: crypto.randomUUID(), label: contact?.name ?? "", category, eventId: contact?.eventIds[0] ?? eventId, vendorId: contact?.id ?? "", pricing: "fixed", unitCents: 0, quantity: 1, paidCents: 0, dueDate: "", notes: "" }
}

function ExpenseEditor({ expense, wedding, budget, contacts, onSave, onClose, busy, serverError }: {
  expense: WeddingExpense; wedding: PlanningProps["wedding"]; budget: BudgetSettings; contacts: WeddingContact[]
  onSave: (expense: WeddingExpense) => Promise<boolean>; onClose: () => void; busy: boolean; serverError: string
}) {
  const [draft, setDraft] = useState(expense)
  const [amount, setAmount] = useState(expense.unitCents ? moneyInput(expense.unitCents) : "")
  const [paid, setPaid] = useState(moneyInput(expense.paidCents))
  const [error, setError] = useState("")
  const [waiting, setWaiting] = useState(false)
  const value = { ...draft, unitCents: parseMoney(amount) ?? 0, paidCents: parseMoney(paid) ?? 0 }
  const calculated = expenseTotal(wedding, budget, value)
  const count = draft.pricing === "per_guest" ? guestsForEvent(wedding, draft.eventId, budget) : draft.quantity
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (waiting || busy) return
    const unitCents = parseMoney(amount), paidCents = parseMoney(paid)
    if (!draft.label.trim()) { setError("Shkruaj emrin e shpenzimit."); return }
    if (unitCents === null || paidCents === null) { setError("Vendos shuma pozitive me deri në dy shifra pas presjes, p.sh. 1200,50."); return }
    if (!Number.isInteger(draft.quantity) || draft.quantity < 1 || draft.quantity > 10000) { setError("Sasia duhet të jetë nga 1 deri në 10000."); return }
    if (draft.pricing === "per_guest" && !draft.eventId) { setError("Për çmimin për mysafir, zgjidh eventin."); return }
    setWaiting(true); setError("")
    if (await onSave({ ...draft, label: draft.label.trim(), unitCents, paidCents })) onClose()
    else setError("Shpenzimi nuk u ruajt. Provo përsëri.")
    setWaiting(false)
  }
  return <InvitationDialog title="Detajet e shpenzimit" onClose={onClose}><form className="inv-form inv-planner-form" onSubmit={submit}>
    <fieldset disabled={waiting || busy}>
      <label>Emri i shpenzimit<input autoFocus required maxLength={150} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="p.sh. Menuja, fotografi ose muzika" /></label>
      <div className="inv-form-row"><label>Kategoria<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ExpenseCategory })}>{Object.entries(expenseCategories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Eventi<select value={draft.eventId} onChange={(e) => setDraft({ ...draft, eventId: e.target.value })}><option value="" disabled={draft.pricing === "per_guest"}>Të gjitha / i përbashkët</option>{wedding.events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label></div>
      <div className="inv-pricing-toggle" role="group" aria-label="Mënyra e llogaritjes"><button type="button" aria-pressed={draft.pricing === "fixed"} onClick={() => setDraft({ ...draft, pricing: "fixed" })}>Shumë fikse</button><button type="button" aria-pressed={draft.pricing === "per_guest"} onClick={() => setDraft({ ...draft, pricing: "per_guest", eventId: draft.eventId || wedding.events.find((e) => e.id === "dasma")?.id || wedding.events[0].id, quantity: 1 })}>Për mysafir</button></div>
      <div className="inv-form-row"><label>{draft.pricing === "per_guest" ? "Çmimi për mysafir (€)" : "Çmimi për njësi (€)"}<input inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></label>{draft.pricing === "fixed" ? <label>Sasia<input type="number" min={1} max={10000} required value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} /></label> : <div className="inv-guest-calculation"><span>Mysafirë në këtë skenar</span><strong>{count}</strong></div>}</div>
      <div className="inv-expense-calculation"><span>{count} × {formatMoney(value.unitCents)}</span><strong>{formatMoney(calculated)}</strong></div>
      {draft.pricing === "per_guest" && count === 0 && <p className="inv-planner-inline-note">Skenari aktual ka 0 mysafirë në këtë event. Ndrysho burimin e numrit te kalkulatori për ta parashikuar koston.</p>}
      <div className="inv-form-row"><label>Paguar deri tani (€)<input inputMode="decimal" required value={paid} onChange={(e) => setPaid(e.target.value)} /></label><label>Afati i pagesës<input type="date" min="2020-01-01" max="2100-12-31" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} /></label></div>
      {value.paidCents > calculated && <p className="inv-planner-inline-note">Shuma e paguar e kalon koston e këtij skenari me {formatMoney(value.paidCents - calculated)}. Kontrollo numrin e mysafirëve ose marrëveshjen.</p>}
      <label>Kontakti i lidhur<select value={draft.vendorId} onChange={(e) => setDraft({ ...draft, vendorId: e.target.value })}><option value="">Pa kontakt të lidhur</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><small>Kontaktet i shton te seksioni “Kontaktet”.</small></label>
      <label>Shënime private<textarea rows={2} maxLength={2000} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Çfarë përfshihet në ofertë, këstet, detajet…" /></label>
    </fieldset>
    {(serverError || error) && <p className="inv-form-error" role="alert">{serverError || error}</p>}
    <div className="inv-form-actions"><button className="inv-button inv-button-outline" type="button" onClick={onClose}>Anulo</button><button className="inv-button inv-button-primary" type="submit" disabled={waiting || busy}><Check size={16} />{waiting ? "Duke ruajtur…" : "Ruaj shpenzimin"}</button></div>
  </form></InvitationDialog>
}

export default function WeddingBudget({ wedding, onSave, busy, error, contactToAdd = "" }: PlanningProps & { contactToAdd?: string }) {
  const plan = weddingPlan(wedding)
  const [draft, setDraft] = useState(plan.budget)
  const [target, setTarget] = useState(moneyInput(plan.budget.targetCents))
  const lastBudget = useRef(JSON.stringify(plan.budget))
  const savedBudget = JSON.stringify(plan.budget)
  const [formError, setFormError] = useState("")
  const [filter, setFilter] = useState<ExpenseCategory | "">("")
  const [eventFilter, setEventFilter] = useState("")
  const mainEvent = wedding.events.find((e) => e.id === "dasma") ?? wedding.events[0]
  const [editor, setEditor] = useState<WeddingExpense | null>(() => contactToAdd ? newExpense(mainEvent.id, plan.contacts.find((c) => c.id === contactToAdd)) : null)
  const [deleting, setDeleting] = useState<WeddingExpense | null>(null)
  const liveBudget = { ...draft, targetCents: parseMoney(target) ?? 0,
    reservePercent: Math.max(0, Math.min(50, Number.isFinite(draft.reservePercent) ? draft.reservePercent : 0)),
    customGuests: Math.max(0, Math.min(10000, Number.isFinite(draft.customGuests) ? draft.customGuests : 0)),
  }
  const dirty = JSON.stringify({ ...draft, targetCents: parseMoney(target) ?? 0 }) !== savedBudget || parseMoney(target) === null
  useEffect(() => {
    if (savedBudget === lastBudget.current) return
    if (JSON.stringify({ ...draft, targetCents: parseMoney(target) ?? 0 }) === lastBudget.current) { setDraft(plan.budget); setTarget(moneyInput(plan.budget.targetCents)) }
    lastBudget.current = savedBudget
  }, [savedBudget])
  const previewPlan = { ...plan, budget: liveBudget }
  const summary = calculateBudget(wedding, previewPlan)
  const mainGuests = guestsForEvent(wedding, mainEvent.id, liveBudget)
  const progress = liveBudget.targetCents > 0 ? Math.min(100, summary.totalCents / liveBudget.targetCents * 100) : 0
  const categories = Object.entries(summary.categories).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]) as [ExpenseCategory, number][]
  const visible = plan.expenses.filter((e) => (!filter || e.category === filter) && (!eventFilter || e.eventId === eventFilter))
  const today = todayInKosovo()
  const overdue = plan.expenses.filter((e) => e.dueDate && e.dueDate < today && expenseTotal(wedding, liveBudget, e) > e.paidCents)
  async function saveSettings(event: FormEvent) {
    event.preventDefault()
    const cents = parseMoney(target)
    if (cents === null || !Number.isInteger(draft.reservePercent) || draft.reservePercent < 0 || draft.reservePercent > 50 || !Number.isInteger(draft.customGuests) || draft.customGuests < 0 || draft.customGuests > 10000) { setFormError("Kontrollo buxhetin, rezervën 0–50% dhe numrin 0–10000 të mysafirëve."); return }
    if (await onSave({ ...plan, budget: { ...draft, targetCents: cents } }, "Buxheti dhe skenari u ruajtën.")) setFormError("")
  }
  async function saveExpense(expense: WeddingExpense) {
    const exists = plan.expenses.some((e) => e.id === expense.id)
    return onSave({ ...plan, expenses: exists ? plan.expenses.map((e) => e.id === expense.id ? expense : e) : [...plan.expenses, expense] }, "Shpenzimi u ruajt në buxhet.")
  }
  return <div className="inv-planner">
    <section className="inv-budget-hero"><div className="inv-budget-hero-main"><span className="inv-eyebrow"><Calculator size={13} />NJË PLAN PËR ÇDO DETAJ</span><span className="inv-budget-total-label">Kostoja e parashikuar me rezervë</span><strong className="inv-budget-total" data-testid="budget-total">{formatMoney(summary.totalCents)}</strong><div className="inv-budget-target-line"><span>Limiti juaj: <strong>{formatMoney(liveBudget.targetCents)}</strong></span><span className={summary.availableCents < 0 ? "inv-budget-over" : ""}>{liveBudget.targetCents > 0 ? `${formatMoney(Math.abs(summary.availableCents))} ${summary.availableCents < 0 ? "mbi buxhet" : "hapësirë"}` : "Vendosni limitin tuaj më poshtë"}</span></div><div className="inv-budget-progress" role="progressbar" aria-label="Pjesa e buxhetit të planifikuar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span className={summary.availableCents < 0 ? "is-over" : ""} style={{ width: `${progress}%` }} /></div><p>Shifrat bazohen në çmimet që vendosni ju. {dirty ? "Po shihni një skenar të paruajtur." : "Skenari juaj është i ruajtur."}</p></div><div className="inv-budget-hero-side"><span className="inv-budget-wallet"><Wallet size={26} strokeWidth={1.4} /></span><span>Mbeten për pagesë</span><strong data-testid="budget-outstanding">{formatMoney(summary.outstandingCents)}</strong><p>Pa përfshirë rezervën {formatMoney(summary.reserveCents)}.</p><div><Check size={15} />{formatMoney(summary.paidCents)} të paguara</div></div></section>
    <form className="inv-panel inv-budget-controls inv-planner-form" onSubmit={saveSettings}><div className="inv-budget-controls-heading"><div><h2>Skenari juaj i dasmës</h2><p>Ndrysho numrat dhe shiko menjëherë si ndryshon totali.</p></div>{dirty && <span className="inv-unsaved-badge">Parapamje e paruajtur</span>}</div><fieldset disabled={busy}><label>Limiti i buxhetit (€)<input inputMode="decimal" required value={target} onChange={(e) => setTarget(e.target.value)} /></label><label>Llogarit mysafirët sipas<select value={draft.guestSource} onChange={(e) => setDraft({ ...draft, guestSource: e.target.value as BudgetSettings["guestSource"] })}><option value="invited">Të ftuarve</option><option value="confirmed">Të konfirmuarve</option><option value="custom">Një numri që vendos vetë</option></select></label>{draft.guestSource === "custom" && <label>Numri për çdo event<input type="number" required min={0} max={10000} value={draft.customGuests} onChange={(e) => setDraft({ ...draft, customGuests: Number(e.target.value) })} /></label>}<label>Rezerva (%)<input type="number" required min={0} max={50} value={draft.reservePercent} onChange={(e) => setDraft({ ...draft, reservePercent: Number(e.target.value) })} /></label><button type="submit" className="inv-button inv-button-primary" disabled={!dirty || busy}><Save size={16} />Ruaj skenarin</button></fieldset>{formError && <p role="alert" className="inv-form-error">{formError}</p>}<p className="inv-budget-method"><CircleHelp size={14} />{draft.guestSource === "custom" ? "Numri manual zbatohet për çdo shpenzim për mysafir. Shpenzimet fikse nuk ndryshojnë." : "Për çdo shpenzim për mysafir, përdoret numri i atij eventi. I njëjti mysafir në dy evente llogaritet në të dyja menutë."}</p></form>
    <div className="inv-budget-metrics"><div><span><Receipt size={16} />Shpenzimet bazë</span><strong>{formatMoney(summary.baseCents)}</strong></div><div><span><ShieldCheck size={16} />Rezerva {liveBudget.reservePercent}%</span><strong>{formatMoney(summary.reserveCents)}</strong></div><div><span><Coins size={16} />Mesatarja për mysafir</span><strong>{mainGuests ? formatMoney(Math.round(summary.totalCents / mainGuests)) : "—"}</strong><small>Totali / {mainGuests} mysafirë në {mainEvent.name}</small></div></div>
    {(overdue.length > 0 || summary.overpaidCents > 0) && <div className="inv-budget-alert" role="status">{overdue.length > 0 && <p>{overdue.length} shpenzime kanë afat pagese të kaluar dhe ende kanë shumë të mbetur.</p>}{summary.overpaidCents > 0 && <p>{formatMoney(summary.overpaidCents)} të paguara e kalojnë vlerën e shpenzimeve në këtë skenar. Kontrollo parapagimet ose numrin e mysafirëve.</p>}</div>}
    <BudgetCharts wedding={wedding} plan={previewPlan} />
    <div className="inv-budget-grid"><section className="inv-panel inv-expenses-panel"><div className="inv-panel-heading"><div><h2>Çdo shpenzim, në vendin e vet</h2><p>Çmime, paradhënie dhe pagesat që mbeten.</p></div><button className="inv-button inv-button-primary" disabled={busy || plan.expenses.length >= 300} onClick={() => setEditor(newExpense(mainEvent.id))}><Plus size={15} />Shto shpenzim</button></div><div className="inv-expense-toolbar"><select aria-label="Filtro shpenzimet sipas eventit" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}><option value="">Të gjitha eventet</option>{wedding.events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select><select aria-label="Filtro shpenzimet sipas kategorisë" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option value="">Të gjitha kategoritë</option>{Object.entries(expenseCategories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div><div className="inv-expense-list">{visible.map((expense) => {
      const total = expenseTotal(wedding, liveBudget, expense)
      const unpaid = Math.max(0, total - expense.paidCents)
      const contact = plan.contacts.find((c) => c.id === expense.vendorId)
      return <article className="inv-expense-row" key={expense.id} aria-label={expense.label}><div className="inv-expense-name"><span className={`inv-service-icon inv-category-${expense.category}`}><ServiceIcon category={expense.category} size={17} /></span><span><h3>{expense.label}</h3><small>{wedding.events.find((e) => e.id === expense.eventId)?.name ?? "I përbashkët"}{contact ? ` · ${contact.name}` : ""}</small><span className="inv-expense-formula">{expense.pricing === "per_guest" ? guestsForEvent(wedding, expense.eventId, liveBudget) : expense.quantity} × {formatMoney(expense.unitCents)}{expense.pricing === "per_guest" ? " / mysafir" : ""}</span></span></div><dl><div><dt>Totali</dt><dd>{formatMoney(total)}</dd></div><div><dt>Paguar</dt><dd>{formatMoney(expense.paidCents)}</dd></div><div><dt>Mbeten</dt><dd className={unpaid > 0 ? "inv-amount-due" : ""}>{formatMoney(unpaid)}</dd></div></dl><div className="inv-expense-row-footer"><span className={`inv-expense-payment ${total > 0 && !unpaid ? "is-paid" : ""}`}>{!total ? "Pa çmim të caktuar" : !unpaid ? "E paguar" : expense.paidCents ? "Pjesërisht e paguar" : "Pa paguar"}{expense.dueDate ? ` · ${formatDate(expense.dueDate, true)}` : ""}</span><div><button className="inv-icon-button" aria-label={`Ndrysho shpenzimin ${expense.label}`} onClick={() => setEditor(expense)}><Pencil size={15} /></button><button className="inv-icon-button inv-delete-button" aria-label={`Hiq shpenzimin ${expense.label}`} onClick={() => setDeleting(expense)}><Trash2 size={15} /></button></div></div></article>
    })}</div>{!visible.length && <div className="inv-empty"><Receipt size={28} /><h3>Nuk ka shpenzime për këtë përzgjedhje</h3><p>Shto një shpenzim ose ndrysho filtrat.</p></div>}<div className="inv-table-footer"><span>{visible.length} shpenzime</span><button className="inv-text-button" onClick={() => downloadCsv(budgetCsv(wedding, previewPlan), "buxheti-i-dasmes.csv")}><ArrowDownToLine size={14} />Eksporto skenarin CSV</button></div></section>
    <aside className="inv-budget-breakdown inv-panel" aria-label="Përmbledhja e buxhetit"><div className="inv-panel-heading"><div><span className="inv-eyebrow">KU SHKON BUXHETI</span><h2>Një pamje e plotë.</h2></div></div>{categories.length ? <div className="inv-category-bars">{categories.map(([id, value], i) => <button key={id} className={filter === id ? "is-selected" : ""} aria-pressed={filter === id} onClick={() => setFilter(filter === id ? "" : id)}><span><span>{expenseCategories[id]}</span><strong>{formatMoney(value)}</strong></span><span className="inv-category-track"><span className={`inv-bar-color-${i % 4}`} style={{ width: `${summary.baseCents ? value / summary.baseCents * 100 : 0}%` }} /></span><small>{Math.round(value / summary.baseCents * 100)}% e shpenzimeve bazë<ArrowUpRight size={12} /></small></button>)}</div> : <div className="inv-budget-chart-empty"><Calculator size={34} /><p>Vendos çmimet e para për ta parë ndarjen e buxhetit sipas kategorive.</p></div>}<div className="inv-budget-recap"><span>Shpenzimet<strong>{formatMoney(summary.baseCents)}</strong></span><span>Rezerva<strong>{formatMoney(summary.reserveCents)}</strong></span><span>Parashikimi total<strong>{formatMoney(summary.totalCents)}</strong></span></div><p className="inv-planner-privacy"><ShieldCheck size={14} />Ky buxhet mbetet privat.</p></aside></div>
    {editor && <ExpenseEditor expense={editor} wedding={wedding} budget={liveBudget} contacts={plan.contacts} onSave={saveExpense} onClose={() => setEditor(null)} busy={busy} serverError={error} />}
    {deleting && <InvitationDialog title="Të hiqet ky shpenzim?" onClose={() => setDeleting(null)}><div className="inv-form"><p><strong>{deleting.label}</strong> dhe shuma e paguar për të do të hiqen nga përmbledhja e buxhetit.</p>{error && <p role="alert" className="inv-form-error">{error}</p>}<div className="inv-form-actions"><button className="inv-button inv-button-outline" onClick={() => setDeleting(null)}>Mbaje shpenzimin</button><button className="inv-button inv-button-danger" disabled={busy} onClick={async () => { if (await onSave({ ...plan, expenses: plan.expenses.filter((e) => e.id !== deleting.id) }, "Shpenzimi u hoq nga buxheti.")) setDeleting(null) }}>Hiqe shpenzimin</button></div></div></InvitationDialog>}
  </div>
}
