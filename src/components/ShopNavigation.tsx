import { useEffect, useRef } from "react"
import { ArrowUpRight, ChevronDown } from "lucide-react"
import { SheetClose } from "@/components/ui/sheet"
import { shopNavigation } from "@/data/shop-navigation"

export function ShopNavigation({ mobile = false, active = false }: { mobile?: boolean; active?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (mobile) return
    const close = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [mobile])

  function link(label: string, href: string) {
    const content = <>{label}<ArrowUpRight size={16} aria-hidden="true" /></>
    return mobile ? (
      <SheetClose key={href} render={<a href={href} />}>{content}</SheetClose>
    ) : <a key={href} href={href}>{content}</a>
  }

  return (
    <details
      ref={ref}
      className={`shop-dropdown${mobile ? " is-mobile" : ""}`}
      data-current={active || undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape" && event.currentTarget.open) {
          event.stopPropagation()
          event.currentTarget.open = false
          event.currentTarget.querySelector("summary")?.focus()
        }
      }}
    >
      <summary aria-current={active ? "page" : undefined}>
        {mobile && <span className="sheet-item-number">03</span>}
        Shop <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <nav className="shop-dropdown-panel" aria-label="Kategoritë e shopit">
        {shopNavigation.map((item) => link(item.label, item.href))}
      </nav>
    </details>
  )
}
