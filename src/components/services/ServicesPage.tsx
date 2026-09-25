import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react"

import {
  ContactSection,
  SiteFooter,
  SiteHeader,
  SiteNoise,
} from "@/components/SiteChrome"
import {
  getServicesByCategory,
  serviceCategories,
  type ServiceCategory,
} from "@/data/services"
import "@/components/services/services.css"

const order: ServiceCategory[] = ["print", "branding", "digital", "social"]

export default function ServicesPage() {
  return (
    <div className="agency-site svc-page svc-hub">
      <SiteNoise />
      <SiteHeader />

      <main id="top">
        <section className="svc-hero">
          <nav className="svc-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Ballina</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Shërbimet</span>
          </nav>
          <span className="svc-eyebrow">Print · Branding · Digital · Social media</span>
          <h1>
            Krejt çka i duhet
            <em>brandit tuaj.</em>
          </h1>
          <p className="svc-lead">
            Nga kartvizita dhe tabela e dyqanit te logo, faqja e internetit dhe
            rrjetet sociale: një ekip në Suharekë që punon me biznese në
            Prishtinë dhe në gjithë Kosovën.
          </p>
          <div className="svc-actions">
            <a className="svc-primary" href="/start-project">
              Fillo një projekt
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
          <p className="svc-areas">
            <MapPin aria-hidden="true" />
            Suharekë · Prishtinë · gjithë Kosova
          </p>
        </section>

        {order.map((key, index) => {
          const category = serviceCategories[key]
          return (
            <section
              className={`svc-section svc-category is-${category.tone}`}
              id={key}
              key={key}
              aria-labelledby={`svc-cat-${key}`}
            >
              <header>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h2 id={`svc-cat-${key}`}>{category.label}</h2>
                <p>{category.intro}</p>
              </header>
              <div className="svc-category-grid">
                {getServicesByCategory(key).map((service) => (
                  <a href={`/sherbime/${service.slug}`} key={service.slug}>
                    <strong>{service.name}</strong>
                    <p>{service.description}</p>
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                ))}
              </div>
            </section>
          )
        })}

        <ContactSection />
      </main>

      <SiteFooter />
    </div>
  )
}
