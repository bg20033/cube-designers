export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; status: number; error: string }

export async function apiRequest<T>(
  url: string,
  { method = "GET", body, headers }: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<ApiResult<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      credentials: "same-origin",
      headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.headers.get("content-type")?.includes("application/json")) {
      return {
        ok: false,
        status: response.status,
        error: "Shërbimi nuk është i disponueshëm. Provo përsëri.",
      }
    }
    const data = (await response.json()) as T & { error?: string }
    if (!data || typeof data !== "object")
      return {
        ok: false,
        status: response.status,
        error: "Përgjigje e pavlefshme nga serveri.",
      }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data.error ?? "Diçka shkoi keq. Provo përsëri.",
      }
    }
    return { ok: true, data }
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Nuk ka lidhje me serverin. Provo përsëri.",
    }
  } finally {
    clearTimeout(timeout)
  }
}

export type SubmitStatus = "idle" | "sending" | "sent" | "error"
