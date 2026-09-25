import { describe, expect, it } from "vitest"

import {
  getRouteSeo,
  matchRoute,
  normalizePathname,
  SHOP_ENABLED,
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

  it("matches product slugs only while the shop is enabled", () => {
    expect(matchRoute("/shop/business-cards")).toEqual(
      SHOP_ENABLED
        ? {
            key: "product",
            pathname: "/shop/business-cards",
            params: { slug: "business-cards" },
          }
        : null,
    )
    expect(matchRoute("/shop")?.key ?? null).toBe(SHOP_ENABLED ? "shop" : null)
  })

  it("rejects unknown pages", () => {
    expect(matchRoute("/nothing-here")).toBeNull()
  })
})
