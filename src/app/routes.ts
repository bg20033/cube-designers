export type RouteKey =
  | "home"
  | "about"
  | "work"
  | "roadmap"
  | "shop"
  | "product"
  | "start-project"
  | "services"
  | "service"

type ParamRouteKey = "product" | "service"

export type RouteSeo = {
  title: string
  description: string
  canonicalPath: string
  index: boolean
  sitemap: boolean
  ogImage: string
}

export type SiteRoute = {
  key: Exclude<RouteKey, ParamRouteKey>
  path: string
  seo: RouteSeo
}

export type RouteMatch =
  | { key: Exclude<RouteKey, ParamRouteKey>; pathname: string; params: Record<string, never> }
  | { key: ParamRouteKey; pathname: string; params: { slug: string } }

// Shop is hidden until launch: no nav link, no /shop routes, not prerendered.
export const SHOP_ENABLED = false

const allRoutes: SiteRoute[] = [
  {
    key: "home",
    path: "/",
    seo: {
      title: "CUBE DESIGNERS | Agjenci Marketingu, Print & Web në Kosovë",
      description:
        "Agjenci kreative në Suharekë për branding, dizajn logo, printim, web design, dyqane online dhe menaxhim të rrjeteve sociale në gjithë Kosovën.",
      canonicalPath: "/",
      index: true,
      sitemap: true,
      ogImage: "/og.png",
    },
  },
  {
    key: "about",
    path: "/about",
    seo: {
      title: "CUBE DESIGNERS | Studio kreative & branding në Kosovë",
      description:
        "Studio kreative në Suharekë, Kosovë për branding, identitet vizual, dizajn grafik, print, packaging, web design dhe e-commerce.",
      canonicalPath: "/about",
      index: true,
      sitemap: true,
      ogImage: "/og.png",
    },
  },
  {
    key: "work",
    path: "/work",
    seo: {
      title: "Projektet tona | Branding, print dhe digital",
      description:
        "Shihni punën e CUBE DESIGNERS në identitet vizual, print, fushata dhe produkte digjitale.",
      canonicalPath: "/work",
      index: true,
      sitemap: true,
      ogImage: "/og.png",
    },
  },
  {
    key: "roadmap",
    path: "/roadmap",
    seo: {
      title: "Roadmap 90-ditor | Nga ideja te sistemi",
      description:
        "Procesi 90-ditor i CUBE DESIGNERS për të lidhur brandin, printin, digitalin dhe e-commerce.",
      canonicalPath: "/roadmap",
      index: true,
      sitemap: true,
      ogImage: "/og.png",
    },
  },
  {
    key: "shop",
    path: "/shop",
    seo: {
      title: "Shop | Print dhe produkte të personalizuara",
      description:
        "Porosit materiale printi, packaging, textile, signage dhe produkte promocionale nga CUBE DESIGNERS.",
      canonicalPath: "/shop",
      index: true,
      sitemap: true,
      ogImage: "/og.png",
    },
  },
  {
    key: "services",
    path: "/sherbime",
    seo: {
      title: "Shërbimet | Print, Branding, Web & Social Media | CUBE",
      description:
        "Të gjitha shërbimet e CUBE DESIGNERS: printim, kartvizita, banera, dizajn logo, branding, web design, e-commerce, SEO dhe menaxhim rrjete sociale në Kosovë.",
      canonicalPath: "/sherbime",
      index: true,
      sitemap: true,
      ogImage: "/og.png",
    },
  },
  {
    key: "start-project",
    path: "/start-project",
    seo: {
      title: "Fillo një projekt | CUBE DESIGNERS",
      description:
        "Na tregoni për projektin, objektivat, buxhetin dhe afatin. Ne ju kthehemi me hapin e ardhshëm.",
      canonicalPath: "/start-project",
      index: true,
      sitemap: true,
      ogImage: "/og.png",
    },
  },
]

export const siteRoutes = allRoutes.filter(
  (route) => SHOP_ENABLED || route.key !== "shop",
)

export function normalizePathname(pathname: string) {
  const withoutQuery = pathname.split(/[?#]/, 1)[0] || "/"
  const normalized = withoutQuery.replace(/\/{2,}/g, "/").replace(/\/+$/, "")
  return normalized || "/"
}

export function matchRoute(pathname: string): RouteMatch | null {
  const normalized = normalizePathname(pathname)
  const exact = siteRoutes.find((route) => route.path === normalized)

  if (exact) {
    return { key: exact.key, pathname: normalized, params: {} }
  }

  const serviceMatch = normalized.match(/^\/sherbime\/([a-z0-9-]+)$/)
  if (serviceMatch) {
    return {
      key: "service",
      pathname: normalized,
      params: { slug: serviceMatch[1] },
    }
  }

  const productMatch = normalized.match(/^\/shop\/([a-z0-9-]+)$/)
  if (SHOP_ENABLED && productMatch) {
    return {
      key: "product",
      pathname: normalized,
      params: { slug: productMatch[1] },
    }
  }

  return null
}

// The admin dashboard is client-only: never prerendered, indexed or in the nav.
export function isAdminPath(pathname: string) {
  const normalized = normalizePathname(pathname)
  return normalized === "/admin" || normalized.startsWith("/admin/")
}

export function getRouteSeo(key: Exclude<RouteKey, ParamRouteKey>) {
  return siteRoutes.find((route) => route.key === key)?.seo
}
