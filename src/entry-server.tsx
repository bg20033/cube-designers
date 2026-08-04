import type { ReactNode } from "react"
import { renderToString } from "react-dom/server"

import { HomePage } from "@/App"
import { RoutePathProvider } from "@/app/RouteContext"
import { getRouteSeo, matchRoute, siteRoutes, type RouteSeo } from "@/app/routes"
import AboutPage from "@/components/AboutPage"
import NotFoundPage from "@/components/NotFoundPage"
import ProductDetailPage from "@/components/shop/ProductDetailPage"
import ProjectBriefPage from "@/components/ProjectBriefPage"
import RoadmapPage from "@/components/RoadmapPage"
import ShopPage, {
  getProductBySlug,
  products,
} from "@/components/ShopPage"
import WorkPage from "@/components/WorkPage"

type StructuredData = Record<string, unknown>

export type RenderedRoute = {
  html: string
  seo: RouteSeo
  structuredData: StructuredData[]
  status: 200 | 404
}

const notFoundSeo: RouteSeo = {
  title: "Faqja nuk u gjet | CUBE DESIGNERS",
  description: "Faqja që kërkuat nuk ekziston ose është zhvendosur.",
  canonicalPath: "/404",
  index: false,
  sitemap: false,
  ogImage: "/og.png",
}

const breadcrumbNames: Record<string, string> = {
  "/about": "Rreth nesh",
  "/work": "Projektet",
  "/roadmap": "Roadmap",
  "/shop": "Shop",
  "/start-project": "Fillo një projekt",
}

function renderRouteNode(pathname: string): {
  node: ReactNode
  seo: RouteSeo
  status: 200 | 404
} {
  const route = matchRoute(pathname)

  if (!route) {
    return { node: <NotFoundPage />, seo: notFoundSeo, status: 404 }
  }

  if (route.key === "product") {
    const product = getProductBySlug(route.params.slug)
    if (!product) {
      return { node: <NotFoundPage />, seo: notFoundSeo, status: 404 }
    }

    return {
      node: <ProductDetailPage slug={route.params.slug} />,
      seo: {
        title: `${product.name} | CUBE DESIGNERS Shop`,
        description: `${product.description} ${product.quantityLabel}, material ${product.material}. Kërko ofertë nga CUBE DESIGNERS.`,
        canonicalPath: `/shop/${product.id}`,
        index: true,
        sitemap: true,
        ogImage: "/og.png",
      },
      status: 200,
    }
  }

  const seo = getRouteSeo(route.key) ?? notFoundSeo
  const nodes: Record<typeof route.key, ReactNode> = {
    home: <HomePage />,
    about: <AboutPage />,
    work: <WorkPage />,
    roadmap: <RoadmapPage />,
    shop: <ShopPage />,
    "start-project": <ProjectBriefPage />,
  }

  return { node: nodes[route.key], seo, status: 200 }
}

function buildStructuredData(pathname: string, siteUrl: string): StructuredData[] {
  const normalizedSiteUrl = siteUrl.replace(/\/+$/, "")
  const route = matchRoute(pathname)
  const data: StructuredData[] = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "CUBE DESIGNERS",
      alternateName: "CUBE",
      url: normalizedSiteUrl,
      inLanguage: "sq-XK",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "CUBE DESIGNERS",
      url: normalizedSiteUrl,
      logo: `${normalizedSiteUrl}/favicon.svg`,
      email: "hello@kube.studio",
      areaServed: {
        "@type": "Country",
        name: "Kosovo",
      },
    },
  ]

  if (!route || route.key === "home") return data

  const breadcrumbLabel =
    route.key === "product"
      ? getProductBySlug(route.params.slug)?.name
      : breadcrumbNames[route.pathname]

  if (breadcrumbLabel) {
    const items = [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ballina",
        item: normalizedSiteUrl,
      },
    ]

    if (route.key === "product") {
      items.push({
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: `${normalizedSiteUrl}/shop`,
      })
    }

    items.push({
      "@type": "ListItem",
      position: items.length + 1,
      name: breadcrumbLabel,
      item: `${normalizedSiteUrl}${route.pathname}`,
    })

    data.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items,
    })
  }

  if (route.key === "product") {
    const product = getProductBySlug(route.params.slug)
    if (product) {
      data.push({
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description,
        sku: product.id,
        category: product.category,
        material: product.material,
        brand: {
          "@type": "Brand",
          name: "CUBE DESIGNERS",
        },
        url: `${normalizedSiteUrl}/shop/${product.id}`,
      })
    }
  }

  return data
}

export function render(pathname: string, siteUrl: string): RenderedRoute {
  const rendered = renderRouteNode(pathname)
  return {
    html: renderToString(
      <RoutePathProvider pathname={pathname}>
        {rendered.node}
      </RoutePathProvider>,
    ),
    seo: rendered.seo,
    structuredData: buildStructuredData(pathname, siteUrl),
    status: rendered.status,
  }
}

export function getPrerenderPaths() {
  return [
    ...siteRoutes.filter((route) => route.seo.sitemap).map((route) => route.path),
    ...products.map((product) => `/shop/${product.id}`),
  ]
}
