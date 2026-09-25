import { useCallback, useEffect, useState, type FormEvent } from "react"
import { ExternalLink, Inbox, LogOut, Package, ShoppingBag } from "lucide-react"

import { apiRequest } from "@/lib/api"
import { OrdersPanel } from "@/components/admin/OrdersPanel"
import { ProductsPanel } from "@/components/admin/ProductsPanel"
import { SubmissionsPanel } from "@/components/admin/SubmissionsPanel"
import type { Order, Submission } from "@/components/admin/types"
import "@/components/admin/admin.css"

type Tab = "submissions" | "orders" | "products"

function useNoIndex() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = "Admin | CUBE DESIGNERS"

    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const previousRobots = meta?.content
    if (!meta) {
      meta = document.createElement("meta")
      meta.name = "robots"
      document.head.append(meta)
    }
    meta.content = "noindex,nofollow"

    return () => {
      document.title = previousTitle
      if (meta && previousRobots !== undefined) meta.content = previousRobots
    }
  }, [])
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError("")
    const result = await apiRequest("/api/admin/session", {
      method: "POST",
      body: { password },
    })
    setBusy(false)
    if (result.ok) onLogin()
    else setError(result.error)
  }

  return (
    <main className="admin-login">
      <form onSubmit={submit}>
        <span className="admin-mark">C</span>
        <h1>CUBE Admin</h1>
        <label>
          <span>Fjalëkalimi</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
            required
          />
        </label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button className="admin-button is-primary" type="submit" disabled={busy}>
          {busy ? "Po kyçesh…" : "Kyçu"}
        </button>
      </form>
    </main>
  )
}

export default function AdminPage() {
  useNoIndex()
  const [authState, setAuthState] = useState<"checking" | "out" | "in">("checking")
  const [tab, setTab] = useState<Tab>("submissions")
  const [submissions, setSubmissions] = useState<Submission[] | null>(null)
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    void apiRequest<{ authenticated: boolean }>("/api/admin/session").then((result) => {
      setAuthState(result.ok && result.data.authenticated ? "in" : "out")
    })
  }, [])

  const loadInbox = useCallback(async () => {
    const [submissionResult, orderResult] = await Promise.all([
      apiRequest<{ submissions: Submission[] }>("/api/admin/submissions"),
      apiRequest<{ orders: Order[] }>("/api/admin/orders"),
    ])

    if (
      (!submissionResult.ok && submissionResult.status === 401) ||
      (!orderResult.ok && orderResult.status === 401)
    ) {
      setAuthState("out")
      return
    }

    setLoadError(
      !submissionResult.ok ? submissionResult.error : !orderResult.ok ? orderResult.error : "",
    )
    if (submissionResult.ok) setSubmissions(submissionResult.data.submissions)
    if (orderResult.ok) setOrders(orderResult.data.orders)
  }, [])

  useEffect(() => {
    if (authState === "in") void loadInbox()
  }, [authState, loadInbox])

  async function logout() {
    await apiRequest("/api/admin/session", { method: "DELETE" })
    setAuthState("out")
    setSubmissions(null)
    setOrders(null)
  }

  if (authState === "checking") {
    return <main className="admin-login"><p>Duke u ngarku…</p></main>
  }

  if (authState === "out") {
    return <LoginScreen onLogin={() => setAuthState("in")} />
  }

  const newSubmissions = submissions?.filter((item) => item.status === "new").length ?? 0
  const newOrders = orders?.filter((item) => item.status === "new").length ?? 0
  const tabs: Array<{ key: Tab; label: string; icon: typeof Inbox; badge?: number }> = [
    { key: "submissions", label: "Kërkesat", icon: Inbox, badge: newSubmissions },
    { key: "orders", label: "Porositë", icon: ShoppingBag, badge: newOrders },
    { key: "products", label: "Produktet", icon: Package },
  ]

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <a className="admin-brand" href="/admin">
          <span className="admin-mark">C</span>
          CUBE Admin
        </a>
        <nav aria-label="Seksionet e admin-it">
          {tabs.map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              type="button"
              className={tab === key ? "is-active" : ""}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => setTab(key)}
            >
              <Icon />
              {label}
              {!!badge && <span className="admin-badge">{badge}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-topbar-actions">
          <a className="admin-button is-ghost" href="/" target="_blank" rel="noreferrer">
            <ExternalLink />
            <span>Faqja</span>
          </a>
          <button className="admin-button is-ghost" type="button" onClick={logout}>
            <LogOut />
            <span>Dil</span>
          </button>
        </div>
      </header>

      <main className="admin-main">
        {loadError && <p className="admin-error" role="alert">{loadError}</p>}
        {tab === "submissions" && (
          <SubmissionsPanel
            submissions={submissions}
            onChange={setSubmissions}
            onRefresh={loadInbox}
          />
        )}
        {tab === "orders" && (
          <OrdersPanel orders={orders} onChange={setOrders} onRefresh={loadInbox} />
        )}
        {tab === "products" && <ProductsPanel />}
      </main>
    </div>
  )
}
