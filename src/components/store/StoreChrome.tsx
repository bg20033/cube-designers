import type { ReactNode } from "react"
import { StoreHeader } from "./StoreHeader"
import "./store.css"

// Dedicated shop navigation. Studio pages use SiteChrome.
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
      <StoreHeader count={count} onCart={onCart} />
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
