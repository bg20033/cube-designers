import { useState } from "react"
import { Mail, Phone, RefreshCw } from "lucide-react"

import { apiRequest } from "@/lib/api"
import { SHOP_ENABLED } from "@/app/routes"
import { RecordControls, StatusPill } from "@/components/admin/RecordControls"
import {
  currency,
  formatDate,
  orderStatusLabels,
  type Order,
  type OrderStatus,
} from "@/components/admin/types"

type Props = {
  orders: Order[] | null
  onChange: (next: Order[]) => void
  onRefresh: () => Promise<void>
}

export function OrdersPanel({ orders, onChange, onRefresh }: Props) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "open" | "all">("open")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState("")

  if (!orders) return <p className="admin-empty">Duke i ngarku porositë…</p>

  const visible = orders.filter((item) =>
    statusFilter === "all"
      ? true
      : statusFilter === "open"
        ? item.status !== "delivered" && item.status !== "cancelled"
        : item.status === statusFilter,
  )
  const selected = orders.find((item) => item.id === selectedId) ?? visible[0]
  const openTotal = orders
    .filter((item) => item.status !== "cancelled")
    .reduce((sum, item) => sum + item.total, 0)

  async function save(item: Order, changes: { status?: OrderStatus; notes?: string }) {
    const result = await apiRequest("/api/admin/orders", {
      method: "PATCH",
      body: { id: item.id, ...changes },
    })
    if (!result.ok) {
      setError(result.error)
      return false
    }
    setError("")
    onChange(orders!.map((row) => (row.id === item.id ? { ...row, ...changes } : row)))
    return true
  }

  async function remove(item: Order) {
    if (!window.confirm(`Me fshi porosinë ${item.reference}? Kjo s'kthehet mbrapsht.`)) return
    const result = await apiRequest(`/api/admin/orders?id=${item.id}`, { method: "DELETE" })
    if (!result.ok) return setError(result.error)
    onChange(orders!.filter((row) => row.id !== item.id))
    setSelectedId(null)
  }

  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h1>Porositë</h1>
          <p>
            {orders.length} porosi · {currency.format(openTotal)} gjithsej (pa të anuluarat)
          </p>
        </div>
        <div className="admin-toolbar">
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            aria-label="Filtro sipas statusit"
          >
            <option value="open">Të hapura</option>
            <option value="all">Të gjitha</option>
            {(Object.keys(orderStatusLabels) as OrderStatus[]).map((key) => (
              <option key={key} value={key}>{orderStatusLabels[key]}</option>
            ))}
          </select>
          <button className="admin-button is-ghost" type="button" onClick={() => void onRefresh()}>
            <RefreshCw />
            <span>Rifresko</span>
          </button>
        </div>
      </header>

      {!SHOP_ENABLED && (
        <p className="admin-note">
          Shop-i është i fshehur në faqe (SHOP_ENABLED = false), prandaj porosi të reja
          nuk vijnë derisa ta aktivizoni.
        </p>
      )}
      {error && <p className="admin-error" role="alert">{error}</p>}

      {!visible.length ? (
        <p className="admin-empty">Asnjë porosi këtu.</p>
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
                    <strong>{item.reference}</strong>
                    <StatusPill status={item.status} label={orderStatusLabels[item.status]} />
                  </span>
                  <span className="admin-list-meta">
                    {item.customer.name} · {formatDate(item.created_at)}
                  </span>
                  <span className="admin-list-preview">
                    {item.items.length} produkte · {currency.format(item.total)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <article className="admin-detail">
              <header>
                <span>Porosi · #{selected.id}</span>
                <h2>{selected.reference}</h2>
                <p>{formatDate(selected.created_at)}</p>
              </header>

              <dl className="admin-fields">
                <div><dt>Klienti</dt><dd>{selected.customer.name}</dd></div>
                <div>
                  <dt>Email</dt>
                  <dd><a href={`mailto:${selected.customer.email}`}>{selected.customer.email}</a></dd>
                </div>
                <div>
                  <dt>Telefoni</dt>
                  <dd><a href={`tel:${selected.customer.phone}`}>{selected.customer.phone}</a></dd>
                </div>
                <div><dt>Adresa</dt><dd>{selected.customer.address}</dd></div>
              </dl>

              <table className="admin-table">
                <thead>
                  <tr><th>Produkti</th><th>Sasia</th><th>Çmimi</th><th>Totali</th></tr>
                </thead>
                <tbody>
                  {selected.items.map((line) => (
                    <tr key={line.productId}>
                      <td>
                        {line.name}
                        <small>{line.quantityLabel}</small>
                      </td>
                      <td>× {line.quantity}</td>
                      <td>{currency.format(line.price)}</td>
                      <td>{currency.format(line.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Totali orientues</td>
                    <td>{currency.format(selected.total)}</td>
                  </tr>
                </tfoot>
              </table>

              {selected.customer.notes && (
                <div className="admin-message">
                  <span>Shënimet e klientit</span>
                  <p>{selected.customer.notes}</p>
                </div>
              )}

              <div className="admin-inline-actions">
                <a
                  className="admin-button is-secondary"
                  href={`mailto:${selected.customer.email}?subject=${encodeURIComponent(
                    `Porosia ${selected.reference} — CUBE DESIGNERS`,
                  )}`}
                >
                  <Mail />
                  Email
                </a>
                <a className="admin-button is-secondary" href={`tel:${selected.customer.phone}`}>
                  <Phone />
                  Thirr
                </a>
              </div>

              <RecordControls
                status={selected.status}
                notes={selected.notes}
                labels={orderStatusLabels}
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
