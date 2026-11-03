import { routeApi } from "./_router.js"

// The whole API is one Vercel Function (the Hobby plan allows 12); the
// router dispatches every /api/* path to its handler in api/_handlers.
export const GET = routeApi
export const HEAD = routeApi
export const POST = routeApi
export const PUT = routeApi
export const PATCH = routeApi
export const DELETE = routeApi
