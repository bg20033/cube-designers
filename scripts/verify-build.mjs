import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const client = path.join(root, "dist", "client")
const routes = [
  "/",
  "/about",
  "/work",
  "/roadmap",
  "/shop",
  "/start-project",
  "/shop/business-cards",
]

for (const route of routes) {
  const file =
    route === "/"
      ? path.join(client, "index.html")
      : path.join(client, route.slice(1), "index.html")
  const html = await readFile(file, "utf8")

  for (const required of [
    "<title>",
    'name="description"',
    'name="robots"',
    'property="og:title"',
    'type="application/ld+json"',
    "<h1",
  ]) {
    if (!html.includes(required)) {
      throw new Error(`${route} is missing ${required}`)
    }
  }
}

const notFound = await readFile(path.join(client, "404.html"), "utf8")
if (!notFound.includes("noindex,follow") || !notFound.includes("ERROR / 404")) {
  throw new Error("404.html is missing its noindex page content")
}

for (const file of ["robots.txt", "sitemap.xml"]) {
  await readFile(path.join(client, file), "utf8")
}
