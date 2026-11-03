// Print-ready files for an order: one 300 dpi JPEG and PDF per print, at the
// ordered size and finish.
//
//   npm run print -- kinema-dracula:a2-pleksi paketa-horror-klasik --out CUBE-482913
//
// Each argument is a product id with an optional variant: a poster size
// (a5, a4, a3, a2; a3 by default), optionally followed by a finish
// (-pleksi, -kanavace, -kornize-zeze, -kornize-bardhe, -kornize-lisi). Bundles
// expand to the posters they contain. Customer photos are passed as
// 'foto@<variant>@<x,y,w,h crop>@<p|l>@<private original url or local file>'.
// Files land in
// print/<out>/. The admin order view shows the exact command to run.
//
// Layout: posters sit on white with a margin and 3 mm bleed; photos fill the
// print edge to edge into the bleed. Canvas gets 30 mm extra on each side to
// wrap around the stretcher frame (photos mirror their edges into it).
//
// Sources: the full-resolution original behind every shop image —
//   print/sources/<id>.jpg|png  → a file you put there yourself always wins
//   archive posters  → Wikimedia Commons / Internet Archive original
//                      (docs/archive-poster-sources.json)
//   museum posters   → download the full-size image from the artwork's AIC
//                      page into print/sources/ (its API only serves 843 px)
//   CUBE posters     → the studio SVG, rendered as vector at print size
//   customer photos  → the private Vercel Blob upload (BLOB_READ_WRITE_TOKEN
//                      from .env.local)
// Needs ffmpeg, sips (macOS) and Playwright's Chromium.
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { chromium } from "@playwright/test"
import { get } from "@vercel/blob"
import { loadEnv } from "vite"
import { withJpegDpi } from "./print-metadata.mjs"
import { parseBundles } from "./bundle-source.mjs"

for (const [key, value] of Object.entries(
  loadEnv("production", process.cwd(), ""),
))
  process.env[key] ??= value

const DPI = 300
const BLEED_MM = 3
// White margin around the artwork: 8 mm, or 5% of the width on small cards.
const marginMm = (widthMm) => Math.min(8, widthMm * 0.05)
const FORMATS = {
  a6: [105, 148],
  a5: [148, 210],
  a4: [210, 297],
  a3: [297, 420],
  "30x40": [300, 400],
  a2: [420, 594],
  "50x70": [500, 700],
}
const FINISHES = [
  "leter",
  "pleksi",
  "kanavace",
  "kornize-zeze",
  "kornize-bardhe",
  "kornize-lisi",
]
// Canvas wraps 2 cm deep stretcher bars plus a fold.
const WRAP_MM = 30
const headers = {
  "User-Agent": "cube-designers/1.0 (info@cube-designers.com)",
}
const mmToPx = (mm) => Math.round((mm / 25.4) * DPI)

const args = process.argv.slice(2)
const outIndex = args.indexOf("--out")
const outName =
  outIndex >= 0
    ? args.splice(outIndex, 2)[1]
    : new Date().toISOString().slice(0, 10)
if (!args.length || !/^[\w-]+$/.test(outName ?? "")) {
  console.log(
    "Përdorimi: npm run print -- <produkti>[:<madhësia>[-<materiali>]] ... [--out CUBE-123456]",
  )
  process.exit(1)
}

const archiveSources = new Map(
  JSON.parse(await readFile("docs/archive-poster-sources.json", "utf8")).map(
    (item) => [item.slug, item],
  ),
)
const museumSource = await readFile("src/data/museum-posters.ts", "utf8")
const bundleSource = await readFile("src/data/bundles.ts", "utf8")
const productSource = await readFile("src/data/products.ts", "utf8")

// A bundle's posters; gallery sets also give each poster's size.
const bundles = parseBundles(bundleSource)
function bundleIncludes(id) {
  const bundle = bundles.find((entry) => entry.id === id)
  return bundle?.includes.map((poster, slot) => ({
    poster,
    size: bundle.sizes?.[slot],
  }))
}

async function getJson(url, extraHeaders = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { ...headers, ...extraHeaders },
        signal: AbortSignal.timeout(60000),
      })
      if (response.ok) return await response.json()
    } catch {
      // Retried below.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)))
  }
  throw new Error(`Kërkesa dështoi: ${url}`)
}

// Where the full-resolution original of a poster lives.
async function locate(id, widthPx) {
  for (const extension of ["jpg", "jpeg", "png", "tif", "tiff"]) {
    const file = path.resolve("print/sources", `${id}.${extension}`)
    if (existsSync(file)) return { kind: "raster", file }
  }
  const archive = archiveSources.get(id)
  if (archive?.source.includes("commons.wikimedia.org")) {
    const title = decodeURIComponent(archive.source.split("/wiki/")[1])
    const data = await getJson(
      `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({
        action: "query",
        titles: title,
        prop: "imageinfo",
        iiprop: "url|size",
        iiurlwidth: String(widthPx),
        format: "json",
      })}`,
    )
    const info = Object.values(data.query.pages)[0].imageinfo[0]
    // Commons returns the original when it is smaller than the asked width.
    const url = info.width > widthPx ? info.thumburl : info.url
    return {
      kind: "raster",
      url,
      width: Math.min(info.width, widthPx),
      credit: archive.source,
    }
  }
  if (archive?.source.includes("archive.org")) {
    const identifier = archive.source.split("/details/")[1]
    const { files } = await getJson(
      `https://archive.org/metadata/${identifier}`,
    )
    const image = files
      .filter(
        (file) =>
          file.source === "original" &&
          !file.name.startsWith("__ia_thumb") &&
          /\.(jpe?g|png)$/i.test(file.name),
      )
      .sort((a, b) => Number(b.size ?? 0) - Number(a.size ?? 0))[0]
    return {
      kind: "raster",
      url: `https://archive.org/download/${identifier}/${encodeURIComponent(image.name)}`,
      credit: archive.source,
    }
  }
  const museum = museumSource.match(
    new RegExp(`"slug": "${id}",[\\s\\S]*?"aicId": (\\d+)`),
  )
  if (museum) {
    throw new Error(
      `"${id}" është nga Art Institute of Chicago. Shkarko imazhin e plotë nga https://www.artic.edu/artworks/${museum[1]} (butoni Download) dhe ruaje si print/sources/${id}.jpg.`,
    )
  }
  const raw = `public/media/collections/film-${id}.svg`
  if (existsSync(raw)) return { kind: "svg", file: raw }
  const studio = productSource.match(
    new RegExp(`id: "${id}",[\\s\\S]*?image: "([^"]+\\.svg)"`),
  )
  if (studio)
    return { kind: "svg", file: path.join("public", studio[1]), studio: true }
  throw new Error(`Nuk gjeta burim për "${id}".`)
}

function parseVariant(variant, allowCustom = false) {
  const dash = variant.indexOf("-")
  const format = dash < 0 ? variant : variant.slice(0, dash)
  const finish = dash < 0 ? "leter" : variant.slice(dash + 1)
  if (allowCustom && /^custom\d{3}x\d{3}$/.test(format)) {
    const [width, height] = format.slice(6).split("x").map(Number)
    if (width >= 100 && width <= 500 && height >= width && height <= 700)
      FORMATS[format] = [width, height]
  }
  if (!FORMATS[format] || !FINISHES.includes(finish))
    throw new Error(
      `Varianti "${variant}" nuk ekziston (madhësitë: ${Object.keys(FORMATS).join(", ")}; materialet: ${FINISHES.join(", ")}).`,
    )
  return { format, finish }
}

const jobs = []
let photoCount = 0
for (const arg of args) {
  if (arg.startsWith("foto@")) {
    const [, variant, box, orientation, ...url] = arg.split("@")
    const [x, y, w, h] = box.split(",").map(Number)
    jobs.push({
      id: `foto-${++photoCount}`,
      variant,
      ...parseVariant(variant, true),
      photo: {
        url: url.join("@"),
        crop: { x, y, w, h },
        landscape: orientation === "l",
      },
    })
    continue
  }
  const [id, variant = "a3"] = arg.split(":")
  if (variant.startsWith("custom"))
    throw new Error("Përmasat custom përdoren vetëm për foto.")
  for (const { poster, size } of bundleIncludes(id) ?? [{ poster: id }]) {
    // A set's "set" variant stands for each poster's own size.
    const own = size && (variant === "set" || !arg.includes(":")) ? size : variant
    jobs.push({ id: poster, variant: own, ...parseVariant(own) })
  }
}

// Draws a customer photo in Chromium, which applies the phone's EXIF
// orientation the same way the browser did when the customer cropped it.
async function renderPhoto(bytes, contentType, options, outFile) {
  const page = await browser.newPage()
  const origin = "https://print.local"
  let output
  await page.route(`${origin}/**`, async (route) => {
    const url = route.request().url()
    if (url.endsWith("/photo"))
      return route.fulfill({ body: bytes, contentType })
    if (url.endsWith("/out")) {
      output = route.request().postDataBuffer()
      return route.fulfill({ body: "ok" })
    }
    return route.fulfill({
      body: "<!doctype html><title>print</title>",
      contentType: "text/html",
    })
  })
  await page.goto(`${origin}/`)
  const info = await page.evaluate(async ({ crop, trim, extra, wrap }) => {
    const bitmap = await createImageBitmap(
      await (await fetch("/photo")).blob(),
      {
        imageOrientation: "from-image",
      },
    )
    const width = trim[0] + extra * 2
    const height = trim[1] + extra * 2
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext("2d")
    context.imageSmoothingQuality = "high"
    context.fillStyle = "#fff"
    context.fillRect(0, 0, width, height)
    const source = [
      crop.x * bitmap.width,
      crop.y * bitmap.height,
      crop.w * bitmap.width,
      crop.h * bitmap.height,
    ]
    if (wrap) {
      // The picture fills the front; its outer bands are mirrored onto the
      // sides that wrap around the frame.
      context.drawImage(bitmap, ...source, extra, extra, trim[0], trim[1])
      const mirror = async (flipX, sx, sy, sw, sh, dx, dy) => {
        const snapshot = await createImageBitmap(canvas)
        context.save()
        context.translate(dx + (flipX ? sw : 0), dy + (flipX ? 0 : sh))
        context.scale(flipX ? -1 : 1, flipX ? 1 : -1)
        context.drawImage(snapshot, sx, sy, sw, sh, 0, 0, sw, sh)
        context.restore()
      }
      await mirror(true, extra, extra, extra, trim[1], 0, extra)
      await mirror(true, trim[0], extra, extra, trim[1], extra + trim[0], extra)
      await mirror(false, 0, extra, width, extra, 0, 0)
      await mirror(false, 0, trim[1], width, extra, 0, extra + trim[1])
    } else {
      // The crop has the print's shape; it is scaled to cover the bleed too.
      const scale = Math.max(width / source[2], height / source[3])
      const drawn = [source[2] * scale, source[3] * scale]
      context.drawImage(
        bitmap,
        ...source,
        (width - drawn[0]) / 2,
        (height - drawn[1]) / 2,
        ...drawn,
      )
    }
    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: 0.95,
    })
    await fetch("/out", { method: "POST", body: blob })
    return { cropWidth: source[2] }
  }, options)
  await page.close()
  await writeFile(outFile, output)
  return info
}

const outDir = path.resolve("print", outName)
await mkdir(outDir, { recursive: true })
const work = await mkdtemp(path.join(tmpdir(), "cube-print-"))
const browser = await chromium.launch()
const failed = []
try {
  for (const { id, variant, format, finish, photo } of jobs) {
    try {
      const [baseWidth, baseHeight] = FORMATS[format]
      const [widthMm, heightMm] = photo?.landscape
        ? [baseHeight, baseWidth]
        : [baseWidth, baseHeight]
      const extraMm = finish === "kanavace" ? WRAP_MM : BLEED_MM
      const name = `${id}-${variant}`
      const jpg = path.join(outDir, `${name}.jpg`)
      let effectiveDpi = DPI
      let credit

      if (photo) {
        // A downloaded original can be passed as a local path instead.
        let bytes
        let contentType = "image/jpeg"
        if (!/^https:/.test(photo.url)) bytes = await readFile(photo.url)
        else {
          if (!process.env.BLOB_READ_WRITE_TOKEN)
            throw new Error(
              "Mungon BLOB_READ_WRITE_TOKEN në .env.local (Vercel → Storage → Blob).",
            )
          const result = await get(photo.url, { access: "private" })
          if (!result || result.statusCode !== 200)
            throw new Error("Fotoja nuk u gjet në Vercel Blob.")
          bytes = Buffer.from(await new Response(result.stream).arrayBuffer())
          contentType = result.blob.contentType
        }
        const { cropWidth } = await renderPhoto(
          bytes,
          contentType,
          {
            crop: photo.crop,
            trim: [mmToPx(widthMm), mmToPx(heightMm)],
            extra: mmToPx(extraMm),
            wrap: finish === "kanavace",
          },
          jpg,
        )
        effectiveDpi = Math.round(cropWidth / (widthMm / 25.4))
      } else {
        const margin = marginMm(widthMm)
        const canvas = [
          mmToPx(widthMm + 2 * extraMm),
          mmToPx(heightMm + 2 * extraMm),
        ]
        const box = [
          mmToPx(widthMm - 2 * margin),
          mmToPx(heightMm - 2 * margin),
        ]
        const source = await locate(id, box[0])
        credit = source.credit
        const art = path.join(work, `${name}-art.png`)

        if (source.kind === "svg") {
          let svg = await readFile(source.file, "utf8")
          // Studio posters are shop mockups; their artwork sits in a 460×630
          // group, so the view box is narrowed to it and the frame drops out.
          if (source.studio)
            svg = svg.replace(/viewBox="[^"]*"/, 'viewBox="170 135 460 630"')
          const [, , vw, vh] = svg
            .match(/viewBox="([^"]*)"/)[1]
            .split(/\s+/)
            .map(Number)
          const scale = Math.min(box[0] / vw, box[1] / vh)
          const size = [Math.round(vw * scale), Math.round(vh * scale)]
          const page = await browser.newPage({
            viewport: { width: size[0], height: size[1] },
          })
          await page.setContent(
            `<style>html,body{margin:0}svg{display:block;width:${size[0]}px;height:${size[1]}px}</style>${svg}`,
          )
          await page.screenshot({ path: art, omitBackground: false })
          await page.close()
        } else if (source.file) {
          execFileSync("ffmpeg", [
            "-loglevel",
            "error",
            "-y",
            "-i",
            source.file,
            "-frames:v",
            "1",
            art,
          ])
        } else {
          const response = await fetch(source.url, {
            headers,
            signal: AbortSignal.timeout(180000),
          })
          if (!response.ok)
            throw new Error(
              `Shkarkimi dështoi për ${id}: HTTP ${response.status}`,
            )
          const original = path.join(work, `${id}-original`)
          await writeFile(original, Buffer.from(await response.arrayBuffer()))
          execFileSync("ffmpeg", [
            "-loglevel",
            "error",
            "-y",
            "-i",
            original,
            "-frames:v",
            "1",
            art,
          ])
        }

        const [artWidth, artHeight] = execFileSync("ffprobe", [
          "-v",
          "error",
          "-select_streams",
          "v",
          "-show_entries",
          "stream=width,height",
          "-of",
          "csv=p=0",
          art,
        ])
          .toString()
          .trim()
          .split(",")
          .map(Number)
        execFileSync("ffmpeg", [
          "-loglevel",
          "error",
          "-y",
          "-i",
          art,
          "-frames:v",
          "1",
          "-vf",
          [
            `scale=${box[0]}:${box[1]}:force_original_aspect_ratio=decrease:flags=lanczos`,
            `pad=${canvas[0]}:${canvas[1]}:(ow-iw)/2:(oh-ih)/2:white`,
          ].join(","),
          "-q:v",
          "2",
          jpg,
        ])
        // Effective resolution of the original at the printed size.
        if (source.kind !== "svg")
          effectiveDpi = Math.round(
            DPI / Math.min(box[0] / artWidth, box[1] / artHeight),
          )
      }

      await writeFile(jpg, withJpegDpi(await readFile(jpg), DPI))
      execFileSync(
        "sips",
        ["-s", "format", "pdf", jpg, "--out", path.join(outDir, `${name}.pdf`)],
        { stdio: "ignore" },
      )
      const warning =
        effectiveDpi < 150
          ? `  ⚠ origjinali është vetëm ~${effectiveDpi} dpi në këtë madhësi`
          : ""
      console.log(`✓ ${name}.jpg / .pdf${warning}`)
      if (credit) console.log(`  burimi: ${credit}`)
    } catch (error) {
      failed.push(id)
      console.log(`✗ ${id}-${variant}: ${error.message}`)
    }
  }
} finally {
  await browser.close()
  await rm(work, { recursive: true, force: true })
}
console.log(`\nSkedarët: ${path.relative(process.cwd(), outDir)}/`)
if (failed.length) {
  console.log(`Mungojnë: ${failed.join(", ")}`)
  process.exitCode = 1
}
