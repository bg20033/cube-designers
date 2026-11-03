import { ArrowUpRight, CheckCircle2 } from "lucide-react"

import { caseStudies } from "@/components/workData"
import { ResponsiveImage } from "@/components/ResponsiveImage"
const collaborationPoints = [
  {
    number: "01",
    title: "Direct access",
    copy: "Flet direkt me ekipin që e mendon dhe e realizon punën.",
  },
  {
    number: "02",
    title: "One connected system",
    copy: "Brand, print dhe digital zhvillohen në të njëjtin drejtim.",
  },
  {
    number: "03",
    title: "Built to be used",
    copy: "Rezultati nuk është vetëm prezantim — vjen gati për punë reale.",
  },
]

export function FeaturedWork() {
  return (
    <section className="featured-work" id="work">
      <header className="featured-work-heading">
        <div>
          <span>04 / Selected work</span>
          <h2>IDEAS MADE<br />VISIBLE.</h2>
        </div>
        <div>
          <p>
            Tri shembuj se si një drejtim i fortë kthehet në sistem, objekt dhe
            eksperiencë.
          </p>
          <a href="/work">
            Shiko krejt punën
            <ArrowUpRight />
          </a>
        </div>
      </header>

      <div className="featured-work-grid">
        {caseStudies.map((project) => (
          <a
            className="featured-project"
            data-tone={project.tone}
            href={`/work#${project.slug}`}
            key={project.slug}
          >
            <div className="featured-project-visual">
              <ResponsiveImage
                image={project.heroImage}
                sizes="(max-width: 760px) 100vw, 33vw"
              />
              <span>{project.number}</span>
              <strong aria-hidden="true">{project.title}</strong>
              <i>{project.category}</i>
            </div>
            <div className="featured-project-copy">
              <span>{project.category}</span>
              <strong>{project.title}</strong>
              <ArrowUpRight />
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

export function CollaborationProof() {
  return (
    <section className="collaboration-proof">
      <header>
        <span>05 / Working with CUBE</span>
        <h2>GOOD WORK.<br />NO MYSTERY.</h2>
        <p>
          Procesi duhet të ndihet po aq i mirë sa rezultati. Këto janë tri
          gjëra konkrete që partnerët mund t’i presin prej nesh.
        </p>
      </header>

      <div>
        {collaborationPoints.map((point) => (
          <article key={point.number}>
            <CheckCircle2 />
            <span>{point.number}</span>
            <strong>{point.title}</strong>
            <p>{point.copy}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
