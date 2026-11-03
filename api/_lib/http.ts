export class HttpError extends Error {
  status: number
  headers: Record<string, string>

  constructor(status: number, message: string, headers: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.headers = headers
  }
}

type Handler = (request: Request) => Promise<Response>

export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  })
}

export function handle(handler: Handler): Handler {
  return async (request) => {
    try {
      return await handler(request)
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message }, error.status, error.headers)
      }
      console.error(describeError(error))
      return json({ error: "Gabim në server. Provo përsëri." }, 500)
    }
  }
}

// Server logs must never contain bearer tokens, session tokens or hashes that
// stand in for them, so long hex runs and bearer values are masked.
export function redactSecrets(value: string) {
  return value.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/[a-f0-9]{32,}/gi, "[redacted]")
}
export function describeError(error: unknown) {
  if (error instanceof Error) return redactSecrets(error.stack ?? `${error.name}: ${error.message}`)
  return `Non-error thrown: ${typeof error}`
}

// Reads at most `limit` bytes so an oversized body is rejected without
// buffering it in memory first.
async function readBody(request: Request, limit: number) {
  const declared = Number(request.headers.get("content-length") ?? "")
  if (Number.isFinite(declared) && declared > limit) throw new HttpError(413, "Kërkesa është shumë e madhe.")
  if (!request.body) return ""
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel().catch(() => undefined)
      throw new HttpError(413, "Kërkesa është shumë e madhe.")
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return new TextDecoder().decode(bytes)
}

// The caller's address as reported by the hosting platform, or "" when it is
// unknown (local runs, tests). Only headers the platform itself sets are
// trusted: Vercel overwrites x-real-ip/x-forwarded-for, Cloudflare sets
// cf-connecting-ip. A client cannot pick its own rate-limit bucket.
export function clientIp(request: Request) {
  const headers = request.headers
  const value = process.env.VERCEL
    ? headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]
    : headers.get("cf-connecting-ip")
  const ip = value?.trim() ?? ""
  return /^[0-9a-f.:]{2,45}$/i.test(ip) ? ip.toLowerCase() : ""
}

// Mutations only accept JSON: browsers can't send it cross-site without a
// CORS preflight, which together with SameSite cookies blocks CSRF.
export async function readJson(request: Request, maxBytes = 20_000) {
  const type = request.headers.get("content-type") ?? ""
  if (!type.includes("application/json")) {
    throw new HttpError(415, "Kërkohet JSON.")
  }

  // `maxBytes` has always been measured in characters; one character is at
  // most three UTF-8 bytes, so the byte cap never rejects a valid request.
  const text = await readBody(request, maxBytes * 3)
  if (text.length > maxBytes)
    throw new HttpError(413, "Kërkesa është shumë e madhe.")

  try {
    const value: unknown = JSON.parse(text)
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("not an object")
    }
    return value as Record<string, unknown>
  } catch {
    throw new HttpError(400, "JSON i pavlefshëm.")
  }
}

type TextOptions = { max?: number; required?: boolean }

export function text(
  value: unknown,
  field: string,
  { max = 2000, required = false }: TextOptions = {},
) {
  const result = typeof value === "string" ? value.trim() : ""
  if (required && !result) throw new HttpError(400, `Mungon fusha: ${field}.`)
  if (result.length > max)
    throw new HttpError(400, `Fusha ${field} është shumë e gjatë.`)
  return result
}

export function email(value: unknown) {
  const result = text(value, "email", { max: 254, required: true })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) {
    throw new HttpError(400, "Email-i nuk është valid.")
  }
  return result
}

// Optional email: empty is allowed, anything else must look like an address.
export function optionalEmail(value: unknown) {
  return text(value, "email", { max: 254 }) ? email(value) : ""
}

export function oneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  field: string,
): T {
  if (typeof value === "string" && options.includes(value as T))
    return value as T
  throw new HttpError(400, `Vlerë e pavlefshme për ${field}.`)
}

export function positiveId(value: unknown) {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new HttpError(400, "ID e pavlefshme.")
  return id
}
