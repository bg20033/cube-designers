// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { createSessionCookie, isAdmin } from "./auth.js"

const withCookie = (cookie: string) => new Request("https://test.local/api/admin/x", { headers: { cookie } })

beforeAll(() => { vi.stubEnv("ADMIN_PASSWORD", "test-admin-password"); vi.stubEnv("ADMIN_SESSION_SECRET", "test-admin-session-secret-at-least-32") })
afterAll(() => { vi.unstubAllEnvs() })

describe("admin session cookie", () => {
  it("accepts a freshly signed cookie", async () => {
    expect(await isAdmin(withCookie((await createSessionCookie()).split(";")[0]))).toBe(true)
  })

  it("rejects missing, tampered, non-numeric or extended cookies", async () => {
    const value = (await createSessionCookie()).split(";")[0].split("=")[1]
    const [expires, signature] = value.split(".")
    expect(await isAdmin(withCookie(""))).toBe(false)
    expect(await isAdmin(withCookie(`cube_admin=${Number(expires) + 1}.${signature}`))).toBe(false)
    expect(await isAdmin(withCookie(`cube_admin=${expires}.${signature}x`))).toBe(false)
    expect(await isAdmin(withCookie(`cube_admin=abc.${signature}`))).toBe(false)
    expect(await isAdmin(withCookie(`cube_admin=${expires}.${signature}.extra`))).toBe(false)
    expect(await isAdmin(withCookie(`cube_admin=1.${signature}`))).toBe(false)
  })
})
