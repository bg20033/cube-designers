import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react"

import { caseStudies } from "@/components/workData"
import { ResponsiveImage } from "@/components/ResponsiveImage"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  getServicesByCategory,
  serviceCategories,
  type ServiceCategory,
} from "@/data/services"

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

export const faqs = [
  {
    question: "A punoni vetëm me paketa të plota?",
    answer:
      "Jo. Mund të fillojmë me një nevojë të vetme, por gjithmonë e shohim si pjesë të sistemit të brandit që të mos krijojmë zgjidhje të shkëputura.",
  },
  {
    question: "Sa zgjat zakonisht një projekt?",
    answer:
      "Një sprint i fokusuar mund të zgjasë 2–4 javë; një brand ose website i plotë zakonisht 6–10 javë. Afati final varet nga scope-i dhe ritmi i feedback-ut.",
  },
  {
    question: "A e menaxhoni edhe prodhimin e printit?",
    answer:
      "Po. Përgatisim artwork-un, materialet, finish-at dhe mund ta koordinojmë prodhimin deri te kontrolli final.",
  },
  {
    question: "A mund të vazhdojmë bashkë pas lansimit?",
    answer:
      "Po. Mund të ndërtojmë një retainer për content, design support, optimizim të web-it ose kampanja.",
  },
  {
    question: "Çka ju duhet për me fillu?",
    answer:
      "Një ide e qartë për problemin, afatin dhe buxhetin e përafërt. Project brief-i ynë i mbledh krejt këto për disa minuta.",
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

const directoryOrder: ServiceCategory[] = ["print", "branding", "digital", "social"]

// Crawlable links from the home page to every service landing page.
export function ServicesDirectory() {
  return (
    <section className="services-directory" aria-labelledby="services-directory-title">
      <header>
        <span>06 / Shërbimet</span>
        <h2 id="services-directory-title">
          Print, dizajn & marketing
          <em>në Suharekë dhe gjithë Kosovën.</em>
        </h2>
        <p>
          CUBE DESIGNERS është agjenci kreative në Suharekë. Dizajnojmë logo dhe
          identitet vizual, printojmë kartvizita, fletushka, roll-up e banera,
          ndërtojmë faqe interneti dhe dyqane online, dhe menaxhojmë rrjetet
          sociale për biznese në Suharekë, Prishtinë dhe në gjithë Kosovën.
        </p>
      </header>
      <div className="services-directory__grid">
        {directoryOrder.map((key) => (
          <div key={key}>
            <a className="services-directory__title" href={`/sherbime#${key}`}>
              {serviceCategories[key].label}
              <ArrowRight aria-hidden="true" />
            </a>
            <ul>
              {getServicesByCategory(key).map((service) => (
                <li key={service.slug}>
                  <a href={`/sherbime/${service.slug}`}>{service.name}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

export function FaqSection() {
  return (
    <section className="studio-faq">
      <header>
        <div>
          <span>07 / FAQ</span>
          <h2>PARA SE<br />TË FILLOJMË.</h2>
        </div>
        <a href="/start-project">
          Plotëso brief-in
          <ArrowRight />
        </a>
      </header>

      <Accordion className="studio-faq-list">
        {faqs.map((faq, index) => (
          <AccordionItem key={faq.question}>
            <AccordionTrigger className="studio-faq-trigger">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{faq.question}</strong>
            </AccordionTrigger>
            {/* hiddenUntilFound keeps closed answers in the HTML for search engines. */}
            <AccordionContent className="studio-faq-content" hiddenUntilFound>
              <p>{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
