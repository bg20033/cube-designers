import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react"
import { motion } from "motion/react"

import {
  ContactSection,
  SiteFooter,
  SiteHeader,
  SiteNoise,
} from "@/components/SiteChrome"
import { caseStudies } from "@/components/workData"

export default function WorkPage() {
  return (
    <div className="agency-site work-page">
      <SiteNoise />
      <SiteHeader />

      <main>
        <section className="work-hero" id="top">
          <div className="work-hero-grid" aria-hidden="true" />
          <div className="work-kicker">
            <span>K/04</span>
            Selected case studies · Design / Print / Digital
          </div>
          <motion.div
            className="work-hero-title"
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1>
              SELECTED
              <em>WORK.</em>
            </h1>
            <ArrowDownRight />
          </motion.div>
          <div className="work-hero-bottom">
            <p>
              Jo galeri me mockups. Secili rast e tregon problemin, sistemin dhe
              rezultatin që puna duhet ta krijojë.
            </p>
            <span>03 CASE STUDIES / 2026</span>
          </div>
        </section>

        <nav className="work-index" aria-label="Case study index">
          {caseStudies.map((project) => (
            <a href={`#${project.slug}`} key={project.slug}>
              <span>{project.number}</span>
              {project.title}
              <ArrowRight />
            </a>
          ))}
        </nav>

        <section className="work-cases">
          {caseStudies.map((project) => (
            <article
              className="work-case"
              data-tone={project.tone}
              id={project.slug}
              key={project.slug}
            >
              <header>
                <div>
                  <span>{project.number} / {project.category}</span>
                  <h2>{project.title}</h2>
                </div>
                <p>{project.summary}</p>
              </header>

              <div className="work-case-visual" aria-hidden="true">
                <span>{project.number}</span>
                <strong>{project.title}</strong>
                <div>
                  <i>{project.category}</i>
                  <i>{project.year}</i>
                </div>
              </div>

              <div className="work-case-story">
                <div>
                  <span>Challenge</span>
                  <p>{project.challenge}</p>
                </div>
                <div>
                  <span>Response</span>
                  <p>{project.response}</p>
                </div>
                <div>
                  <span>Outcome</span>
                  <p>{project.outcome}</p>
                </div>
              </div>

              <footer>
                <span>Services</span>
                <ul>
                  {project.services.map((service) => (
                    <li key={service}>{service}</li>
                  ))}
                </ul>
                <a href="/start-project">
                  Dua diçka të tillë
                  <ArrowUpRight />
                </a>
              </footer>
            </article>
          ))}
        </section>

        <ContactSection />
      </main>

      <SiteFooter />
    </div>
  )
}
