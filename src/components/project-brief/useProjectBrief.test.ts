import { describe, expect, it } from "vitest"

import {
  createProjectBriefMailto,
  initialBrief,
  serializeProjectBrief,
  validateBriefStep,
} from "@/components/project-brief/useProjectBrief"

describe("project brief model", () => {
  it("validates each required step", () => {
    expect(validateBriefStep(0, initialBrief)).toContain("email valid")
    expect(
      validateBriefStep(1, {
        ...initialBrief,
        name: "Arta",
        email: "arta@example.com",
      }),
    ).toContain("shërbim")
    expect(
      validateBriefStep(2, {
        ...initialBrief,
        project: "shumë shkurt",
      }),
    ).toContain("20 karaktere")
  })

  it("serializes and encodes the brief for email", () => {
    const brief = {
      ...initialBrief,
      name: "Arta",
      email: "arta@example.com",
      services: ["Brand identity"],
      budget: "€2K–5K",
      timeline: "1–2 muaj",
      project: "Një identitet i ri për kompaninë tonë.",
    }

    expect(serializeProjectBrief(brief)).toContain("Arta")
    expect(createProjectBriefMailto(brief)).toMatch(
      /^mailto:hello@kube\.studio\?/,
    )
  })
})
