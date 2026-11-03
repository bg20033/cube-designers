// Isolated browser-test server. No production secrets or external database.
import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { createServer as createViteServer } from "vite"
import path from "node:path"

process.env.DATABASE_URL = "postgres://ephemeral-browser-test"
process.env.ADMIN_PASSWORD = "browser-test-admin-password"
process.env.ADMIN_SESSION_SECRET = "browser-test-session-secret-only-for-tests"
delete process.env.INVITATION_PRICE_EUR

const vite = await createViteServer({
  configFile: false,
  resolve: { alias: { "@": path.resolve("src"), "@neondatabase/serverless": path.resolve("tests/support/neon-pglite.ts") } },
  server: { middlewareMode: true, hmr: { port: 24818 } },
  optimizeDeps: { noDiscovery: true, entries: [] },
  appType: "custom", logLevel: "error",
})
const root = path.resolve("dist/client")
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png", ".webp": "image/webp" }
const server = createServer(async (req, res) => {
  try {
    if (!req.url?.startsWith("/api/")) {
      const url = new URL(req.url ?? "/", "http://localhost")
      const pathname = /^\/admin(?:\/|$)/.test(url.pathname) ? "/index.html" : url.pathname.replace(/\/$/, "") === "/ftesa" ? "/ftesa/index.html" : url.pathname
      const file = path.resolve(root, `.${pathname}`)
      if (!file.startsWith(`${root}/`)) { res.writeHead(404); res.end(); return }
      const contents = await readFile(file)
      res.writeHead(200, { "content-type": mime[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-store" })
      res.end(contents)
      return
    }
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > 2_000_000) { res.writeHead(413); res.end(); return }
      chunks.push(chunk)
    }
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) if (typeof value === "string") headers.set(key, value)
    const { routeApi } = await vite.ssrLoadModule("/api/_router.ts")
    const response = await routeApi(new Request(`http://localhost:4178${req.url}`, {
      method: req.method, headers,
      body: ["GET", "HEAD"].includes(req.method ?? "GET") ? undefined : Buffer.concat(chunks),
    }))
    res.statusCode = response.status
    response.headers.forEach((value, key) => { if (key !== "set-cookie") res.setHeader(key, value) })
    const cookies = response.headers.getSetCookie()
    if (cookies.length) res.setHeader("set-cookie", cookies)
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) { console.error(error); res.writeHead(500); res.end("Test server error") }
})
server.listen(4178, "127.0.0.1", () => console.log("Isolated invitation test server: http://127.0.0.1:4178"))
async function close() { server.close(); await vite.close(); process.exit() }
process.on("SIGTERM", close)
process.on("SIGINT", close)
