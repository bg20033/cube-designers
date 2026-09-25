import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { existsSync } from 'fs'
import path from 'path'

// Serves the Vercel functions in /api during `npm run dev`, using the same
// web-standard `GET`/`POST`/... exports that Vercel calls in production.
function vercelApiDev(): Plugin {
  return {
    name: 'vercel-api-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith('/api/')) return next()

        const file = path.resolve(__dirname, `.${url.pathname}.ts`)
        if (url.pathname.includes('/_') || !existsSync(file)) {
          res.statusCode = 404
          res.end('Not found')
          return
        }

        try {
          const module = await server.ssrLoadModule(file)
          const method = req.method ?? 'GET'
          const handler = module[method] as ((request: Request) => Promise<Response>) | undefined
          if (!handler) {
            res.statusCode = 405
            res.end('Method not allowed')
            return
          }

          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value)
          }

          const response = await handler(
            new Request(`http://${req.headers.host}${req.url}`, {
              method,
              headers,
              body: method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks),
            }),
          )

          res.statusCode = response.status
          response.headers.forEach((value, key) => {
            if (key !== 'set-cookie') res.setHeader(key, value)
          })
          const cookies = response.headers.getSetCookie()
          if (cookies.length) res.setHeader('set-cookie', cookies)
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          server.ssrFixStacktrace(error as Error)
          next(error)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Expose .env / .env.local (DATABASE_URL, ADMIN_PASSWORD) to the dev API.
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ''))) {
    process.env[key] ??= value
  }

  return {
    plugins: [vercelApiDev(), react(), tailwindcss(), cloudflare()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
