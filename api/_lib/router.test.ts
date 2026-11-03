// @vitest-environment node
import { describe, expect, it } from "vitest"
import { routeApi } from "../_router.js"

describe("routeApi", () => {
  it("answers unknown paths with 404 in Albanian", async () => {
    const response = await routeApi(new Request("https://test.local/api/_lib/db"))
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Shërbimi nuk u gjet." })
  })

  it("only dispatches HTTP verbs and lists them in Allow", async () => {
    for (const method of ["PUT", "OPTIONS", "default", "handle"]) {
      const response = await routeApi(new Request("https://test.local/api/invitations", { method }))
      expect(response.status).toBe(405)
      expect(response.headers.get("allow")).toBe("GET, POST, PATCH, HEAD")
    }
    const session = await routeApi(new Request("https://test.local/api/invitation-public/", { method: "DELETE" }))
    expect(session.status).toBe(405)
    expect(session.headers.get("allow")).toBe("GET, POST, HEAD")
  })

  it("rejects a malformed guest token without touching the database", async () => {
    const response = await routeApi(new Request("https://test.local/api/invitation-public", { headers: { authorization: "Bearer not-a-token" } }))
    expect(response.status).toBe(404)
    expect(response.headers.get("x-robots-tag")).toBe("noindex")
  })
})
