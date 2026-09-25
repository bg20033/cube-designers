import { ArrowRight, ArrowUpRight, Check, MapPin, Plus } from "lucide-react"

import NotFoundPage from "@/components/NotFoundPage"
import {
  ContactSection,
  SiteFooter,
  SiteHeader,
  SiteNoise,
} from "@/components/SiteChrome"
import {
  getServiceBySlug,
  serviceAreas,
  serviceCategories,
  type ServicePageData,
} from "@/data/services"
import "@/components/services/services.css"

const process = [
  { title: "Brief", text: "Na tregoni çka ju duhet, për kë dhe deri kur." },
  { title: "Propozim", text: "Ju kthejmë drejtimin, afatin dhe ofertën e qartë." },
  { title: "Realizim", text: "Dizajnojmë, ju tregojmë provat dhe i finalizojmë bashkë." },
  { title: "Dorëzim", text: "Materiali final, i printuar ose online, gati për përdorim." },
]

export function ServiceDetail({ service }: { service: ServicePageData }) {
  const category = serviceCategories[service.category]
  const related = service.related
    .map((slug) => getServiceBySlug(slug))
    .filter((item): item is ServicePageData => Boolean(item))

  return (
    <div className={`agency-site svc-page is-${category.tone}`}>
      <SiteNoise />
      <SiteHeader />

      <main id="top">
        <section className="svc-hero">
          <nav className="svc-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Ballina</a>
            <span aria-hidden="true">/</span>
            <a href="/sherbime">Shërbimet</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{service.name}</span>
          </nav>

          <span className="svc-eyebrow">{category.eyebrow}</span>
          <h1>{service.title}</h1>
          <p className="svc-lead">{service.lead}</p>

          <div className="svc-actions">
            <a className="svc-primary" href="/start-project">
              Kërko ofertë
              <ArrowRight aria-hidden="true" />
            </a>
            <a className="svc-secondary" href={`mailto:info@cube-designers.com?subject=${encodeURIComponent(`Ofertë — ${service.name}`)}`}>
              info@cube-designers.com
              <ArrowUpRight aria-hidden="true" />
            </a>
          </div>

          <p className="svc-areas">
            <MapPin aria-hidden="true" />
            {service.name} në {serviceAreas.slice(0, -1).join(", ")} dhe {serviceAreas.at(-1)}
          </p>
        </section>

        <section className="svc-section svc-includes" aria-labelledby="svc-includes-title">
          <header>
            <span>01</span>
            <h2 id="svc-includes-title">Çka përfshin</h2>
          </header>
          <div className="svc-include-grid">
            {service.includes.map((item, index) => (
              <article key={item.title}>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="svc-section svc-fit" aria-labelledby="svc-fit-title">
          <div>
            <header>
              <span>02</span>
              <h2 id="svc-fit-title">Për kë është</h2>
            </header>
            <ul className="svc-checks">
              {service.forWho.map((item) => (
                <li key={item}>
                  <Check aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <header>
              <span>03</span>
              <h2>Njihet edhe si</h2>
            </header>
            <ul className="svc-terms">
              {service.alsoKnownAs.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="svc-section svc-process" aria-labelledby="svc-process-title">
          <header>
            <span>04</span>
            <h2 id="svc-process-title">Si punojmë</h2>
          </header>
          <ol>
            {process.map((step, index) => (
              <li key={step.title}>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="svc-section svc-faq" aria-labelledby="svc-faq-title">
          <header>
            <span>05</span>
            <h2 id="svc-faq-title">Pyetje të shpeshta</h2>
          </header>
          <div>
            {service.faqs.map((faq) => (
              <details key={faq.q}>
                <summary>
                  {faq.q}
                  <Plus aria-hidden="true" />
                </summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="svc-section svc-related" aria-labelledby="svc-related-title">
          <header>
            <span>06</span>
            <h2 id="svc-related-title">Shërbime të lidhura</h2>
          </header>
          <div className="svc-related-grid">
            {related.map((item) => (
              <a href={`/sherbime/${item.slug}`} key={item.slug}>
                <small>{serviceCategories[item.category].label}</small>
                <strong>{item.name}</strong>
                <ArrowUpRight aria-hidden="true" />
              </a>
            ))}
            <a className="is-all" href="/sherbime">
              <small>Katalogu</small>
              <strong>Të gjitha shërbimet</strong>
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </section>

        <ContactSection />
      </main>

      <SiteFooter />
    </div>
  )
}

export default function ServicePage({ slug }: { slug: string }) {
  const service = getServiceBySlug(slug)
  if (!service) return <NotFoundPage />
  return <ServiceDetail service={service} />
}
