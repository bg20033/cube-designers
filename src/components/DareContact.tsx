import { type FormEvent, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowUpRight, Check, X } from "lucide-react"

import grindSound from "@/assets/rr.mp3"
import { apiRequest, type SubmitStatus } from "@/lib/api"

type PrintPhase = "idle" | "printing" | "printed"

export default function DareContact() {
  const [phase, setPhase] = useState<PrintPhase>("idle")
  const [sendStatus, setSendStatus] = useState<SubmitStatus>("idle")
  const [sendError, setSendError] = useState("")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const switchRef = useRef<HTMLInputElement | null>(null)
  const isActive = phase !== "idle"

  useEffect(() => {
    if (!isActive) return

    const scrollY = window.scrollY
    const bodyStyles = {
      overflow: document.body.style.overflow,
      overscrollBehavior: document.body.style.overscrollBehavior,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    }
    const htmlStyles = {
      overflow: document.documentElement.style.overflow,
      overscrollBehavior: document.documentElement.style.overscrollBehavior,
    }
    const siteReveal = document.querySelector<HTMLElement>(".site-reveal")
    const siteWasInert = siteReveal?.inert ?? false

    document.documentElement.style.overflow = "hidden"
    document.documentElement.style.overscrollBehavior = "none"
    document.body.style.overflow = "hidden"
    document.body.style.overscrollBehavior = "none"
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = "100%"
    document.body.classList.add("contact-printer-active")
    if (siteReveal) siteReveal.inert = true

    return () => {
      document.body.classList.remove(
        "contact-printer-active",
        "contact-printer-printing",
        "contact-printer-ready",
      )
      document.documentElement.style.overflow = htmlStyles.overflow
      document.documentElement.style.overscrollBehavior =
        htmlStyles.overscrollBehavior
      document.body.style.overflow = bodyStyles.overflow
      document.body.style.overscrollBehavior = bodyStyles.overscrollBehavior
      document.body.style.position = bodyStyles.position
      document.body.style.top = bodyStyles.top
      document.body.style.width = bodyStyles.width
      if (siteReveal) siteReveal.inert = siteWasInert
      window.scrollTo({ top: scrollY, behavior: "instant" })
    }
  }, [isActive])

  useEffect(() => {
    document.body.classList.toggle(
      "contact-printer-printing",
      phase === "printing",
    )
    document.body.classList.toggle(
      "contact-printer-ready",
      phase === "printed",
    )

    if (phase !== "printing") return

    const audio = new Audio(grindSound)
    audio.loop = true
    audio.volume = 0.42
    audioRef.current = audio
    void audio.play().catch(() => {
      // The visual effect remains complete if a browser blocks audio playback.
    })

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    const timer = window.setTimeout(
      () => setPhase("printed"),
      reduceMotion ? 120 : 3300,
    )

    return () => {
      window.clearTimeout(timer)
      audio.pause()
      audio.currentTime = 0
      audioRef.current = null
    }
  }, [phase])

  function activatePrinter() {
    if (phase !== "idle") return
    setPhase("printing")
  }

  function closePrinter() {
    setPhase("idle")
    setSendStatus("idle")
    setSendError("")
    window.setTimeout(() => switchRef.current?.focus(), 0)
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sendStatus === "sending") return

    const data = new FormData(event.currentTarget)
    const name = String(data.get("name") ?? "")
    const email = String(data.get("email") ?? "")
    const message = String(data.get("message") ?? "")

    setSendStatus("sending")
    setSendError("")
    const result = await apiRequest("/api/submissions", {
      method: "POST",
      body: {
        kind: "contact",
        name,
        email,
        message,
        website: String(data.get("website") ?? ""),
      },
    })

    if (result.ok) {
      setSendStatus("sent")
      return
    }

    // Keep the message reachable even when the API is down.
    setSendStatus("error")
    setSendError(result.error)
    const subject = encodeURIComponent(`Kontakt nga ${name || "website"}`)
    const body = encodeURIComponent(
      `Emri: ${name}\nEmail: ${email}\n\n${message}`,
    )
    window.location.href = `mailto:info@cube-designers.com?subject=${subject}&body=${body}`
  }

  return (
    <section
      className={`dare-contact dare-contact--${phase}`}
      id="contact"
      aria-labelledby="dare-contact-title"
    >
      <header className="dare-contact__heading">
        <span>08 / Contact-o-matic</span>
        <h2 id="dare-contact-title">A guxon me prek?</h2>
        <p>
          Një klikim, një fletë dhe një rrugë e drejtpërdrejtë te ekipi që e
          mendon dhe e realizon punën.
        </p>
      </header>

      <div className="dare-contact__stage">
        <label className="danger-switch">
          <input
            ref={switchRef}
            type="checkbox"
            checked={isActive}
            disabled={isActive}
            onChange={activatePrinter}
            aria-label="Aktivizo makinën e kontaktit"
          />
          <span className="danger-switch__button" aria-hidden="true">
            <span className="danger-switch__light" />
            <span className="danger-switch__dots" />
            <span className="danger-switch__characters" />
            <span className="danger-switch__shine" />
            <span className="danger-switch__shadow" />
          </span>
        </label>
      </div>

      {isActive &&
        createPortal(
          <div
            className={`contact-printer-overlay contact-printer-overlay--${phase}`}
            role="dialog"
            aria-modal="true"
            aria-label="Forma e kontaktit"
          >
            <button
              className="contact-printer__close"
              type="button"
              onClick={closePrinter}
              aria-label="Mbylle formën e kontaktit"
              disabled={phase !== "printed"}
            >
              <span>Mbylle</span>
              <X />
            </button>

            <div
              className="contact-printer__output"
              aria-hidden={phase !== "printed"}
              inert={phase !== "printed"}
            >
              <form
                className={`contact-paper${sendStatus === "sent" ? " contact-paper--sent" : ""}`}
                onSubmit={sendMessage}
              >
                

                <div className="contact-paper__intro">
                  <span>{sendStatus === "sent" ? "Mesazhi u pranua." : "Fleta doli."}</span>
                  <h3>{sendStatus === "sent" ? "Faleminderit." : "Tash fol."}</h3>
                </div>

                {sendStatus === "sent" ? (
                  <div className="contact-paper__done" role="status">
                    <span className="contact-paper__stamp" aria-hidden="true">
                      <Check />
                      Dërguar
                    </span>
                    <p>
                      E morëm mesazhin. Të kthejmë përgjigje brenda 1–2 ditësh
                      pune.
                    </p>
                    <button type="button" onClick={closePrinter}>
                      Mbylle
                      <X />
                    </button>
                  </div>
                ) : (
                  <>

                <div className="contact-paper__fields">
                  <label>
                    <span>Emri / kompania</span>
                    <input
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Emri ose kompania jote"
                      required
                    />
                  </label>
                  <label>
                    <span>Email</span>
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="hello@kompania.com"
                      required
                    />
                  </label>
                  <label className="contact-paper__message">
                    <span>Çka po ndërtojmë?</span>
                    <textarea
                      name="message"
                      rows={4}
                      placeholder="Na trego shkurt për projektin..."
                      required
                    />
                  </label>
                </div>

                <input
                  className="contact-paper__trap"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />

                {sendError && (
                  <p className="contact-paper__error" role="alert">
                    {sendError} Po hapet email-i si alternativë.
                  </p>
                )}

                <button type="submit" disabled={sendStatus === "sending"}>
                  {sendStatus === "sending" ? "Po dërgohet…" : "Nise mesazhin"}
                  <ArrowUpRight />
                </button>
                  </>
                )}

                <span className="contact-paper__serial" aria-hidden="true">
                  CUBE DESIGNERS · SUHAREKË · KOSOVË
                </span>
              </form>
            </div>

            <div className="contact-printer__noise" aria-hidden="true">
              <span>GËRR</span>
              <span>GËRR</span>
              <span>GËRR</span>
            </div>

            <div className="contact-printer__machine" aria-hidden="true">
              <span>CONTACT-O-MATIC / 07</span>
              <i />
              <strong>{phase === "printing" ? "PRINTING" : "READY"}</strong>
            </div>
          </div>,
          document.body,
        )}

      <p className="sr-only" role="status" aria-live="polite">
        {phase === "printing"
          ? "Forma e kontaktit po printohet."
          : phase === "printed"
            ? "Forma e kontaktit është gati."
            : ""}
      </p>
    </section>
  )
}
