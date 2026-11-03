import type { ReactNode } from "react"
import { SiteHeader } from "@/components/SiteChrome"
import "./store.css"

// The shop shares the studio header, including its navigation and cart.
export function StoreShell({
  className = "",
  children,
  count,
  onCart,
}: {
  className?: string
  children: ReactNode
  count?: number
  onCart?: () => void
}) {
  return (
    <>
      <a className="cube-skip" href="#main-content">
        Kalo te përmbajtja
      </a>
      <SiteHeader cartCount={count} onCart={onCart} />
      <div className={`cube-store ${className}`.trim()} id="top">
        {children}
      </div>
    </>
  )
}

export function StoreFooter() {
  return (
    <footer className="cube-footer">
      <div className="cube-footer-bottom">
        <span>© 2026 CUBE DESIGNERS</span>
        <span>Koleksion koncept · Pamje ilustruese · Çmime orientuese</span>
        <a href="#top">Kthehu lart ↑</a>
      </div>
    </footer>
  )
}
