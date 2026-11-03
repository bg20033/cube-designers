import { afterEach, describe, expect, it, vi } from "vitest"
import { apiRequest } from "./api"

afterEach(() => vi.unstubAllGlobals())
describe("API responses", () => {
  it("does not mistake an HTML fallback for a successful order", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html>fallback</html>", {
            headers: { "content-type": "text/html" },
          }),
        ),
    )
    expect((await apiRequest("/api/orders")).ok).toBe(false)
  })
  it("returns structured errors and accepts JSON responses", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Unavailable" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ reference: "CUBE-123456" }), {
          headers: { "content-type": "application/json" },
        }),
      )
    vi.stubGlobal("fetch", fetch)
    expect(await apiRequest("/api/orders")).toMatchObject({
      ok: false,
      status: 503,
      error: "Unavailable",
    })
    expect(await apiRequest("/api/orders")).toMatchObject({
      ok: true,
      data: { reference: "CUBE-123456" },
    })
  })
})
