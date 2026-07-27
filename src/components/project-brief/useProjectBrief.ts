import { useMemo, useState } from "react"

export type BriefData = {
  name: string
  email: string
  company: string
  services: string[]
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
  budget: "",
  timeline: "",
  project: "",
  success: "",
}

export function serializeProjectBrief(brief: BriefData) {
  return [
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
}

export function createProjectBriefMailto(brief: BriefData) {
  const subject = `Project brief — ${brief.company || brief.name}`
  return `mailto:hello@kube.studio?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(serializeProjectBrief(brief))}`
}

export function validateBriefStep(step: number, brief: BriefData) {
  if (step === 0 && (!brief.name.trim() || !brief.email.includes("@"))) {
    return "Shkruaje emrin dhe një email valid për me vazhdu."
  }

  if (
    step === 1 &&
    (!brief.services.length || !brief.budget || !brief.timeline)
  ) {
    return "Zgjidh së paku një shërbim, buxhetin dhe afatin."
  }

  if (step === 2 && brief.project.trim().length < 20) {
    return "Na trego pak më shumë për projektin — së paku 20 karaktere."
  }

  return ""
}

export function useProjectBrief(maxStep: number) {
  const [step, setStep] = useState(0)
  const [brief, setBrief] = useState(initialBrief)
  const [error, setError] = useState("")
  const mailtoHref = useMemo(() => createProjectBriefMailto(brief), [brief])

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
    mailtoHref,
    updateField,
    toggleService,
    goNext,
    goBack,
  }
}
