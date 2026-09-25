import { describe, expect, it } from "vitest"

import {
  createProjectBriefMailto,
  initialBrief,
  serializeProjectBrief,
  formatBudget,
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
    const scoped = {
      ...initialBrief,
      name: "Arta",
      email: "arta@example.com",
      services: ["Website"],
    }
    expect(validateBriefStep(1, scoped)).toContain("bashkëpunimin")
    expect(
      validateBriefStep(1, { ...scoped, engagement: "6 muaj", budget: "" }),
    ).toContain("buxhetin")
    expect(
      validateBriefStep(1, {
        ...scoped,
        engagement: "6 muaj",
        budget: "400",
        timeline: "Sa më shpejt",
      }),
    ).toBe("")
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
      engagement: "Vetëm një herë",
      budget: "1500",
      timeline: "Sa më shpejt",
      project: "Një identitet i ri për kompaninë tonë.",
    }

    expect(serializeProjectBrief(brief)).toContain("Arta")
    expect(serializeProjectBrief(brief)).toContain("Buxheti: €1500")
    expect(createProjectBriefMailto(brief)).toMatch(
      /^mailto:info@cube-designers\.com\?/,
    )
  })

  it("labels monthly budgets for ongoing work", () => {
    expect(formatBudget("1500", "Vetëm një herë")).toBe("€1500")
    expect(formatBudget("400", "1 vit")).toBe("€400 / muaj")
    expect(formatBudget("", "1 vit")).toBe("")
  })
})
