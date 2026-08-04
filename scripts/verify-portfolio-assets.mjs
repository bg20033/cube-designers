import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const manifestPath = join(projectRoot, "src", "data", "portfolio-media.json")
const mediaRoot = join(projectRoot, "public", "media", "portfolio")
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))

if (manifest.length !== 36) {
  throw new Error(`Expected 36 curated images, found ${manifest.length}.`)
}

const keys = new Set()
const sources = new Set()

for (const image of manifest) {
  if (keys.has(image.key)) throw new Error(`Duplicate media key: ${image.key}`)
  if (sources.has(image.source)) {
    throw new Error(`Duplicate source selection: ${image.source}`)
  }
  if (!image.alt?.trim()) throw new Error(`Missing alt text: ${image.key}`)
  if (!image.variants?.length) throw new Error(`Missing variants: ${image.key}`)

  keys.add(image.key)
  sources.add(image.source)

  for (const variant of image.variants) {
    const diskPath = join(projectRoot, "public", variant.src.replace(/^\//, ""))
    if (!existsSync(diskPath)) throw new Error(`Missing media file: ${variant.src}`)

    const probe = JSON.parse(
      execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=width,height,codec_name",
          "-of",
          "json",
          diskPath,
        ],
        { encoding: "utf8" },
      ),
    ).streams?.[0]

    if (
      probe?.codec_name !== "webp" ||
      probe.width !== variant.width ||
      probe.height !== variant.height
    ) {
      throw new Error(`Invalid WebP metadata for ${variant.src}`)
    }
  }
}

const forbidden = readdirSync(mediaRoot).filter((name) => /\.(jpe?g|mp4)$/i.test(name))
if (forbidden.length) {
  throw new Error(`Original media must not ship: ${forbidden.join(", ")}`)
}

console.log(`Verified ${manifest.length} images and ${manifest.flatMap((image) => image.variants).length} WebP variants.`)
