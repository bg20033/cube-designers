import { beforeEach, describe, expect, it } from "vitest"

import {
  readStoredJson,
  writeStoredJson,
} from "@/components/shop/persistence"

describe("shop persistence", () => {
  beforeEach(() => window.localStorage.clear())

  it("returns a fallback for corrupt storage", () => {
    window.localStorage.setItem("cart", "{broken")
    expect(readStoredJson("cart", [])).toEqual([])
  })

  it("round-trips JSON values", () => {
    writeStoredJson("favorites", ["business-cards"])
    expect(readStoredJson("favorites", [])).toEqual(["business-cards"])
  })
})
