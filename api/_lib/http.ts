export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
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
        return json({ error: error.message }, error.status)
      }
      console.error(error)
      return json({ error: "Gabim në server. Provo përsëri." }, 500)
    }
  }
}

// Mutations only accept JSON: browsers can't send it cross-site without a
// CORS preflight, which together with SameSite cookies blocks CSRF.
export async function readJson(request: Request, maxBytes = 20_000) {
  const type = request.headers.get("content-type") ?? ""
  if (!type.includes("application/json")) {
    throw new HttpError(415, "Kërkohet JSON.")
  }

  const text = await request.text()
  if (text.length > maxBytes) throw new HttpError(413, "Kërkesa është shumë e madhe.")

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
  if (result.length > max) throw new HttpError(400, `Fusha ${field} është shumë e gjatë.`)
  return result
}

export function email(value: unknown) {
  const result = text(value, "email", { max: 254, required: true })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) {
    throw new HttpError(400, "Email-i nuk është valid.")
  }
  return result
}

export function oneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  field: string,
): T {
  if (typeof value === "string" && options.includes(value as T)) return value as T
  throw new HttpError(400, `Vlerë e pavlefshme për ${field}.`)
}

export function positiveId(value: unknown) {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, "ID e pavlefshme.")
  return id
}
