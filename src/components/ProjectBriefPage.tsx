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
import {
  engagementOptions,
  formatBudget,
  isOneTimeEngagement,
  useProjectBrief,
} from "@/components/project-brief/useProjectBrief"

const serviceOptions = [
  "Logo & branding",
  "Print",
  "Packaging",
  "Website",
  "Dyqan online",
  "SEO",
  "Social media menaxhim",
  "Reklama online",
  "Foto & video",
]

const timelineOptions = ["Sa më shpejt", "Brenda muajit", "1–3 muaj", "Po planifikoj"]

const steps = [
  { number: "01", label: "Basics" },
  { number: "02", label: "Scope" },
  { number: "03", label: "Brief" },
  { number: "04", label: "Review" },
]

export default function ProjectBriefPage() {
  const {
    step,
    brief,
    error,
    status,
    mailtoHref,
    submit,
    updateField,
    toggleService,
    goNext,
    goBack,
  } = useProjectBrief(steps.length - 1)

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
              4 hapa, rreth 3 minuta. Brief-i vjen direkt te ekipi dhe të
              kthehemi me përgjigje brenda 1–2 ditësh pune.
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
                          {/* Services prefilled from a "Kërko ofertë" link stay selectable. */}
                          {[
                            ...brief.services.filter((service) => !serviceOptions.includes(service)),
                            ...serviceOptions,
                          ].map((service) => (
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
                      <fieldset className="brief-options">
                        <legend>Sa gjatë e doni bashkëpunimin? *</legend>
                        <div className="brief-pills">
                          {engagementOptions.map((engagement) => (
                            <button
                              className={brief.engagement === engagement ? "selected" : ""}
                              type="button"
                              onClick={() => updateField("engagement", engagement)}
                              key={engagement}
                            >
                              {engagement}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                      <label className="brief-budget">
                        <span>
                          {isOneTimeEngagement(brief.engagement)
                            ? "Buxheti total *"
                            : "Buxheti në muaj *"}
                        </span>
                        <div>
                          <b aria-hidden="true">€</b>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={brief.budget}
                            onChange={(event) =>
                              updateField(
                                "budget",
                                event.target.value.replace(/[^\d.,\s–-]/g, "").slice(0, 20),
                              )
                            }
                            placeholder={
                              isOneTimeEngagement(brief.engagement) ? "p.sh. 1500" : "p.sh. 400"
                            }
                          />
                          {!isOneTimeEngagement(brief.engagement) && (
                            <small aria-hidden="true">/ muaj</small>
                          )}
                        </div>
                      </label>
                      <fieldset className="brief-options">
                        <legend>Kur doni me fillu? *</legend>
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

                  {step === 3 && status === "sent" && (
                    <div className="brief-question brief-sent" role="status">
                      <span>
                        <Check /> Brief-i u dërgua
                      </span>
                      <h2>Faleminderit, {brief.name.split(" ")[0]}.</h2>
                      <p>
                        E morëm brief-in. Të shkruajmë te {brief.email} brenda
                        1–2 ditësh pune.
                      </p>
                    </div>
                  )}

                  {step === 3 && status !== "sent" && (
                    <>
                      <div className="brief-question">
                        <span>04 / Review</span>
                        <h2>Gati për dërgim.</h2>
                        <p>
                          Kontrolloje përmbledhjen dhe dërgoje. Brief-i vjen
                          direkt te ekipi i CUBE.
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
                          <p>
                            {brief.engagement} · {formatBudget(brief.budget, brief.engagement)} ·{" "}
                            {brief.timeline}
                          </p>
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

              {status === "sent" ? null : (
              <footer className="brief-controls">
                <button
                  className="brief-back"
                  type="button"
                  disabled={step === 0}
                  onClick={goBack}
                >
                  <ArrowLeft />
                  Prapa
                </button>

                {step < steps.length - 1 ? (
                  <button className="brief-next" type="button" onClick={goNext}>
                    Vazhdo
                    <ArrowRight />
                  </button>
                ) : status === "error" ? (
                  <a className="brief-next" href={mailtoHref}>
                    Dërgo me email
                    <ArrowUpRight />
                  </a>
                ) : (
                  <button
                    className="brief-next"
                    type="button"
                    onClick={submit}
                    disabled={status === "sending"}
                  >
                    {status === "sending" ? "Po dërgohet…" : "Dërgo brief-in"}
                    <ArrowRight />
                  </button>
                )}
              </footer>
              )}
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
