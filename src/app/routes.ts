export type RouteKey =
  | "home"
  | "about"
  | "work"
  | "shop"
  | "smart-glass"
  | "wall"
  | "photo"
  | "product"
  | "start-project"
  | "services"
  | "service"
  | "invitations"

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
  | {
      key: Exclude<RouteKey, ParamRouteKey>
      pathname: string
      params: Record<string, never>
    }
  | { key: ParamRouteKey; pathname: string; params: { slug: string } }

// The launch collection and the existing studio catalog are available together.
export const SHOP_ENABLED = true

const allRoutes: SiteRoute[] = [
  {
    key: "invitations",
    path: "/ftesa",
    seo: {
      title: "Ftesa online për dasmën tuaj | CUBE DESIGNERS",
      description: "Ftesa të personalizuara për dasmën tuaj. Zgjidhni dizajnin, ndani linke personale dhe menaxhoni mysafirët e konfirmimet online.",
      canonicalPath: "/ftesa",
      index: false,
      sitemap: false,
      ogImage: "/og.png",
    },
  },
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
    key: "shop",
    path: "/shop",
    seo: {
      title: "Shop — Postera, print & personalizim | CUBE",
      description:
        "Postera, print për biznese, veshje të personalizuara, smart glass dhe ftesa online nga CUBE DESIGNERS.",
      canonicalPath: "/shop",
      index: true,
      sitemap: true,
      ogImage: "/og.png",
    },
  },
  {
    key: "smart-glass",
    path: "/shop/smart-glass",
    seo: {
      title: "Smart Glass — Privatësi me një klik | CUBE",
      description: "Smart Glass: xham inteligjent që kalon nga i mjegullt në transparent me telekomandë. Matje dhe montim në vend nga CUBE DESIGNERS.",
      canonicalPath: "/shop/smart-glass",
      index: true,
      sitemap: true,
      ogImage: "/media/collections/blanks/smart-film-off.webp",
    },
  },
  {
    key: "wall",
    path: "/shop/muri",
    seo: {
      title: "Konfiguro murin — Postera në përmasa reale | CUBE",
      description:
        "Zgjidh posterat, madhësinë dhe kornizën, rregulloji në murin tënd me përmasa reale dhe shtoji krejt në shportë me një klik.",
      canonicalPath: "/shop/muri",
      index: true,
      sitemap: true,
      ogImage: "/og.png",
    },
  },
  {
    key: "photo",
    path: "/shop/foto",
    seo: {
      title: "Printo foton tënde — Letër, pleksiglas, kanavacë | CUBE",
      description:
        "Ngarko foton, zgjidh pjesën që do dhe printoje nga A6 deri 50 × 70 cm në letër, pleksiglas, kanavacë ose me kornizë.",
      canonicalPath: "/shop/foto",
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
      canonicalPath: "/about",
      index: false,
      sitemap: false,
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
  (route) => SHOP_ENABLED || !["shop", "wall", "photo", "smart-glass"].includes(route.key),
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
