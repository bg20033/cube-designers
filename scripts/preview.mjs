import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import { createServer as createViteServer, loadEnv } from "vite"

// Preview the built site with the SAME Node API handlers used on Vercel.
// No simulated orders, local secret defaults, or placeholder database writes.
for (const [key, value] of Object.entries(
  loadEnv("production", process.cwd(), ""),
))
  process.env[key] ??= value
const root = path.resolve("dist/client")
const loader = await createViteServer({
  configFile: false,
  resolve: { alias: { "@": path.resolve("src") } },
  optimizeDeps: { noDiscovery: true, entries: [] },
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
})
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost")
    if (url.pathname.startsWith("/api/")) {
      // Same entry point as production: api/[...path].ts → api/_router.ts.
      const { routeApi } = await loader.ssrLoadModule(path.resolve("api/_router.ts"))
      const handler = routeApi
      const chunks = []
      let size = 0
      for await (const chunk of req) {
        size += chunk.length
        if (size > (url.pathname === "/api/invitations" ? 2_000_000 : 20000)) {
          res.writeHead(413)
          return res.end("Request too large")
        }
        chunks.push(chunk)
      }
      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers))
        if (typeof value === "string") headers.set(key, value)
      const response = await handler(
        new Request(`http://${req.headers.host}${req.url}`, {
          method: req.method,
          headers,
          body: ["GET", "HEAD"].includes(req.method ?? "GET")
            ? undefined
            : Buffer.concat(chunks),
        }),
      )
      res.statusCode = response.status
      response.headers.forEach((value, key) => {
        if (key !== "set-cookie") res.setHeader(key, value)
      })
      const cookies = response.headers.getSetCookie()
      if (cookies.length) res.setHeader("set-cookie", cookies)
      return res.end(Buffer.from(await response.arrayBuffer()))
    }
    if (!["GET", "HEAD"].includes(req.method ?? "GET")) {
      res.writeHead(405)
      return res.end("Method not allowed")
    }
    let pathname
    try {
      pathname = decodeURIComponent(url.pathname)
    } catch {
      res.writeHead(400)
      return res.end("Invalid path")
    }
    let file = path.resolve(root, `.${pathname}`)
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
      res.writeHead(404)
      return res.end("Not found")
    }
    const admin = /^\/admin(?:\/|$)/.test(pathname)
    if (admin) file = path.join(root, "index.html")
    let status = 200
    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, "index.html")
      await stat(file)
    } catch {
      file = path.join(root, "404.html")
      status = 404
    }
    // Read before answering: a rebuild can remove the file in between.
    const body = req.method === "HEAD" ? undefined : await readFile(file)
    res.writeHead(status, {
      "content-type": mime[path.extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
      ...(admin ? { "x-robots-tag": "noindex, nofollow" } : {}),
    })
    return res.end(body)
  } catch {
    if (res.headersSent) return res.destroy()
    res.writeHead(500, { "content-type": "application/json" })
    res.end(JSON.stringify({ error: "Shërbimi nuk është i disponueshëm." }))
  }
})
const port = Number(process.env.PORT ?? 4173)
server.listen(port, "127.0.0.1", () =>
  console.log(`CUBE preview + API: http://localhost:${port}`),
)
async function close() {
  server.close()
  await loader.close()
  process.exit()
}
process.on("SIGINT", close)
process.on("SIGTERM", close)
