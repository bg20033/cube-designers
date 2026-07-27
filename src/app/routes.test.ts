import { describe, expect, it } from "vitest"

import {
  getRouteSeo,
  matchRoute,
  normalizePathname,
  siteRoutes,
} from "@/app/routes"

describe("site route manifest", () => {
  it("normalizes trailing slashes and query strings", () => {
    expect(normalizePathname("/roadmap/?phase=2")).toBe("/roadmap")
    expect(normalizePathname("///shop//")).toBe("/shop")
  })

  it("matches every declared route", () => {
    for (const route of siteRoutes) {
      expect(matchRoute(route.path)?.key).toBe(route.key)
      expect(getRouteSeo(route.key)?.title).toBeTruthy()
    }
  })

  it("matches product slugs and rejects unknown pages", () => {
    expect(matchRoute("/shop/business-cards")).toEqual({
      key: "product",
      pathname: "/shop/business-cards",
      params: { slug: "business-cards" },
    })
    expect(matchRoute("/nothing-here")).toBeNull()
  })
})
