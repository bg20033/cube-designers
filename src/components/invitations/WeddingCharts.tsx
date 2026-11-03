import { ArrowUpRight, BarChart3, Pencil, Plus } from "lucide-react"
import { formatDate, type Wedding, type WeddingEvent } from "./model"
import { calculateBudget, expenseTotal, formatMoney, type WeddingPlan } from "./planning-model"
import "./charts.css"

type Slice = { label: string; value: number }
const shades = ["#222222", "#888888", "#e3e3e3"]
const percent = (value: number, total: number) => total ? Math.round(value / total * 100) : 0

function Ring({ slices, value, caption, legend = true }: { slices: Slice[]; value: string; caption: string; legend?: boolean }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  let offset = 0
  return <div className="inv-chart-ring-layout">
    <div className="inv-chart-ring">
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <circle cx="80" cy="80" r="62" fill="none" stroke="#efefef" strokeWidth="16" />
        {slices.map((slice, i) => {
          const length = total ? slice.value / total * 100 : 0
          const start = offset; offset += length
          return length > 0 && <circle key={slice.label} cx="80" cy="80" r="62" pathLength="100" fill="none" stroke={shades[i % shades.length]} strokeWidth="16" strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={-start} transform="rotate(-90 80 80)" />
        })}
      </svg>
      <div className="inv-chart-ring-center"><strong>{value}</strong><span>{caption}</span></div>
    </div>
    {legend && <dl className="inv-chart-legend">{slices.map((slice, i) => <div key={slice.label}><dt><span aria-hidden="true" style={{ background: shades[i % shades.length] }} />{slice.label}</dt><dd>{slice.value}<small>{percent(slice.value, total)}%</small></dd></div>)}</dl>}
  </div>
}

function PaymentChart({ wedding, plan, onOpen }: { wedding: Wedding; plan: WeddingPlan; onOpen?: () => void }) {
  const budget = calculateBudget(wedding, plan)
  // An overpayment on one expense must not cover another expense's unpaid amount.
  const covered = budget.baseCents - budget.outstandingCents
  const paidPercent = percent(covered, budget.baseCents)
  return <section className="inv-chart-card" aria-label="Grafiku i pagesave">
    <div className="inv-chart-heading"><div><h3>Pagesat e buxhetit</h3><p>Shpenzimet bazë, pa rezervën.</p></div>{onOpen && <button className="inv-icon-button" onClick={onOpen} aria-label="Hap buxhetin nga grafiku"><ArrowUpRight size={18} /></button>}</div>
    {budget.baseCents > 0 ? <>
      <div className="inv-chart-payment-ring"><Ring slices={[{ label: "Të mbuluara", value: covered }, { label: "Për pagesë", value: budget.outstandingCents }]} value={`${paidPercent}%`} caption="e mbuluar" legend={false} /></div>
      <dl className="inv-chart-money"><div><dt>Të mbuluara</dt><dd>{formatMoney(covered)}</dd></div><div><dt>Për pagesë</dt><dd>{formatMoney(budget.outstandingCents)}</dd></div></dl>
    </> : <div className="inv-chart-empty"><BarChart3 size={30} strokeWidth={1.4} /><strong>Ende pa shpenzime të llogaritura</strong><p>Vendos çmimet te Planifikimi për ta parë grafikun.</p>{onOpen && <button className="inv-text-button" onClick={onOpen}>Hap Planifikimin<ArrowUpRight size={14} /></button>}</div>}
    {budget.overpaidCents > 0 && <p className="inv-chart-note">{formatMoney(budget.overpaidCents)} mbi koston e disa shpenzimeve. Nuk zbriten nga pagesat e tjera.</p>}
  </section>
}

// Persons per event: who comes, who doesn't (incl. unused seats) and who hasn't answered yet.
export function eventAttendance(wedding: Wedding, eventId: string) {
  const guests = wedding.guests.filter((guest) => guest.events.includes(eventId))
  const invited = guests.reduce((sum, guest) => sum + guest.capacity, 0)
  const coming = guests.reduce((sum, guest) => sum + (guest.responses[eventId]?.status === "accepted" ? guest.responses[eventId].count : 0), 0)
  const waiting = guests.reduce((sum, guest) => sum + (guest.responses[eventId] ? 0 : guest.capacity), 0)
  return { invitations: guests.length, answered: guests.filter((guest) => guest.responses[eventId]).length, invited, coming, waiting, notComing: invited - coming - waiting }
}

export default function OverviewCharts({ wedding, onEdit, onAdd, onFilter }: {
  wedding: Wedding; onEdit?: (event: WeddingEvent) => void; onAdd?: () => void; onFilter?: (eventId: string, status: string) => void
}) {
  return <section className="inv-attendance" aria-label="Pjesëmarrja sipas eventit">{wedding.events.map((event) => {
    const a = eventAttendance(wedding, event.id)
    const width = (value: number) => ({ width: `${a.invited ? value / a.invited * 100 : 0}%` })
    const stat = (status: string, label: string, value: number) => <div key={status}><dt><i className={`is-${status === "accepted" ? "coming" : status === "declined" ? "not" : "waiting"}`} />{label}</dt><dd>{onFilter ? <button onClick={() => onFilter(event.id, status)} aria-label={`${label} në ${event.name}: ${value}. Shiko mysafirët`}>{value}</button> : value}</dd></div>
    return <article className="inv-attendance-card" key={event.id} aria-label={event.name}>
      <header><h3>{event.name}</h3>{onEdit && <button className="inv-attendance-edit" onClick={() => onEdit(event)} aria-label={`Ndrysho eventin ${event.name}`}><Pencil size={13} />Ndrysho</button>}</header>
      <p className="inv-attendance-when">{formatDate(event.date, true)} · {event.time}{event.venue && <> · {event.mapUrl ? <a href={event.mapUrl} target="_blank" rel="noreferrer">{event.venue}<ArrowUpRight size={11} /></a> : event.venue}</>}</p>
      <p className="inv-attendance-main"><strong>{a.coming}</strong><span>/ {a.invited} vijnë</span></p>
      <div className="inv-attendance-bar" aria-hidden="true"><span className="is-coming" style={width(a.coming)} /><span className="is-not" style={width(a.notComing)} /><span className="is-waiting" style={width(a.waiting)} /></div>
      <dl>{stat("accepted", "Vijnë", a.coming)}{stat("declined", "Nuk vijnë", a.notComing)}{stat("pending", "Në pritje", a.waiting)}</dl>
      <small>{a.invitations ? `${a.answered} nga ${a.invitations} ftesa janë përgjigjur` : "Ende pa ftesa për këtë event"}</small>
    </article>
  })}{onAdd && <button className="inv-attendance-add" onClick={onAdd}><Plus size={18} /><strong>Shto event</strong><span>p.sh. synetia, pritja, darka familjare</span></button>}</section>
}

export function BudgetCharts({ wedding, plan }: { wedding: Wedding; plan: WeddingPlan }) {
  const costs = [...wedding.events.map((event) => ({ id: event.id, label: event.name })), { id: "", label: "Të përbashkëta" }].map((event) => ({ ...event, value: plan.expenses.filter((expense) => expense.eventId === event.id).reduce((sum, expense) => sum + expenseTotal(wedding, plan.budget, expense), 0) }))
  const maxCost = Math.max(1, ...costs.map((cost) => cost.value))
  return <div className="inv-budget-charts">
    <PaymentChart wedding={wedding} plan={plan} />
    <section className="inv-chart-card" aria-label="Grafiku i shpenzimeve sipas eventit"><div className="inv-chart-heading"><div><h3>Shpenzimet sipas eventit</h3><p>Bazuar në skenarin e kalkulatorit, pa rezervën.</p></div></div>
      <dl className="inv-chart-costs">{costs.map((cost) => <div key={cost.id}><dt>{cost.label}</dt><dd>{formatMoney(cost.value)}</dd><div className="inv-chart-track" aria-hidden="true"><span className="inv-chart-confirmed" style={{ width: `${cost.value / maxCost * 100}%` }} /></div></div>)}</dl>
      <p className="inv-chart-note">Shpenzimet pa një event të caktuar shfaqen te “Të përbashkëta”.</p>
    </section>
  </div>
}
