import {
  checkPassword,
  clearSessionCookie,
  createSessionCookie,
  isAdmin,
} from "../_lib/auth.js"
import { handle, HttpError, json, readJson, text } from "../_lib/http.js"

export const GET = handle(async (request) =>
  json({ authenticated: await isAdmin(request) }),
)

export const POST = handle(async (request) => {
  const body = await readJson(request, 2000)
  const password = text(body.password, "fjalëkalimi", { max: 200, required: true })

  if (!(await checkPassword(password))) {
    // Slow down guessing without keeping any server state.
    await new Promise((resolve) => setTimeout(resolve, 600))
    throw new HttpError(401, "Fjalëkalimi është gabim.")
  }

  return json({ authenticated: true }, 200, {
    "set-cookie": await createSessionCookie(),
  })
})

export const DELETE = handle(async () =>
  json({ authenticated: false }, 200, { "set-cookie": clearSessionCookie() }),
)
