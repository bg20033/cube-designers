import {
  ArrowRight,
  ArrowUpRight,
  CircleDot,
  Layers3,
  ScanLine,
  Sparkles,
} from "lucide-react"
import { motion } from "motion/react"

import {
  ContactSection,
  SiteFooter,
  SiteHeader,
  SiteNoise,
} from "@/components/SiteChrome"

const disciplines = [
  {
    number: "01",
    title: "Design",
    detail: "Identitet, sisteme vizuale, packaging dhe creative direction.",
    href: "/#design",
  },
  {
    number: "02",
    title: "Print",
    detail: "Nga artwork-u dhe materiali deri te prodhimi final.",
    href: "/#print",
  },
  {
    number: "03",
    title: "Digital",
    detail: "Web, content dhe kampanja që e çojnë brandin përpara.",
    href: "/#digital",
  },
]

const process = [
  {
    number: "01",
    title: "Dëgjojmë",
    detail: "E kuptojmë biznesin, publikun dhe problemin e vërtetë.",
  },
  {
    number: "02",
    title: "Definojmë",
    detail: "E kthejmë kaosin në një drejtim të qartë dhe të matshëm.",
  },
  {
    number: "03",
    title: "Ndërtojmë",
    detail: "Dizajnojmë sistemin dhe e çojmë deri në ekzekutim.",
  },
  {
    number: "04",
    title: "Rrisim",
    detail: "E testojmë, e përmirësojmë dhe e zgjerojmë pa humbur identitetin.",
  },
]

export default function AboutPage() {
  return (
    <div className="agency-site about-page">
      <SiteNoise />
      <SiteHeader />

      <main>
        <section className="about-poster-hero" id="top">
          <div className="about-poster-grid" aria-hidden="true" />
          <div className="about-poster-shapes" aria-hidden="true">
            <span className="about-shape-violet" />
            <span className="about-shape-acid" />
            <span className="about-shape-orange" />
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="about-poster-cube">CUBE</span>
            <span className="about-poster-designers">DESIGNERS</span>
          </motion.h1>

          <motion.div
            className="about-poster-disciplines"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.18,
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <span>DESIGN.</span>
            <span>PRINT.</span>
            <span>DIGITAL.</span>
          </motion.div>

          <div className="about-poster-meta">
            <span>K/03 · Independent creative studio</span>
            <strong>Suharekë · Kosovo · 2026</strong>
          </div>
        </section>

        <section className="about-intro">
          <div className="about-section-label">
            <span>01</span>
            Kush jemi
          </div>
          <div className="about-intro-copy">
            <h2>
              JO VEÇ “BUKUR”.
              <em>E QARTË. E DOBISHME. E JOTJA.</em>
            </h2>
            <div>
              <p>
                Ne punojmë me biznese që duan me u dukë seriozisht, me
                komuniku qartë dhe me u rritë pa e humbur karakterin.
              </p>
              <p>
                Te CUBE, ideja nuk ndalet në ekran. E ndërtojmë si sistem që
                funksionon në brand, print, web, content dhe çdo kontakt me
                klientin.
              </p>
            </div>
          </div>
        </section>

        <section className="about-why">
          <article>
            <CircleDot />
            <span>ÇKA</span>
            <h3>Ndërtojmë marka që dallohen.</h3>
            <p>
              Identitet dhe eksperienca të lidhura, prej idesë së parë deri te
              rezultati final.
            </p>
          </article>
          <article>
            <ScanLine />
            <span>QYSH</span>
            <h3>Me një sistem, jo me copa.</h3>
            <p>
              Një drejtim kreativ, një standard dhe një ekip që e sheh krejt
              fotografinë.
            </p>
          </article>
          <article>
            <Sparkles />
            <span>PSE</span>
            <h3>Sepse kujtesa krijon vlerë.</h3>
            <p>
              Kur një brand kuptohet dhe mbahet mend, secili investim punon më
              fort.
            </p>
          </article>
        </section>

        <section className="about-disciplines">
          <header>
            <div className="about-section-label">
              <span>02</span>
              Një studio · tri disiplina
            </div>
            <h2>FROM IDEA<br />TO IMPACT.</h2>
          </header>

          <div className="about-discipline-list">
            {disciplines.map((discipline) => (
              <a href={discipline.href} key={discipline.number}>
                <span>{discipline.number}</span>
                <strong>{discipline.title}</strong>
                <p>{discipline.detail}</p>
                <ArrowUpRight />
              </a>
            ))}
          </div>
        </section>

        <section className="about-process">
          <div className="about-process-title">
            <div className="about-section-label">
              <span>03</span>
              Qysh punojmë
            </div>
            <h2>
              ZERO DRAMA.
              <span>CLEAR PROCESS.</span>
            </h2>
            <Layers3 />
          </div>

          <div className="about-process-list">
            {process.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
                <ArrowRight />
              </article>
            ))}
          </div>
        </section>

        <section className="about-manifesto">
          <span>04 / Çka besojmë</span>
          <p>
            <strong>IDEA FIRST.</strong>
            <strong>DETAILS ALWAYS.</strong>
            <em>BORING NEVER.</em>
          </p>
          <small>Suharekë · Kosovo · Available everywhere</small>
        </section>

        <ContactSection />
      </main>

      <SiteFooter />
    </div>
  )
}
