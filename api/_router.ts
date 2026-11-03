import * as products from "./products.js"
import * as orders from "./orders.js"
import * as submissions from "./submissions.js"
import * as shopStatus from "./shop-status.js"
import * as uploads from "./uploads.js"
import * as invitations from "./invitations.js"
import * as invitationSession from "./invitation-session.js"
import * as invitationPublic from "./invitation-public.js"
import * as adminSession from "./admin/session.js"
import * as adminOrders from "./admin/orders.js"
import * as adminProducts from "./admin/products.js"
import * as adminSubmissions from "./admin/submissions.js"
import * as adminPhoto from "./admin/photo.js"
import * as adminInvitations from "./admin/invitations.js"
import { json } from "./_lib/http.js"

type Handler = (request: Request) => Promise<Response>
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]
const routes: Record<string, Record<string, Handler>> = {
  "/api/products": products, "/api/orders": orders, "/api/submissions": submissions,
  "/api/shop-status": shopStatus, "/api/uploads": uploads,
  "/api/invitations": invitations, "/api/invitation-session": invitationSession,
  "/api/invitation-public": invitationPublic,
  "/api/admin/session": adminSession, "/api/admin/orders": adminOrders,
  "/api/admin/products": adminProducts, "/api/admin/submissions": adminSubmissions,
  "/api/admin/photo": adminPhoto, "/api/admin/invitations": adminInvitations,
}

// One allowlist for Worker deployments. Internal modules never become routes.
export async function routeApi(request: Request) {
  const handlers = routes[new URL(request.url).pathname.replace(/\/+$/, "")]
  if (!handlers) return json({ error: "Shërbimi nuk u gjet." }, 404)
  const method = request.method === "HEAD" ? "GET" : request.method
  // Only HTTP verbs can be dispatched, never other exports of a module.
  const allowed = METHODS.filter((name) => typeof handlers[name] === "function")
  const handler = allowed.includes(method) ? handlers[method] : undefined
  if (!handler) return json({ error: "Metoda nuk lejohet." }, 405, { Allow: (allowed.includes("GET") ? [...allowed, "HEAD"] : allowed).join(", ") })
  const response = await handler(request)
  response.headers.set("x-robots-tag", "noindex")
  return request.method === "HEAD" ? new Response(null, response) : response
}
