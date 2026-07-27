export type RouteKey =
  | "home"
  | "about"
  | "work"
  | "roadmap"
  | "shop"
  | "product"
  | "start-project"

export type RouteSeo = {
  title: string
  description: string
  canonicalPath: string
  index: boolean
  sitemap: boolean
  ogImage: string
}

export type SiteRoute = {
  key: Exclude<RouteKey, "product">
  path: string
  seo: RouteSeo
}

export type RouteMatch =
  | { key: Exclude<RouteKey, "product">; pathname: string; params: Record<string, never> }
  | { key: "product"; pathname: string; params: { slug: string } }

export const siteRoutes: SiteRoute[] = [
  {
    key: "home",
    path: "/",
    seo: {
      title: "CUBE DESIGNERS | Agjenci kreative në Kosovë",
      description:
        "Studio kreative në Kosovë për brand identity, print, web, e-commerce dhe eksperienca digjitale.",
      canonicalPath: "/",
      index: true,
      sitemap: true,
      ogImage: "/og.jpg",
    },
  },
  {
    key: "about",
    path: "/about",
    seo: {
      title: "Rreth CUBE DESIGNERS | Studio kreative në Kosovë",
      description:
        "Njihuni me ekipin, parimet dhe mënyrën si CUBE DESIGNERS i kthen idetë në sisteme të qarta.",
      canonicalPath: "/about",
      index: true,
      sitemap: true,
      ogImage: "/og.jpg",
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
      ogImage: "/og.jpg",
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
      ogImage: "/og.jpg",
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
      ogImage: "/og.jpg",
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
      ogImage: "/og.jpg",
    },
  },
]

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

  const productMatch = normalized.match(/^\/shop\/([a-z0-9-]+)$/)
  if (productMatch) {
    return {
      key: "product",
      pathname: normalized,
      params: { slug: productMatch[1] },
    }
  }

  return null
}

export function getRouteSeo(key: Exclude<RouteKey, "product">) {
  return siteRoutes.find((route) => route.key === key)?.seo
}
