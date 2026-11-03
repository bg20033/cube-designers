import { useState } from "react"
import { ArrowRight, ChevronDown, Play, Radio, Ruler, Wrench } from "lucide-react"
import { StoreShell } from "@/components/store/StoreChrome"
import "./smart-glass.css"

const quoteHref = "/start-project?service=Smart%20Glass"
const media = "/media/collections/blanks/"
const applications = ["Zyra", "Salla takimesh", "Klinika", "Banjo"]
const installation = [
  { icon: Ruler, title: "Përmasat e tua.", text: "Matje në vend dhe përshtatje sipas xhamit dhe kërkesave të hapësirës." },
  { icon: Radio, title: "Kontroll i thjeshtë.", text: "Sistemi përfshin transformatorin dhe telekomandën. Ndrysho gjendjen me një shtypje." },
  { icon: Wrench, title: "Gati për përdorim.", text: "Montimin e bëjmë në vend. Pas instalimit, të tregojmë si funksionon gjithçka." },
]

export default function SmartGlassPage() {
  const [transparent, setTransparent] = useState(false)

  return (
    <StoreShell className="smart-glass-page">
      <main id="main-content" className="sg-main">
        <nav className="sg-product-nav" aria-label="Smart Glass">
          <a className="sg-product-name" href="#top">Smart Glass</a>
          <div><a className="sg-nav-demo" href="#demonstrimi">Si funksionon</a><a className="sg-quote" href={quoteHref}>Kërko ofertë <ArrowRight size={14} aria-hidden="true" /></a></div>
        </nav>

        <section className="sg-hero" aria-labelledby="sg-title">
          <div className="sg-intro">
            <h1 id="sg-title">Smart Glass.</h1>
            <p className="sg-lead">Privatësi.<br />Me një prekje.</p>
            <p className="sg-description">Nga xham i mjegullt në transparent, me një klik. Hapësira mbetet e njëjtë. Pamjen e zgjedh ti.</p>
            <a className="sg-explore" href="#demonstrimi">Provoje ndryshimin <ChevronDown size={17} aria-hidden="true" /></a>
          </div>

          <div id="demonstrimi" className="sg-demonstration">
            <figure className="sg-viewer" data-transparent={transparent}>
              <img
                className="sg-clear-image"
                src={`${media}smart-glass-clear.webp`}
                alt="Smart Glass transparent në një sallë takimesh"
                width="1280" height="720" loading="eager" fetchPriority="high"
                aria-hidden={!transparent}
              />
              <img
                className="sg-private-image"
                src={`${media}smart-film-off.webp`}
                alt="Smart Glass i mjegullt për privatësi"
                width="1280" height="717" loading="eager"
                aria-hidden={transparent}
              />
            </figure>
            <div className="sg-demo-controls">
              <button
                className="sg-switch"
                type="button" role="switch"
                aria-label="Xham transparent"
                aria-checked={transparent}
                onClick={() => setTransparent((current) => !current)}
              >
                <span>{transparent ? "Transparent" : "Privatësi"}</span>
                <span className="sg-switch-track" aria-hidden="true"><span /></span>
              </button>
              <p>Një prekje për ta parë ndryshe.</p>
            </div>
            <details className="sg-video">
              <summary>Shiko videon e demonstrimit <span aria-hidden="true"><Play size={12} fill="currentColor" /></span></summary>
              <video
                controls playsInline preload="none"
                poster={`${media}smart-film-off.webp`}
                src={`${media}smart-film.mp4`}
                aria-label="Demonstrim Smart Glass: nga privatësi në transparencë"
              />
              <p>Parapamje ilustruese e kalimit mes dy gjendjeve.</p>
            </details>
          </div>
        </section>

        <section className="sg-applications" aria-labelledby="sg-applications-title">
          <h2 id="sg-applications-title">Hapësira të hapura.<br /><span>Privatësi sipas nevojës.</span></h2>
          <p>Për momente pune, takime dhe hapësira personale. Smart Glass përshtatet me mënyrën si e përdor ambientin.</p>
          <ul>{applications.map((application) => <li key={application}>{application}</li>)}</ul>
        </section>

        <section className="sg-installation" aria-labelledby="sg-installation-title">
          <div className="sg-installation-heading"><span>KUJDESEMI PËR ÇDO HAP</span><h2 id="sg-installation-title">Nga matja.<br />Te prekja e parë.</h2></div>
          <div className="sg-steps">
            {installation.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={28} strokeWidth={1.5} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </section>

        <section className="sg-contact" aria-labelledby="sg-contact-title">
          <h2 id="sg-contact-title">Smart Glass.<br /><span>Për hapësirën tënde.</span></h2>
          <p>Na trego ku dëshiron ta vendosësh. Detajet i përcaktojmë bashkë.</p>
          <a className="sg-quote" href={quoteHref}>Flasim për projektin <ArrowRight size={16} aria-hidden="true" /></a>
        </section>
      </main>
      <footer className="sg-footer"><span>© 2026 CUBE DESIGNERS</span><a href="#top">Kthehu lart ↑</a></footer>
    </StoreShell>
  )
}
