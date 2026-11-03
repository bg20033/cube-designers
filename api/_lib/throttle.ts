import { clientIp, HttpError } from "./http.js"
import { rateLimit, tokenHash } from "./invitations.js"

export type ThrottleRule = { scope: string; subject: string; limit: number; windowSeconds: number }
export const TOO_MANY_REQUESTS = "Shumë kërkesa. Provo përsëri pak më vonë."

// Each subject (an IP, a link token, a guest token) is hashed before it
// reaches the database, so the counters never hold a usable secret. Rules with
// an empty subject are skipped: an unknown IP must not put every caller into
// one shared bucket.
export async function throttle(rules: ThrottleRule[]) {
  for (const rule of rules) {
    if (!rule.subject) continue
    if (!(await rateLimit(`${rule.scope}:${tokenHash(rule.subject)}`, rule.limit, rule.windowSeconds)))
      throw new HttpError(429, TOO_MANY_REQUESTS, { "retry-after": String(rule.windowSeconds) })
  }
}

export const limits = {
  // A family registers once; a device registering many families is a script.
  generalPerIp: (request: Request, token: string): ThrottleRule => ({ scope: "general-ip", subject: ipSubject(request, token), limit: 10, windowSeconds: 600 }),
  // Bounds how fast a leaked general link can fill the guest list (cap 2000).
  generalPerLink: (token: string): ThrottleRule => ({ scope: "general", subject: token, limit: 200, windowSeconds: 3600 }),
  rsvpPerGuest: (token: string): ThrottleRule => ({ scope: "rsvp", subject: token, limit: 30, windowSeconds: 600 }),
  // Every login runs scrypt (32 MiB, ~100 ms), even for unknown references.
  loginPerIp: (request: Request): ThrottleRule => ({ scope: "login-ip", subject: clientIp(request), limit: 30, windowSeconds: 900 }),
  orderPerIp: (request: Request): ThrottleRule => ({ scope: "order-ip", subject: clientIp(request), limit: 10, windowSeconds: 3600 }),
}

function ipSubject(request: Request, token: string) {
  const ip = clientIp(request)
  return ip ? `${ip}|${token}` : ""
}
