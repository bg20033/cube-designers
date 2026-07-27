import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

const root = process.cwd()
const clientDirectory = path.join(root, "dist", "client")
const serverEntry = path.join(root, ".prerender", "entry-server.mjs")
const templatePath = path.join(clientDirectory, "index.html")
const isProductionSeo = process.env.SEO_DEPLOYMENT === "production"
const configuredSiteUrl = process.env.PUBLIC_SITE_URL?.replace(/\/+$/, "")

if (isProductionSeo && !configuredSiteUrl) {
  throw new Error(
    "PUBLIC_SITE_URL is required when SEO_DEPLOYMENT=production.",
  )
}

const siteUrl =
  configuredSiteUrl ||
  "https://kube-creative-studio.bbxh447.chatgpt.site"

const template = await readFile(templatePath, "utf8")
const { getPrerenderPaths, render } = await import(
  `${pathToFileURL(serverEntry).href}?v=${Date.now()}`
)

const escapeAttribute = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

function createHead(seo, structuredData, status) {
  const absoluteUrl = `${siteUrl}${seo.canonicalPath === "/" ? "" : seo.canonicalPath}`
  const absoluteImage = `${siteUrl}${seo.ogImage}`
  const robots = !isProductionSeo || !seo.index || status === 404
    ? "noindex,follow"
    : "index,follow,max-image-preview:large"
  const canonical = isProductionSeo
    ? `<link rel="canonical" href="${escapeAttribute(absoluteUrl)}" />`
    : ""
  const jsonLd = structuredData
    .map(
      (item) =>
        `<script type="application/ld+json">${JSON.stringify(item).replaceAll(
          "<",
          "\\u003c",
        )}</script>`,
    )
    .join("\n")

  return `
    <title>${escapeAttribute(seo.title)}</title>
    <meta name="description" content="${escapeAttribute(seo.description)}" />
    <meta name="robots" content="${robots}" />
    ${canonical}
    <meta property="og:locale" content="sq_XK" />
    <meta property="og:type" content="${status === 404 ? "website" : "website"}" />
    <meta property="og:site_name" content="CUBE DESIGNERS" />
    <meta property="og:title" content="${escapeAttribute(seo.title)}" />
    <meta property="og:description" content="${escapeAttribute(seo.description)}" />
    <meta property="og:url" content="${escapeAttribute(absoluteUrl)}" />
    <meta property="og:image" content="${escapeAttribute(absoluteImage)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttribute(seo.title)}" />
    <meta name="twitter:description" content="${escapeAttribute(seo.description)}" />
    <meta name="twitter:image" content="${escapeAttribute(absoluteImage)}" />
    ${jsonLd}
  `.trim()
}

function createDocument(pathname) {
  const rendered = render(pathname, siteUrl)
  return template
    .replace("<!--app-head-->", createHead(rendered.seo, rendered.structuredData, rendered.status))
    .replace("<!--app-html-->", rendered.html)
}

const routes = getPrerenderPaths()

for (const route of routes) {
  const outputDirectory =
    route === "/"
      ? clientDirectory
      : path.join(clientDirectory, route.slice(1))
  await mkdir(outputDirectory, { recursive: true })
  await writeFile(
    path.join(outputDirectory, "index.html"),
    createDocument(route),
    "utf8",
  )
}

await writeFile(
  path.join(clientDirectory, "404.html"),
  createDocument("/404"),
  "utf8",
)

const sitemapUrls = isProductionSeo
  ? routes
      .map((route) => {
        const url = `${siteUrl}${route === "/" ? "" : route}`
        return `  <url><loc>${url}</loc></url>`
      })
      .join("\n")
  : ""

await writeFile(
  path.join(clientDirectory, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`,
  "utf8",
)

await writeFile(
  path.join(clientDirectory, "robots.txt"),
  isProductionSeo
    ? `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n",
  "utf8",
)

await rm(path.join(root, ".prerender"), { recursive: true, force: true })
