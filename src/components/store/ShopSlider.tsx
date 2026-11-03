import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react"

export function ShopSlider({ id, title, description, href, linkLabel = "Shiko krejt", children, wide = false, tools }: {
  id: string
  title: string
  description: string
  href: string
  linkLabel?: string
  children: ReactNode[]
  wide?: boolean
  tools?: ReactNode
}) {
  const track = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ previous: false, next: children.length > 1 })
  useEffect(() => {
    const element = track.current
    if (!element) return
    const update = () => setEdges({ previous: element.scrollLeft > 2, next: element.scrollLeft + element.clientWidth < element.scrollWidth - 2 })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    element.addEventListener("scroll", update, { passive: true })
    return () => { observer.disconnect(); element.removeEventListener("scroll", update) }
  }, [children.length])
  function move(direction: number) {
    const element = track.current
    if (!element) return
    element.scrollBy({ left: direction * element.clientWidth * .85, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })
  }
  return (
    <section className={`shop-slider${wide ? " shop-slider-wide" : ""}`} id={id} aria-labelledby={`${id}-title`}>
      <header className="shop-slider-heading">
        <div><h2 id={`${id}-title`}>{title}</h2><p>{description}</p>{tools && <div className="shop-slider-tools">{tools}</div>}</div>
        <div className="shop-slider-actions">
          <a href={href} className="shop-slider-link">{linkLabel}<ArrowUpRight size={15} /></a>
          <div className="shop-slider-controls">
            <button type="button" disabled={!edges.previous} onClick={() => move(-1)} aria-label={`Kthehu te ${title}`} aria-controls={`${id}-track`}><ArrowLeft size={18} /></button>
            <button type="button" disabled={!edges.next} onClick={() => move(1)} aria-label={`Më shumë te ${title}`} aria-controls={`${id}-track`}><ArrowRight size={18} /></button>
          </div>
        </div>
      </header>
      <ul className="shop-slider-track" id={`${id}-track`} ref={track} tabIndex={0} aria-label={`Shfleto ${title}`} onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault()
          move(event.key === "ArrowRight" ? 1 : -1)
        }
        if (event.key === "Home" || event.key === "End") {
          event.preventDefault()
          event.currentTarget.scrollTo({ left: event.key === "Home" ? 0 : event.currentTarget.scrollWidth, behavior: "instant" })
        }
      }}>
        {children.map((child, index) => <li className="shop-slider-item" key={index}>{child}</li>)}
      </ul>
    </section>
  )
}
