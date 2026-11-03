import { get } from "@vercel/blob"

import { isPhotoUrl } from "../../src/data/commerce.js"
import { requireAdmin } from "../_lib/auth.js"
import { handle, HttpError } from "../_lib/http.js"

// Streams a customer's private original upload to the admin for printing.
export const GET = handle(async (request) => {
  await requireAdmin(request)
  const url = new URL(request.url).searchParams.get("url") ?? ""
  if (!isPhotoUrl(url, "private"))
    throw new HttpError(400, "Linku i fotos nuk është valid.")
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    throw new HttpError(503, "Ruajtja e fotove nuk është konfiguruar.")
  const result = await get(url, { access: "private" })
  if (!result || result.statusCode !== 200)
    throw new HttpError(404, "Fotoja nuk u gjet.")
  const name = result.blob.pathname.split("/").pop() ?? "foto.jpg"
  return new Response(result.stream, {
    headers: {
      "content-type": result.blob.contentType,
      "content-disposition": `attachment; filename="${name.replace(/"/g, "")}"`,
      "cache-control": "no-store",
    },
  })
})
