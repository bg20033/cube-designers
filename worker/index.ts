import { matchRoute, normalizePathname } from "../src/app/routes"

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
}

const productSlugs = new Set([
  "business-cards",
  "rollup-banner",
  "branded-pens",
  "notebooks",
  "tshirts",
  "stickers",
  "flyers",
  "tote-bags",
  "brochures",
  "menus",
  "posters",
  "vinyl-banner",
  "window-graphics",
  "mugs",
  "lanyards",
  "hoodies",
  "caps",
  "product-labels",
  "shipping-boxes",
  "paper-bags",
])

const publicFiles = new Set([
  "/favicon.svg",
  "/icons.svg",
  "/og.png",
  "/og.jpg",
  "/og-v2.png",
  "/robots.txt",
  "/sitemap.xml",
])

function assetRequest(request: Request, pathname: string) {
  const url = new URL(request.url)
  url.pathname = pathname
  url.search = ""
  return new Request(url, request)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      })
    }

    const url = new URL(request.url)
    const pathname = normalizePathname(url.pathname)

    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = pathname
      return Response.redirect(url, 308)
    }

    if (
      pathname.startsWith("/assets/") ||
      pathname.startsWith("/src/") ||
      pathname.startsWith("/@") ||
      publicFiles.has(pathname)
    ) {
      return env.ASSETS.fetch(request)
    }

    const route = matchRoute(pathname)
    const isKnownProduct =
      route?.key === "product" && productSlugs.has(route.params.slug)

    if (route && (route.key !== "product" || isKnownProduct)) {
      const documentPath =
        pathname === "/" ? "/index.html" : `${pathname}/index.html`
      return env.ASSETS.fetch(assetRequest(request, documentPath))
    }

    const notFound = await env.ASSETS.fetch(
      assetRequest(request, "/404.html"),
    )

    return new Response(notFound.body, {
      status: 404,
      headers: notFound.headers,
    })
  },
}
