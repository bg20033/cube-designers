import { products } from "../src/data/products"
import { isAdminPath, matchRoute, normalizePathname } from "../src/app/routes"
import { routeApi } from "../api/_router"

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
}

const productSlugs = new Set(products.map((product) => product.id))

const publicFiles = new Set([
  "/favicon.svg",
  "/og.png",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
])

function assetRequest(request: Request, pathname: string) {
  const url = new URL(request.url)
  url.pathname = pathname
  url.search = ""
  return new Request(url, request)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith("/api/")) return routeApi(request)

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      })
    }

    const pathname = normalizePathname(url.pathname)

    if (isAdminPath(pathname)) {
      const response = await env.ASSETS.fetch(assetRequest(request, "/index.html"))
      const headers = new Headers(response.headers)
      headers.set("x-robots-tag", "noindex, nofollow")
      headers.set("cache-control", "no-store")
      return new Response(response.body, { status: response.status, headers })
    }

    if (pathname === "/sherbime") return Response.redirect(new URL("/about#sherbimet", url), 301)

    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = pathname
      return Response.redirect(url, 308)
    }

    if (
      pathname.startsWith("/assets/") ||
      pathname.startsWith("/media/") ||
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

    const notFound = await env.ASSETS.fetch(assetRequest(request, "/404.html"))

    return new Response(notFound.body, {
      status: 404,
      headers: notFound.headers,
    })
  },
}
