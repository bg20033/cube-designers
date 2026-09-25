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

  it("matches service landing pages", () => {
    expect(matchRoute("/sherbime")?.key).toBe("services")
    expect(matchRoute("/sherbime/web-design/")).toEqual({
      key: "service",
      pathname: "/sherbime/web-design",
      params: { slug: "web-design" },
    })
  })

  it("rejects unknown pages", () => {
    expect(matchRoute("/nothing-here")).toBeNull()
  })
})

describe("service catalog", () => {
  it("has unique slugs, valid related links and complete SEO fields", async () => {
    const { services, getServiceBySlug } = await import("@/data/services")
    const slugs = services.map((service) => service.slug)
    expect(new Set(slugs).size).toBe(slugs.length)

    for (const service of services) {
      expect(service.seoTitle.length).toBeLessThanOrEqual(65)
      expect(service.description.length).toBeLessThanOrEqual(170)
      expect(service.faqs.length).toBeGreaterThanOrEqual(3)
      for (const slug of service.related) {
        expect(getServiceBySlug(slug), `${service.slug} → ${slug}`).toBeTruthy()
      }
    }
  })
})
