import type { APIRoute } from 'astro'
import * as products from '../../../../../api/_handlers/products'
import * as orders from '../../../../../api/_handlers/orders'
import * as uploads from '../../../../../api/_handlers/uploads'
import * as shopStatus from '../../../../../api/_handlers/shop-status'
import { json } from '../../../../../api/_lib/http'

export const prerender = false
// The studio retains its own admin, submissions and invitation API.
const routes: Record<string, Record<string, (request: Request) => Promise<Response>>> = {
  products, orders, uploads, 'shop-status': shopStatus,
}
export const ALL: APIRoute = async ({ request, params }) => {
  const handlers = routes[params.path ?? '']
  if (!handlers) return json({ error: 'Shërbimi nuk u gjet.' }, 404)
  const method = request.method === 'HEAD' ? 'GET' : request.method
  const allowed = Object.keys(handlers).filter((name) => ['GET', 'POST'].includes(name))
  const handler = allowed.includes(method) ? handlers[method] : undefined
  if (!handler) return json({ error: 'Metoda nuk lejohet.' }, 405, { Allow: [...allowed, ...(allowed.includes('GET') ? ['HEAD'] : [])].join(', ') })
  const response = await handler(request)
  response.headers.set('x-robots-tag', 'noindex')
  return request.method === 'HEAD' ? new Response(null, response) : response
}
