import { useEffect, useState, type MouseEvent, type ReactNode } from "react"
import { ArrowRight, CalendarCheck, Link2, Users, Palette, MapPin, ListChecks } from "lucide-react"
import { SiteHeader } from "@/components/SiteChrome"
import InvitationCard from "./InvitationCard"
import { createDemoWedding, designs, type DesignId } from "./model"
import "./landing.css"

const sample = createDemoWedding()
const features = [
  { icon: Palette, title: "Dizajni i ftesës", text: "Katër dizajne me emrat, mesazhin dhe detajet tuaja. Ndryshojeni pamjen nga hapësira juaj." },
  { icon: Link2, title: "Link personal për mysafirin", text: "Çdo familje, çift ose individ merr ftesën me emrin dhe vendet e rezervuara. Linkun e dërgoni ju." },
  { icon: CalendarCheck, title: "Konfirmimi i pjesëmarrjes", text: "Mysafirët përgjigjen nga telefoni. Ju shihni kush vjen dhe sa persona kanë konfirmuar." },
  { icon: Users, title: "Lista e mysafirëve", text: "Mbani ftesat dhe përgjigjet në një vend. Eksportoni listën ose hapni një link të përgjithshëm për regjistrim." },
  { icon: MapPin, title: "Eventet dhe lokacioni", text: "Shtoni datën, orën dhe vendin për çdo event. Harta dhe shtimi në kalendar janë brenda ftesës." },
  { icon: ListChecks, title: "Mjetet e planifikimit", text: "Organizoni buxhetin, pagesat, detyrat dhe kontaktet e bashkëpunëtorëve nga e njëjta hapësirë." },
]

export default function InvitationsLanding({ children, login, packagePrice, onCreate, onLogin, onExplore }: {
  children: ReactNode
  login: boolean
  packagePrice: string
  onCreate: () => void
  onLogin: () => void
  onExplore: () => void
}) {
  const [design, setDesign] = useState<DesignId>("lilac")
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("design")
    const selectedDesign = designs.find((item) => item.id === requested)
    if (selectedDesign) setDesign(selectedDesign.id)
  }, [])
  const selected = designs.find((item) => item.id === design)!
  function navigate(event: MouseEvent<HTMLAnchorElement>, action: () => void) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    action()
  }

  return (
    <div className={`ftl-page${login ? " is-login" : ""}`}>
      <SiteHeader />
      <main id="main-content" className="ftl-main">
        <div className="ftl-product-bar">
          <a className="ftl-wordmark" href="/ftesa">Ftesa online</a>
          <nav className="ftl-entry-nav" aria-label="Ftesa online">
            <a href="/ftesa#perfshin" onClick={(event) => navigate(event, onExplore)}>Çka përfshin</a>
            <a href="/ftesa?view=apply#porosit" onClick={(event) => navigate(event, onCreate)}>Apliko</a>
            <a href="/ftesa?view=login" aria-current={login ? "page" : undefined} onClick={(event) => navigate(event, onLogin)}>Kyçu <ArrowRight size={14} aria-hidden="true" /></a>
          </nav>
        </div>

        {!login && <>
          <section className="ftl-hero" aria-labelledby="ftl-title">
            <div className="ftl-intro">
              <span className="ftl-eyebrow">PËR DASMËN TUAJ</span>
              <h1 id="ftl-title">Ftesat dhe mysafirët.<br />Në një vend.</h1>
              <p className="ftl-lead">Dërgoni ftesa personale me link dhe merrni konfirmimet e pjesëmarrjes në një listë të vetme.</p>
              <div className="ftl-actions">
                <a className="ftl-primary" href="/ftesa?view=apply#porosit" onClick={(event) => navigate(event, onCreate)}>Apliko për ftesat <ArrowRight size={17} aria-hidden="true" /></a>
              </div>
            </div>

            <div className="ftl-preview">
              <div className="ftl-preview-stage" aria-label={`Parapamje e dizajnit ${selected.name}`}>
                <span className="ftl-preview-caption">PARAPAMJE E FTESËS</span>
                <InvitationCard wedding={{ ...sample, design }} />
              </div>
              <div className="ftl-design-picker" role="group" aria-label="Parapamja e dizajneve">
                {designs.map((item) => (
                  <button key={item.id} type="button" aria-pressed={design === item.id} onClick={() => setDesign(item.id)}>
                    <span style={{ background: item.color }} aria-hidden="true" />{item.name}
                  </button>
                ))}
              </div>
              <p className="ftl-preview-note">Zgjidhni një dizajn për ta parë.</p>
            </div>
          </section>

          <section id="perfshin" className="ftl-how" aria-labelledby="ftl-how-title">
            <div className="ftl-section-heading">
              <div><h2 id="ftl-how-title">Çka përfshin paketa?</h2><p>Nga ftesa e parë deri te lista përfundimtare e mysafirëve.</p></div>
              <div className="ftl-package-price"><span>Paketa e ftesave online</span><strong>{packagePrice}</strong><small>Pagesa konfirmohet para aktivizimit.</small></div>
            </div>
            <div className="ftl-features">
              {features.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={21} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}
            </div>
          </section>


        </>}

        <section id={login ? "kycu" : "porosit"} className="ftl-order" aria-labelledby="ftl-order-title">
          {login ? <div className="ftl-order-copy"><h1 id="ftl-order-title">Mirë se u ktheve.</h1><p>Kyçu me referencën e porosisë dhe fjalëkalimin për të vazhduar me ftesat dhe mysafirët.</p><a className="ftl-text-link" href="/ftesa#perfshin" onClick={(event) => navigate(event, onExplore)}>Shiko çka përfshin shërbimi <ArrowRight size={15} aria-hidden="true" /></a></div>
            : <div className="ftl-order-copy"><h2 id="ftl-order-title">Filloni me ftesat tuaja.</h2><p>Lini emrin, mbiemrin dhe emailin. Ju kontaktojmë për ftesat dhe hapat e radhës.</p><p>Keni tashmë një porosi? <a href="/ftesa?view=login" onClick={(event) => navigate(event, onLogin)}>Kyçuni këtu.</a></p><a className="ftl-text-link" href="mailto:info@cube-designers.com">Na shkruani për pyetje <ArrowRight size={15} aria-hidden="true" /></a></div>}
          {children}
        </section>
      </main>
      <footer className="ftl-footer"><a href="/">CUBE DESIGNERS</a><a href="mailto:info@cube-designers.com">info@cube-designers.com</a></footer>
    </div>
  )
}
