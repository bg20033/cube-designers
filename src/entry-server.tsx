import type { ReactNode } from "react"
import { renderToString } from "react-dom/server"

import { HomePage } from "@/App"
import { faqs as homeFaqs } from "@/components/GrowthSections"
import { RoutePathProvider } from "@/app/RouteContext"
import {
  getRouteSeo,
  matchRoute,
  SHOP_ENABLED,
  siteRoutes,
  type RouteSeo,
} from "@/app/routes"
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
import ServicePage from "@/components/services/ServicePage"
import ServicesPage from "@/components/services/ServicesPage"
import {
  getServiceBySlug,
  serviceCategories,
  services,
} from "@/data/services"

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
  "/sherbime": "Shërbimet",
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

  if (route.key === "service") {
    const service = getServiceBySlug(route.params.slug)
    if (!service) {
      return { node: <NotFoundPage />, seo: notFoundSeo, status: 404 }
    }

    return {
      node: <ServicePage slug={route.params.slug} />,
      seo: {
        title: service.seoTitle,
        description: service.description,
        canonicalPath: `/sherbime/${service.slug}`,
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
    services: <ServicesPage />,
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
    // Local business entity on every page; service pages reference it by @id.
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "@id": `${normalizedSiteUrl}/#business`,
      name: "CUBE DESIGNERS",
      alternateName: "Cube Design",
      description:
        "Agjenci kreative në Suharekë për printim, branding, dizajn logo, web design, e-commerce, SEO dhe menaxhim të rrjeteve sociale.",
      url: normalizedSiteUrl,
      logo: `${normalizedSiteUrl}/favicon.svg`,
      image: `${normalizedSiteUrl}/og.png`,
      email: "info@cube-designers.com",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Rruga Xhavit Sylaj 59",
        addressLocality: "Suharekë",
        postalCode: "23000",
        addressCountry: "XK",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 42.362702,
        longitude: 20.835396,
      },
      hasMap: "https://www.google.com/maps/search/?api=1&query=Cube+Design&query_place_id=0x13539bd1887a1095:0x6f42ef9b2893ba2c",
      areaServed: [
        { "@type": "City", name: "Suharekë" },
        { "@type": "City", name: "Prishtinë" },
        { "@type": "Country", name: "Kosovo" },
      ],
      knowsAbout: services.map((service) => service.name),
    },
  ]

  if (route?.key === "home") {
    data.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: homeFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    })
    return data
  }

  if (!route) return data

  const breadcrumbLabel =
    route.key === "product"
      ? getProductBySlug(route.params.slug)?.name
      : route.key === "service"
        ? getServiceBySlug(route.params.slug)?.name
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

    if (route.key === "service") {
      items.push({
        "@type": "ListItem",
        position: 2,
        name: "Shërbimet",
        item: `${normalizedSiteUrl}/sherbime`,
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

  if (route.key === "service") {
    const service = getServiceBySlug(route.params.slug)
    if (service) {
      data.push(
        {
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.name,
          serviceType: service.name,
          alternateName: service.alsoKnownAs,
          description: service.description,
          category: serviceCategories[service.category].label,
          url: `${normalizedSiteUrl}/sherbime/${service.slug}`,
          provider: { "@id": `${normalizedSiteUrl}/#business` },
          areaServed: [
            { "@type": "City", name: "Suharekë" },
            { "@type": "City", name: "Prishtinë" },
            { "@type": "Country", name: "Kosovo" },
          ],
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: service.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a },
          })),
        },
      )
    }
  }

  if (route.key === "services") {
    data.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Shërbimet e CUBE DESIGNERS",
      itemListElement: services.map((service, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: service.name,
        url: `${normalizedSiteUrl}/sherbime/${service.slug}`,
      })),
    })
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

// /llms.txt: a plain-language map of the site for AI assistants and answer
// engines (llmstxt.org). Generated from the same data as the pages.
export function getLlmsTxt(siteUrl: string) {
  const base = siteUrl.replace(/\/+$/, "")
  const lines = [
    "# CUBE DESIGNERS",
    "",
    "> Agjenci kreative në Suharekë, Kosovë (Rruga Xhavit Sylaj 59, 23000 Suharekë). Branding dhe dizajn logo, printim (kartvizita, fletushka, roll-up, banera, stickers, tekstil, sinjalistikë, paketim), web design, dyqane online, SEO dhe menaxhim i rrjeteve sociale për biznese në Suharekë, Prishtinë dhe gjithë Kosovën. Kontakt: info@cube-designers.com",
    "",
    "## Faqet kryesore",
    "",
    `- [Ballina](${base}/): Prezantimi i studios dhe shërbimeve`,
    `- [Shërbimet](${base}/sherbime): Katalogu i plotë i shërbimeve`,
    `- [Projektet](${base}/work): Punë të zgjedhura`,
    `- [Rreth nesh](${base}/about): Kush jemi dhe ku ndodhemi`,
    `- [Fillo një projekt](${base}/start-project): Formulari për ofertë`,
  ]

  for (const [key, category] of Object.entries(serviceCategories)) {
    lines.push("", `## ${category.label}`, "")
    for (const service of services.filter((item) => item.category === key)) {
      lines.push(`- [${service.name}](${base}/sherbime/${service.slug}): ${service.description}`)
    }
  }

  return `${lines.join("\n")}\n`
}

export function getPrerenderPaths() {
  return [
    ...siteRoutes.filter((route) => route.seo.sitemap).map((route) => route.path),
    ...services.map((service) => `/sherbime/${service.slug}`),
    ...(SHOP_ENABLED ? products.map((product) => `/shop/${product.id}`) : []),
  ]
}
