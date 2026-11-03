// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { clientIp, describeError, handle, HttpError, readJson, redactSecrets } from "./http.js"

const TOKEN = "ab".repeat(32)

function post(body: string | ReadableStream<Uint8Array> | null, headers: Record<string, string> = { "content-type": "application/json" }) {
  return new Request("https://test.local/api/x", { method: "POST", headers, body, ...(body instanceof ReadableStream ? { duplex: "half" } : {}) } as RequestInit)
}
function stream(chunks: string[]) {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({ start(controller) { for (const chunk of chunks) controller.enqueue(encoder.encode(chunk)); controller.close() } })
}
async function status(promise: Promise<unknown>) {
  try { await promise; return 0 } catch (error) { return error instanceof HttpError ? error.status : -1 }
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

describe("readJson", () => {
  it("accepts a JSON object and rejects other content types and shapes", async () => {
    expect(await readJson(post(JSON.stringify({ a: 1 })))).toEqual({ a: 1 })
    expect(await status(readJson(post("{}", { "content-type": "text/plain" })))).toBe(415)
    expect(await status(readJson(post("[1]")))).toBe(400)
    expect(await status(readJson(post("null")))).toBe(400)
    expect(await status(readJson(post("{oops")))).toBe(400)
    expect(await status(readJson(post(null)))).toBe(400)
  })

  it("rejects a declared oversized body before reading it", async () => {
    const request = post(stream(["{}"]), { "content-type": "application/json", "content-length": "999999" })
    const text = vi.spyOn(request, "text")
    expect(await status(readJson(request, 100))).toBe(413)
    expect(text).not.toHaveBeenCalled()
  })

  it("stops reading a streamed body once it exceeds the cap", async () => {
    let pulled = 0
    const endless = new ReadableStream<Uint8Array>({ pull(controller) { pulled++; controller.enqueue(new Uint8Array(1024).fill(32)) } })
    expect(await status(readJson(post(endless), 100))).toBe(413)
    expect(pulled).toBeLessThan(10)
  })

  it("keeps the character-based limit so multi-byte Albanian text within it is accepted", async () => {
    const value = "ë".repeat(80)
    expect(await readJson(post(stream([JSON.stringify({ value })])), 100)).toEqual({ value })
    expect(await status(readJson(post(JSON.stringify({ value: "ë".repeat(120) })), 100))).toBe(413)
  })
})

describe("handle", () => {
  it("returns the Albanian message, status and extra headers of an HttpError", async () => {
    const response = await handle(async () => { throw new HttpError(429, "Shumë tentativa.", { "retry-after": "60" }) })(post("{}"))
    expect(response.status).toBe(429)
    expect(response.headers.get("retry-after")).toBe("60")
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(await response.json()).toEqual({ error: "Shumë tentativa." })
  })

  it("hides unexpected errors from the client and never logs tokens", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const response = await handle(async () => { throw new Error(`lookup failed for ${TOKEN} (Bearer ${TOKEN})`) })(post("{}"))
    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain(TOKEN)
    expect(log).toHaveBeenCalledTimes(1)
    expect(String(log.mock.calls[0][0])).not.toContain(TOKEN)
    expect(String(log.mock.calls[0][0])).toContain("lookup failed")
  })

  it("redacts long hex runs and bearer values", () => {
    expect(redactSecrets(`token=${TOKEN}`)).toBe("token=[redacted]")
    expect(redactSecrets("Authorization: Bearer abc.def")).toBe("Authorization: Bearer [redacted]")
    expect(redactSecrets("order FTE-ABCDEF123456")).toBe("order FTE-ABCDEF123456")
    expect(describeError("plain string")).toBe("Non-error thrown: string")
  })
})

describe("clientIp", () => {
  const from = (headers: Record<string, string>) => new Request("https://test.local/api/x", { headers })
  it("trusts only the header set by the current platform", () => {
    const spoofed = { "cf-connecting-ip": "1.1.1.1", "x-real-ip": "2.2.2.2", "x-forwarded-for": "3.3.3.3, 4.4.4.4" }
    vi.stubEnv("VERCEL", "")
    expect(clientIp(from(spoofed))).toBe("1.1.1.1")
    expect(clientIp(from({ "x-real-ip": "2.2.2.2" }))).toBe("")
    vi.stubEnv("VERCEL", "1")
    expect(clientIp(from(spoofed))).toBe("2.2.2.2")
    expect(clientIp(from({ "x-forwarded-for": "3.3.3.3, 4.4.4.4" }))).toBe("3.3.3.3")
    expect(clientIp(from({ "x-real-ip": "2001:DB8::1" }))).toBe("2001:db8::1")
    expect(clientIp(from({ "x-real-ip": "not an ip; drop table" }))).toBe("")
  })
})
