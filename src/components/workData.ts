export type CaseStudy = {
  slug: string
  number: string
  title: string
  category: string
  year: string
  summary: string
  challenge: string
  response: string
  outcome: string
  services: string[]
  tone: "orange" | "violet" | "acid"
}

export const caseStudies: CaseStudy[] = [
  {
    slug: "lume",
    number: "01",
    title: "LUMË",
    category: "Brand system",
    year: "2026",
    summary:
      "Një identitet i qetë, i dallueshëm dhe i ndërtuar për me funksionu në çdo format.",
    challenge:
      "Me e kthyer një ide të mirë në brand që njihet menjëherë, pa u varur vetëm nga logoja.",
    response:
      "Pozicionim, logo suite, tipografi, ngjyra dhe një gjuhë grafike që mund të zgjerohet pa humbur karakter.",
    outcome:
      "Një sistem i vetëm për packaging, social, prezantime dhe komunikim të përditshëm.",
    services: ["Strategy", "Identity", "Art direction", "Guidelines"],
    tone: "orange",
  },
  {
    slug: "forma",
    number: "02",
    title: "FORMA",
    category: "Editorial / Print",
    year: "2026",
    summary:
      "Informacion kompleks i kthyer në një publikim të qartë dhe të këndshëm për t’u lexuar.",
    challenge:
      "Me organizu shumë të dhëna, kapituj dhe nivele informacioni pa e humbur ritmin vizual.",
    response:
      "Grid editorial, hierarki tipografike, infografika dhe një sistem fleksibil për faqe të ndryshme.",
    outcome:
      "Raport që lexohet shpejt, duket premium dhe kalon drejt në prodhim.",
    services: ["Editorial concept", "Typography", "Infographics", "Prepress"],
    tone: "violet",
  },
  {
    slug: "nexus",
    number: "03",
    title: "NEXUS",
    category: "Digital flagship",
    year: "2026",
    summary:
      "Një eksperiencë web e shpejtë që e lidh historinë e brandit me një rrugë të qartë drejt kontaktit.",
    challenge:
      "Me prezantu një ofertë të gjerë pa e ngarkuar përdoruesin dhe pa e bërë faqen të duket gjenerike.",
    response:
      "UX strategy, sistem UI modular, motion i kontrolluar dhe zhvillim responsive rreth përmbajtjes.",
    outcome:
      "Website me karakter, navigim të qartë dhe strukturë gati për rritje.",
    services: ["UX strategy", "UI system", "Motion", "Development"],
    tone: "acid",
  },
]
