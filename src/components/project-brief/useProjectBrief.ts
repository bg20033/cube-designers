import { useMemo, useState } from "react"

import { apiRequest, type SubmitStatus } from "@/lib/api"

export type BriefData = {
  name: string
  email: string
  company: string
  services: string[]
  engagement: string
  budget: string
  timeline: string
  project: string
  success: string
}

export const initialBrief: BriefData = {
  name: "",
  email: "",
  company: "",
  services: [],
  engagement: "",
  budget: "",
  timeline: "",
  project: "",
  success: "",
}

export const engagementOptions = [
  "Vetëm një herë",
  "3 muaj",
  "6 muaj",
  "1 vit",
  "Bashkëpunim i vazhdueshëm",
]

export function isOneTimeEngagement(engagement: string) {
  return !engagement || engagement === engagementOptions[0]
}

// "1500" + "6 muaj" → "€1500 / muaj"; one-time projects show a total.
export function formatBudget(budget: string, engagement: string) {
  const amount = budget.trim()
  if (!amount) return ""
  const withCurrency = amount.includes("€") ? amount : `€${amount}`
  return isOneTimeEngagement(engagement) ? withCurrency : `${withCurrency} / muaj`
}

// `?service=Kartvizita` (repeatable) preselects services, e.g. from the
// "Kërko ofertë" buttons in service modals and service pages.
function readPrefill(): Partial<BriefData> {
  if (typeof window === "undefined") return {}
  const services = new URLSearchParams(window.location.search)
    .getAll("service")
    .map((service) => service.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 6)
  return services.length ? { services: [...new Set(services)] } : {}
}

export function serializeProjectBrief(brief: BriefData) {
  return [
    `Emri: ${brief.name}`,
    `Email: ${brief.email}`,
    `Kompania: ${brief.company || "—"}`,
    `Shërbimet: ${brief.services.join(", ")}`,
    `Bashkëpunimi: ${brief.engagement}`,
    `Buxheti: ${formatBudget(brief.budget, brief.engagement)}`,
    `Afati: ${brief.timeline}`,
    "",
    "Projekti:",
    brief.project,
    "",
    "Suksesi do të thotë:",
    brief.success || "—",
  ].join("\n")
}

export function createProjectBriefMailto(brief: BriefData) {
  const subject = `Project brief — ${brief.company || brief.name}`
  return `mailto:info@cube-designers.com?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(serializeProjectBrief(brief))}`
}

export function validateBriefStep(step: number, brief: BriefData) {
  if (step === 0 && (!brief.name.trim() || !brief.email.includes("@"))) {
    return "Shkruaje emrin dhe një email valid për me vazhdu."
  }

  if (step === 1) {
    if (!brief.services.length) return "Zgjidh së paku një shërbim."
    if (!brief.engagement) return "Na trego sa gjatë e do bashkëpunimin."
    if (!/\d/.test(brief.budget)) return "Shkruaje buxhetin e përafërt në euro."
    if (!brief.timeline) return "Zgjidh kur do me fillu."
  }

  if (step === 2 && brief.project.trim().length < 20) {
    return "Na trego pak më shumë për projektin — së paku 20 karaktere."
  }

  return ""
}

export function useProjectBrief(maxStep: number) {
  const [step, setStep] = useState(0)
  const [brief, setBrief] = useState<BriefData>(() => ({
    ...initialBrief,
    ...readPrefill(),
  }))
  const [error, setError] = useState("")
  const [status, setStatus] = useState<SubmitStatus>("idle")
  const mailtoHref = useMemo(() => createProjectBriefMailto(brief), [brief])

  async function submit() {
    if (status === "sending") return
    setStatus("sending")
    setError("")

    const result = await apiRequest("/api/submissions", {
      method: "POST",
      body: {
        kind: "project",
        name: brief.name,
        email: brief.email,
        company: brief.company,
        message: brief.project,
        services: brief.services,
        engagement: brief.engagement,
        budget: formatBudget(brief.budget, brief.engagement),
        timeline: brief.timeline,
        success: brief.success,
      },
    })

    if (result.ok) {
      setStatus("sent")
      return
    }

    setStatus("error")
    setError(`${result.error} Mund ta dërgosh edhe me email.`)
  }

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
    const validationError = validateBriefStep(step, brief)
    if (validationError) {
      setError(validationError)
      return
    }

    setError("")
    setStep((current) => Math.min(current + 1, maxStep))
  }

  function goBack() {
    setError("")
    setStep((current) => Math.max(0, current - 1))
  }

  return {
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
  }
}
