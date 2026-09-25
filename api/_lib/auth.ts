import { HttpError } from "./http.js"

const COOKIE = "cube_admin"
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7

const encoder = new TextEncoder()

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD
  if (!value) throw new HttpError(503, "ADMIN_PASSWORD nuk është konfiguruar.")
  return value
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value))
  return Buffer.from(signature).toString("base64url")
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return diff === 0
}

function readCookie(request: Request) {
  const header = request.headers.get("cookie") ?? ""
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=")
    if (name === COOKIE) return rest.join("=")
  }
  return ""
}

export async function checkPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) throw new HttpError(503, "ADMIN_PASSWORD nuk është konfiguruar.")
  // Compare signatures so the check takes the same time for any input length.
  return safeEqual(await sign(`pw:${password}`), await sign(`pw:${expected}`))
}

export async function createSessionCookie() {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS
  const token = `${expires}.${await sign(`session:${expires}`)}`
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}`
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
}

export async function isAdmin(request: Request) {
  const [expires, signature] = readCookie(request).split(".")
  if (!expires || !signature) return false
  if (Number(expires) < Date.now() / 1000) return false
  return safeEqual(signature, await sign(`session:${expires}`))
}

export async function requireAdmin(request: Request) {
  if (!(await isAdmin(request))) throw new HttpError(401, "Duhet me u kyç.")
}
