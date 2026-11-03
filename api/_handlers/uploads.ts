import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"

import { handle, HttpError, json, readJson } from "../_lib/http.js"

const MB = 1024 * 1024

// Lets the photo page say up front whether uploads are switched on.
export const GET = handle(async () =>
  json({ enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN) }),
)

// Issues short-lived tokens so the browser uploads a photo for printing
// straight to Vercel Blob (function request bodies are capped at 4.5 MB).
// The browser sends two files: the private full-resolution original under
// foto/original/ and a 1600 px working copy under foto/web/ that the shop
// shows. Orders only accept URLs of that shape (sanitizePhoto).
export const POST = handle(async (request) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    throw new HttpError(503, "Ngarkimi i fotove nuk është aktivizuar ende.")
  const body = (await readJson(request)) as unknown as HandleUploadBody
  const result = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => {
      const match = pathname.match(
        /^foto\/(original|web)\/[\w-]{1,80}\.(jpe?g|png|webp)$/,
      )
      if (!match) throw new HttpError(400, "Emri i skedarit nuk është valid.")
      return {
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
        maximumSizeInBytes: match[1] === "web" ? 4 * MB : 40 * MB,
        addRandomSuffix: true,
      }
    },
  })
  return json(result)
})
