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
  heroImage: string
  gallery: string[]
}

export const caseStudies: CaseStudy[] = [
  {
    slug: "sermova",
    number: "01",
    title: "SERMOVA",
    category: "Identity / Signage",
    year: "Selected work",
    summary:
      "Një identitet i ndërtuar për të jetuar nga skica te hapësira, automjeti dhe komunikimi digjital.",
    challenge:
      "Me kriju një shenjë të dallueshme që mbetet e qartë në formate dhe distanca krejt të ndryshme.",
    response:
      "Zhvillim i shenjës, paletë e kontrolluar dhe aplikime të projektuara si një familje e vetme vizuale.",
    outcome:
      "Një sistem i dokumentuar në signage, flotë, flamuj, billboard dhe materiale të brandit.",
    services: ["Identity", "Logo development", "Signage", "Applications"],
    tone: "orange",
    heroImage: "sermova-vehicle",
    gallery: [
      "sermova-logo-sketch",
      "sermova-logo-paper",
      "sermova-building-sign",
      "sermova-flags",
      "sermova-brand-system",
      "sermova-billboard",
    ],
  },
  {
    slug: "altec",
    number: "02",
    title: "ALTEC",
    category: "Identity / Applications",
    year: "Selected work",
    summary:
      "Një identitet teknik i mbajtur konsistent në zyrë, automjete, flamuj dhe materiale prezantuese.",
    challenge:
      "Me e bërë markën të lexueshme dhe profesionale si në detaj të vogël, ashtu edhe në fasadë.",
    response:
      "Një gjuhë e disiplinuar me shenjë, tipografi dhe vija grafike që përshtaten pa humbur strukturën.",
    outcome:
      "Një seri aplikimesh reale që e tregojnë identitetin në punë, jo vetëm në prezantim.",
    services: ["Identity", "Fleet graphics", "Environmental", "Stationery"],
    tone: "violet",
    heroImage: "altec-building-sign",
    gallery: [
      "altec-sketch",
      "altec-logo-paper",
      "altec-office-sign",
      "altec-vehicle",
      "altec-brand-system",
      "altec-flags",
    ],
  },
  {
    slug: "from-sketch",
    number: "03",
    title: "FROM SKETCH",
    category: "Logo development",
    year: "Process archive",
    summary:
      "Një vështrim i afërt te puna mes idesë së parë, konstruksionit dhe shenjës së aplikuar.",
    challenge:
      "Me gjetë një formë që është e thjeshtë për t'u njohur, por mjaftueshëm karakteristike për t'u mbajtur mend.",
    response:
      "Skicim, krahasim proporcionesh, rafinim i linjave dhe prova në materiale para aplikimit final.",
    outcome:
      "Një proces i dukshëm që lidh vendimet e vogla me një rezultat të qartë dhe të prodhueshëm.",
    services: ["Research", "Sketching", "Logo construction", "Mockups"],
    tone: "acid",
    heroImage: "identity-process-collage",
    gallery: [
      "identity-sketch-one",
      "identity-sketch-two",
      "identity-sketch-three",
      "identity-sketch-four",
      "identity-wall-mark",
    ],
  },
]
