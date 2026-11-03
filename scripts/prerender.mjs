import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

// Load the production React server renderer (smaller output, no dev markers).
process.env.NODE_ENV ??= "production"

const root = process.cwd()
const clientDirectory = path.join(root, "dist", "client")
const serverEntry = path.join(root, ".prerender", "entry-server.mjs")
const templatePath = path.join(clientDirectory, "index.html")
// Vercel production deploys are indexable by default; previews stay noindex.
const isProductionSeo =
  process.env.SEO_DEPLOYMENT === "production" ||
  process.env.VERCEL_ENV === "production"
const configuredSiteUrl = process.env.PUBLIC_SITE_URL?.replace(/\/+$/, "")

const siteUrl =
  configuredSiteUrl ||
  "https://www.cube-designers.com"

const template = await readFile(templatePath, "utf8")
const { getLlmsTxt, getPageSource, getPrerenderPaths, render } = await import(
  `${pathToFileURL(serverEntry).href}?v=${Date.now()}`
)
const manifestPath = path.join(clientDirectory, ".vite", "manifest.json")
const manifest = JSON.parse(await readFile(manifestPath, "utf8"))

// Every JS and CSS file a chunk pulls in through static imports.
function collectFiles(key, files = new Set(), seen = new Set()) {
  const chunk = manifest[key]
  if (!chunk || seen.has(key)) return files
  seen.add(key)
  files.add(chunk.file)
  for (const css of chunk.css ?? []) files.add(css)
  for (const child of chunk.imports ?? []) collectFiles(child, files, seen)
  return files
}
const entryFiles = collectFiles("index.html")

// Links for the page's own chunk: CSS so the HTML is styled on first paint,
// modulepreload so its JS downloads alongside the entry instead of after it.
function pageAssets(source) {
  return [...collectFiles(source)]
    .filter((file) => !entryFiles.has(file))
    .map((file) =>
      file.endsWith(".css")
        ? `<link rel="stylesheet" crossorigin href="/${file}">`
        : `<link rel="modulepreload" crossorigin href="/${file}">`,
    )
    .join("\n    ")
}

const escapeAttribute = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

function createHead(seo, structuredData, status) {
  const absoluteUrl = `${siteUrl}${seo.canonicalPath}`
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

async function createDocument(pathname) {
  const rendered = await render(pathname, siteUrl)
  return template
    .replace("<!--app-head-->", createHead(rendered.seo, rendered.structuredData, rendered.status))
    .replace("<!--app-html-->", rendered.html)
    .replace("</head>", `  ${pageAssets(getPageSource(pathname))}\n  </head>`)
}

const routes = getPrerenderPaths()

// The invitations demo needs a direct-entry document but stays out of the sitemap.
for (const route of [...routes, "/ftesa"]) {
  const outputDirectory =
    route === "/"
      ? clientDirectory
      : path.join(clientDirectory, route.slice(1))
  await mkdir(outputDirectory, { recursive: true })
  await writeFile(
    path.join(outputDirectory, "index.html"),
    await createDocument(route),
    "utf8",
  )
}

await writeFile(
  path.join(clientDirectory, "404.html"),
  await createDocument("/404"),
  "utf8",
)

const lastModified = new Date().toISOString().slice(0, 10)
const sitemapUrls = isProductionSeo
  ? routes
      .map((route) => {
        const url = `${siteUrl}${route}`
        return `  <url><loc>${url}</loc><lastmod>${lastModified}</lastmod></url>`
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
    ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n",
  "utf8",
)

await writeFile(path.join(clientDirectory, "llms.txt"), getLlmsTxt(siteUrl), "utf8")

await rm(path.join(root, ".prerender"), { recursive: true, force: true })
await rm(path.join(clientDirectory, ".vite"), { recursive: true, force: true })
