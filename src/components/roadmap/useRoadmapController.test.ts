import { describe, expect, it } from "vitest"

import { getPhaseIndex } from "@/components/roadmap/useRoadmapController"

const phases = [
  { endDay: 10 },
  { endDay: 25 },
  { endDay: 55 },
  { endDay: 75 },
  { endDay: 90 },
]

describe("roadmap phase mapping", () => {
  it("keeps boundary days in their intended phase", () => {
    expect(getPhaseIndex(0, phases)).toBe(0)
    expect(getPhaseIndex(10, phases)).toBe(0)
    expect(getPhaseIndex(11, phases)).toBe(1)
    expect(getPhaseIndex(75, phases)).toBe(3)
    expect(getPhaseIndex(90, phases)).toBe(4)
  })

  it("clamps days after the roadmap to the final phase", () => {
    expect(getPhaseIndex(120, phases)).toBe(4)
  })
})
