export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string }

export async function apiRequest<T>(
  url: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data = (await response.json().catch(() => ({}))) as T & { error?: string }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data.error ?? "Diçka shkoi keq. Provo përsëri.",
      }
    }
    return { ok: true, data }
  } catch {
    return { ok: false, status: 0, error: "Nuk ka lidhje me serverin." }
  }
}

export type SubmitStatus = "idle" | "sending" | "sent" | "error"
