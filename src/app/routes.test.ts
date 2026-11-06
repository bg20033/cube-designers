import { describe, expect, it } from "vitest"

import {
  getRouteSeo,
  matchRoute,
  normalizePathname,
  siteRoutes,
} from "@/app/routes"

describe("site route manifest", () => {
  it("normalizes trailing slashes and query strings", () => {
    expect(normalizePathname("/about/?section=2")).toBe("/about")
    expect(normalizePathname("///shop//")).toBe("/shop")
  })

  it("matches every declared route", () => {
    for (const route of siteRoutes) {
      expect(matchRoute(route.path)?.key).toBe(route.key)
      expect(getRouteSeo(route.key)?.title).toBeTruthy()
    }
  })

  it("keeps storefront routes out of the studio", () => {
    expect(matchRoute("/shop")).toBeNull()
    expect(matchRoute("/shop/business-cards")).toBeNull()
    expect(siteRoutes.some((route) => route.path.startsWith("/shop"))).toBe(false)
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
