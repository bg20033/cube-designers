import { useMemo, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Mail,
  ShieldCheck,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import {
  SiteFooter,
  SiteHeader,
  SiteNoise,
} from "@/components/SiteChrome"

const serviceOptions = [
  "Brand identity",
  "Packaging",
  "Print production",
  "Website",
  "Content & social",
  "Campaign",
]

const budgetOptions = ["Nën €2K", "€2K–5K", "€5K–10K", "€10K+"]
const timelineOptions = ["Sa më shpejt", "1–2 muaj", "3–6 muaj", "Po planifikoj"]

const steps = [
  { number: "01", label: "Basics" },
  { number: "02", label: "Scope" },
  { number: "03", label: "Brief" },
  { number: "04", label: "Review" },
]

type BriefData = {
  name: string
  email: string
  company: string
  services: string[]
  budget: string
  timeline: string
  project: string
  success: string
}

const initialBrief: BriefData = {
  name: "",
  email: "",
  company: "",
  services: [],
  budget: "",
  timeline: "",
  project: "",
  success: "",
}

export default function ProjectBriefPage() {
  const [step, setStep] = useState(0)
  const [brief, setBrief] = useState(initialBrief)
  const [error, setError] = useState("")

  const mailtoHref = useMemo(() => {
    const body = [
      `Emri: ${brief.name}`,
      `Email: ${brief.email}`,
      `Kompania: ${brief.company || "—"}`,
      `Shërbimet: ${brief.services.join(", ")}`,
      `Buxheti: ${brief.budget}`,
      `Afati: ${brief.timeline}`,
      "",
      "Projekti:",
      brief.project,
      "",
      "Suksesi do të thotë:",
      brief.success || "—",
    ].join("\n")

    return `mailto:hello@kube.studio?subject=${encodeURIComponent(
      `Project brief — ${brief.company || brief.name}`,
    )}&body=${encodeURIComponent(body)}`
  }, [brief])

  function updateField<Key extends keyof BriefData>(
    field: Key,
    value: BriefData[Key],
  ) {
    setBrief((current) => ({ ...current, [field]: value }))
    setError("")
  }

  function toggleService(service: string) {
    const services = brief.services.includes(service)
      ? brief.services.filter((item) => item !== service)
      : [...brief.services, service]

    updateField("services", services)
  }

  function goNext() {
    if (step === 0 && (!brief.name.trim() || !brief.email.includes("@"))) {
      setError("Shkruaje emrin dhe një email valid për me vazhdu.")
      return
    }

    if (
      step === 1 &&
      (!brief.services.length || !brief.budget || !brief.timeline)
    ) {
      setError("Zgjidh së paku një shërbim, buxhetin dhe afatin.")
      return
    }

    if (step === 2 && brief.project.trim().length < 20) {
      setError("Na trego pak më shumë për projektin — së paku 20 karaktere.")
      return
    }

    setError("")
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  return (
    <div className="agency-site brief-page">
      <SiteNoise />
      <SiteHeader />

      <main id="top">
        <section className="brief-hero">
          <div className="brief-hero-copy">
            <span>K/05 · Start a project</span>
            <h1>
              TELL US
              <em>EVERYTHING.</em>
            </h1>
            <p>
              4 hapa, rreth 3 minuta. Në fund hapet email-i yt me brief-in gati
              për dërgim — asgjë nuk humbet në një formë pa përgjigje.
            </p>
          </div>

          <div className="brief-shell">
            <nav className="brief-progress" aria-label="Progresi i brief-it">
              {steps.map((item, index) => (
                <div
                  className={index <= step ? "active" : ""}
                  key={item.number}
                  aria-current={index === step ? "step" : undefined}
                >
                  <span>{item.number}</span>
                  <small>{item.label}</small>
                </div>
              ))}
            </nav>

            <form className="brief-form" onSubmit={(event) => event.preventDefault()}>
              <div className="brief-step-count">
                <span>Step {String(step + 1).padStart(2, "0")}</span>
                <strong>{steps[step].label}</strong>
              </div>

              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  className="brief-step"
                  key={step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step === 0 && (
                    <>
                      <div className="brief-question">
                        <span>01 / Përshëndetje</span>
                        <h2>Kush je?</h2>
                        <p>Na duhen vetëm bazat për me ditë me kë po flasim.</p>
                      </div>
                      <div className="brief-fields">
                        <label>
                          <span>Emri dhe mbiemri *</span>
                          <input
                            autoFocus
                            type="text"
                            value={brief.name}
                            onChange={(event) =>
                              updateField("name", event.target.value)
                            }
                            placeholder="Emri yt"
                          />
                        </label>
                        <label>
                          <span>Email *</span>
                          <input
                            type="email"
                            value={brief.email}
                            onChange={(event) =>
                              updateField("email", event.target.value)
                            }
                            placeholder="ti@kompania.com"
                          />
                        </label>
                        <label>
                          <span>Kompania / brandi</span>
                          <input
                            type="text"
                            value={brief.company}
                            onChange={(event) =>
                              updateField("company", event.target.value)
                            }
                            placeholder="Emri i brandit"
                          />
                        </label>
                      </div>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <div className="brief-question">
                        <span>02 / Scope</span>
                        <h2>Çka po ndërtojmë?</h2>
                        <p>Mund t’i zgjedhësh disa shërbime.</p>
                      </div>
                      <fieldset className="brief-options">
                        <legend>Shërbimet *</legend>
                        <div className="brief-option-grid">
                          {serviceOptions.map((service) => (
                            <button
                              className={
                                brief.services.includes(service) ? "selected" : ""
                              }
                              type="button"
                              onClick={() => toggleService(service)}
                              key={service}
                            >
                              {service}
                              <Check />
                            </button>
                          ))}
                        </div>
                      </fieldset>
                      <div className="brief-choice-row">
                        <fieldset className="brief-options">
                          <legend>Buxheti i përafërt *</legend>
                          <div className="brief-pills">
                            {budgetOptions.map((budget) => (
                              <button
                                className={brief.budget === budget ? "selected" : ""}
                                type="button"
                                onClick={() => updateField("budget", budget)}
                                key={budget}
                              >
                                {budget}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                        <fieldset className="brief-options">
                          <legend>Afati *</legend>
                          <div className="brief-pills">
                            {timelineOptions.map((timeline) => (
                              <button
                                className={
                                  brief.timeline === timeline ? "selected" : ""
                                }
                                type="button"
                                onClick={() => updateField("timeline", timeline)}
                                key={timeline}
                              >
                                {timeline}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="brief-question">
                        <span>03 / Context</span>
                        <h2>Na jep fotografinë.</h2>
                        <p>
                          Mos e formalizo tepër. Problemi, ideja dhe çka duhet
                          të ndryshojë janë të mjaftueshme.
                        </p>
                      </div>
                      <div className="brief-fields">
                        <label>
                          <span>Përshkruaje projektin *</span>
                          <textarea
                            autoFocus
                            rows={7}
                            value={brief.project}
                            onChange={(event) =>
                              updateField("project", event.target.value)
                            }
                            placeholder="Ku jeni tash, çka nuk po funksionon dhe çka po doni me ndërtu?"
                          />
                          <small>{brief.project.length} karaktere</small>
                        </label>
                        <label>
                          <span>Si duket suksesi?</span>
                          <textarea
                            rows={4}
                            value={brief.success}
                            onChange={(event) =>
                              updateField("success", event.target.value)
                            }
                            placeholder="P.sh. brand më i qartë, më shumë leads, lansim para një date..."
                          />
                        </label>
                      </div>
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <div className="brief-question">
                        <span>04 / Review</span>
                        <h2>Gati për email.</h2>
                        <p>
                          Kontrolloje përmbledhjen. Klikimi final e hap
                          aplikacionin tënd të email-it me krejt brief-in gati.
                        </p>
                      </div>
                      <div className="brief-review">
                        <div>
                          <span>Kontakt</span>
                          <strong>{brief.name}</strong>
                          <p>{brief.email}</p>
                        </div>
                        <div>
                          <span>Scope</span>
                          <strong>{brief.services.join(" · ")}</strong>
                          <p>{brief.budget} / {brief.timeline}</p>
                        </div>
                        <div>
                          <span>Projekti</span>
                          <p>{brief.project}</p>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="brief-error" aria-live="polite">
                {error}
              </div>

              <footer className="brief-controls">
                <button
                  className="brief-back"
                  type="button"
                  disabled={step === 0}
                  onClick={() => {
                    setError("")
                    setStep((current) => Math.max(0, current - 1))
                  }}
                >
                  <ArrowLeft />
                  Prapa
                </button>

                {step < steps.length - 1 ? (
                  <button className="brief-next" type="button" onClick={goNext}>
                    Vazhdo
                    <ArrowRight />
                  </button>
                ) : (
                  <a className="brief-next" href={mailtoHref}>
                    Hape email-in
                    <ArrowUpRight />
                  </a>
                )}
              </footer>
            </form>
          </div>
        </section>

        <section className="brief-after">
          <article>
            <Clock3 />
            <span>01</span>
            <strong>Përgjigje brenda 1–2 ditësh pune.</strong>
          </article>
          <article>
            <Mail />
            <span>02</span>
            <strong>Një bisedë e shkurtër për scope dhe fit.</strong>
          </article>
          <article>
            <ShieldCheck />
            <span>03</span>
            <strong>Proposal i qartë me afat dhe investim.</strong>
          </article>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
