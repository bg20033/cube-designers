import { renderToString } from "react-dom/server"

import App, { preloadPage } from "@/App"
import { socialProfiles } from "@/data/site"
import {
  getRouteSeo,
  matchRoute,
  siteRoutes,
  type RouteKey,
  type RouteSeo,
} from "@/app/routes"
import { getServiceBySlug, serviceCategories, services } from "@/data/services"

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
  "/start-project": "Fillo një projekt",
  "/sherbime": "Shërbimet",
}

function routeMeta(pathname: string): {
  seo: RouteSeo
  status: 200 | 404
} {
  const route = matchRoute(pathname)

  if (!route) {
    return { seo: notFoundSeo, status: 404 }
  }

  if (route.key === "service") {
    const service = getServiceBySlug(route.params.slug)
    if (!service) {
      return { seo: notFoundSeo, status: 404 }
    }

    return {
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

  return { seo: getRouteSeo(route.key) ?? notFoundSeo, status: 200 }
}

function buildStructuredData(
  pathname: string,
  siteUrl: string,
): StructuredData[] {
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
      hasMap:
        "https://www.google.com/maps/search/?api=1&query=Cube+Design&query_place_id=0x13539bd1887a1095:0x6f42ef9b2893ba2c",
      areaServed: [
        { "@type": "City", name: "Suharekë" },
        { "@type": "City", name: "Prishtinë" },
        { "@type": "Country", name: "Kosovo" },
      ],
      knowsAbout: services.map((service) => service.name),
      sameAs: socialProfiles.map((profile) => profile.href),
    },
  ]

  if (route?.key === "home") {
    return data
  }

  if (!route) return data

  const breadcrumbLabel =
    route.key === "service"
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

// Source module of each page, as keyed in the client build manifest. The
// prerenderer links its CSS and preloads its JS so the HTML is styled on
// first paint instead of after the page chunk loads.
const pageSources: Partial<Record<RouteKey | "not-found", string>> = {
  home: "src/components/HomePage.tsx",
  about: "src/components/AboutPage.tsx",
  work: "src/components/WorkPage.tsx",
  invitations: "src/components/invitations/OnlineInvitationsPage.tsx",
  "start-project": "src/components/ProjectBriefPage.tsx",
  services: "src/components/services/ServicesPage.tsx",
  service: "src/components/services/ServicePage.tsx",
  "not-found": "src/components/NotFoundPage.tsx",
}

export function getPageSource(pathname: string) {
  return pageSources[matchRoute(pathname)?.key ?? "not-found"] ?? pageSources["not-found"]
}

// Renders the same tree the browser hydrates (App), with the page module
// loaded first so nothing suspends during renderToString.
export async function render(
  pathname: string,
  siteUrl: string,
): Promise<RenderedRoute> {
  const rendered = routeMeta(pathname)
  await preloadPage(pathname)
  return {
    html: renderToString(<App pathname={pathname} />),
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
    ...socialProfiles.map((profile) => `- ${profile.label}: ${profile.href}`),
    "",
    "## Faqet kryesore",
    "",
    `- [Ballina](${base}/): Prezantimi i studios dhe shërbimeve`,
    `- [Shop](https://shop.cube-designers.com/): Koleksioni i parë dhe katalogu i printit; çmime orientuese`,
    `- [Shërbimet](${base}/sherbime): Katalogu i plotë i shërbimeve`,
    `- [Projektet](${base}/work): Punë të zgjedhura`,
    `- [Rreth nesh](${base}/about): Kush jemi dhe ku ndodhemi`,
    `- [Fillo një projekt](${base}/start-project): Formulari për ofertë`,
  ]

  for (const [key, category] of Object.entries(serviceCategories)) {
    lines.push("", `## ${category.label}`, "")
    for (const service of services.filter((item) => item.category === key)) {
      lines.push(
        `- [${service.name}](${base}/sherbime/${service.slug}): ${service.description}`,
      )
    }
  }

  return `${lines.join("\n")}\n`
}

// Only studio pages belong in the studio sitemap.
export function getPrerenderPaths() {
  return [
    ...new Set([
      ...siteRoutes
        .filter((route) => route.seo.sitemap)
        .map((route) => route.path),
      ...services.map((service) => `/sherbime/${service.slug}`),
    ]),
  ]
}
