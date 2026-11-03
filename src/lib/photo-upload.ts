import { upload } from "@vercel/blob/client"
import type { PhotoCrop } from "@/data/products"
import { apiRequest } from "@/lib/api"

export type UploadedPhoto = {
  // Public 1600 px working copy and private full-resolution original.
  image: string
  original: string
  // Pixel size of the original as the browser shows it (EXIF orientation
  // applied), which is what crops refer to.
  width: number
  height: number
  name: string
}

const MB = 1024 * 1024
const WORKING_SIZE = 1600

export async function uploadsEnabled() {
  const result = await apiRequest<{ enabled: boolean }>("/api/uploads")
  return result.ok && result.data.enabled
}

function fileStem(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "foto"
  )
}

// Uploads a customer photo for printing: the original as it is (private) and
// a 1600 px JPEG working copy for the shop, cart and wall planner (public,
// behind an unguessable URL).
export async function uploadPhoto(
  file: File,
  onProgress: (percent: number) => void,
): Promise<UploadedPhoto> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type))
    throw new Error("Lejohen vetëm foto JPG, PNG ose WebP.")
  if (file.size > 40 * MB) throw new Error("Fotoja është më e madhe se 40 MB.")
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  })
  const { width, height } = bitmap
  if (Math.min(width, height) < 400) {
    bitmap.close()
    throw new Error("Fotoja është shumë e vogël për print (min. 400 px).")
  }
  const scale = Math.min(1, WORKING_SIZE / Math.max(width, height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext("2d")!
  // Transparent PNG/WebP prints on white, matching the local preview.
  context.fillStyle = "#fff"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const working = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Fotoja nuk u lexua.")),
      "image/jpeg",
      0.86,
    ),
  )

  const stem = fileStem(file.name)
  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg"
  const loaded = [0, 0]
  const total = file.size + working.size
  const progress = (index: number) => (event: { loaded: number }) => {
    loaded[index] = event.loaded
    onProgress(
      Math.min(99, Math.round(((loaded[0] + loaded[1]) / total) * 100)),
    )
  }
  try {
    const [original, image] = await Promise.all([
      upload(`foto/original/${stem}.${extension}`, file, {
        access: "private",
        handleUploadUrl: "/api/uploads",
        multipart: file.size > 8 * MB,
        onUploadProgress: progress(0),
      }),
      upload(`foto/web/${stem}.jpg`, working, {
        access: "public",
        handleUploadUrl: "/api/uploads",
        onUploadProgress: progress(1),
      }),
    ])
    onProgress(100)
    return {
      image: image.url,
      original: original.url,
      width,
      height,
      name: file.name,
    }
  } catch {
    throw new Error("Ngarkimi dështoi. Kontrollo internetin dhe provo përsëri.")
  }
}

// Largest crop of the given print shape centred on (cx, cy) at `zoom`
// (1 = as large as fits), as fractions of the photo.
export function cropFor(
  photo: { width: number; height: number },
  printAspect: number,
  zoom: number,
  cx: number,
  cy: number,
): PhotoCrop {
  const photoAspect = photo.width / photo.height
  let w = 1 / zoom
  let h = 1 / zoom
  if (photoAspect > printAspect) w = printAspect / photoAspect / zoom
  else h = photoAspect / printAspect / zoom
  const clamp = (value: number, size: number) =>
    Math.min(Math.max(value - size / 2, 0), 1 - size)
  return { x: clamp(cx, w), y: clamp(cy, h), w, h }
}

// Print quality of a crop at a print width in cm, from the original pixels.
export function photoDpi(
  photo: { width: number },
  crop: PhotoCrop,
  printWidthCm: number,
) {
  return Math.round((photo.width * crop.w) / (printWidthCm / 2.54))
}

export function qualityLabel(dpi: number) {
  if (dpi >= 150) return { level: "great", label: "Cilësi e shkëlqyer" }
  if (dpi >= 100) return { level: "good", label: "Cilësi e mirë" }
  if (dpi >= 70) return { level: "ok", label: "Cilësi e pranueshme" }
  return { level: "low", label: "Cilësi e dobët për këtë madhësi" }
}
