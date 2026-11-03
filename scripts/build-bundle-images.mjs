// Builds the bundle product images: the three posters of each bundle fanned
// out on the shop's grey card.
//
//   npm run media:bundles [-- <part of an id>]
//
// Needs cwebp on PATH and Playwright's Chromium (already used by the e2e
// tests). Bundles are read from src/data/bundles.ts; poster images are found
// by product id in src/data/products.ts or the generated poster folders.
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { chromium } from "@playwright/test"
import { parseBundles } from "./bundle-source.mjs"

const root = process.cwd()
const outDir = path.resolve("public/media/collections/bundles")

// bundles.ts holds plain data, so its array literal is read without a TS
// toolchain.
const bundleSource = await readFile("src/data/bundles.ts", "utf8")
const bundles = parseBundles(bundleSource)
// Print sizes in cm, for drawing gallery sets to scale.
const CM = {
  a5: [14.8, 21],
  a4: [21, 29.7],
  a3: [29.7, 42],
  "30x40": [30, 40],
  a2: [42, 59.4],
  "50x70": [50, 70],
}
const productSource = await readFile("src/data/products.ts", "utf8")

function imageFor(id) {
  for (const folder of ["archive", "museum"]) {
    const file = `public/media/collections/${folder}/${id}.webp`
    if (existsSync(file)) return file
  }
  const match = productSource.match(new RegExp(`id: "${id}",[\\s\\S]*?image: "([^"]+)"`))
  if (match) return path.join("public", match[1])
  throw new Error(`No image for ${id}`)
}

const browser = await chromium.launch()
const page = await browser.newPage()
await mkdir(outDir, { recursive: true })
const work = await mkdtemp(path.join(tmpdir(), "cube-bundles-"))
try {
  // `npm run media:bundles -- set-` rebuilds only the matching ids.
  const only = process.argv[2]
  for (const bundle of bundles.filter((entry) => !only || entry.id.includes(only))) {
    const sources = await Promise.all(
      bundle.includes.map(async (id) => {
        const file = imageFor(id)
        const type = file.endsWith(".svg") ? "image/svg+xml" : "image/webp"
        return `data:${type};base64,${(await readFile(path.join(root, file))).toString("base64")}`
      }),
    )
    const png = await page.evaluate(async ({ urls, sizes, cmSizes }) => {
      const load = (url) =>
        new Promise((resolve, reject) => {
          const image = new Image()
          image.onload = () => resolve(image)
          image.onerror = reject
          image.src = url
        })
      // Crops each image to its dark frame so the three posters can overlap
      // without the grey card or a drawn shadow around them.
      const crop = (image) => {
        const canvas = document.createElement("canvas")
        canvas.width = 1200
        canvas.height = 1350
        const context = canvas.getContext("2d")
        context.drawImage(image, 0, 0, 1200, 1350)
        const { data } = context.getImageData(0, 0, 1200, 1350)
        let top = 1350, left = 1200, right = 0, bottom = 0
        for (let y = 0; y < 1350; y += 2)
          for (let x = 0; x < 1200; x += 2) {
            const i = (y * 1200 + x) * 4
            if (data[i] < 70 && data[i + 1] < 70 && data[i + 2] < 70) {
              top = Math.min(top, y)
              bottom = Math.max(bottom, y)
              left = Math.min(left, x)
              right = Math.max(right, x)
            }
          }
        const out = document.createElement("canvas")
        out.width = right - left
        out.height = bottom - top
        out.getContext("2d").drawImage(canvas, left, top, out.width, out.height, 0, 0, out.width, out.height)
        return out
      }
      const posters = (await Promise.all(urls.map(load))).map(crop)
      const canvas = document.createElement("canvas")
      canvas.width = 1200
      canvas.height = 1350
      const context = canvas.getContext("2d")
      context.fillStyle = "#eeeef0"
      context.fillRect(0, 0, 1200, 1350)
      // A print of the slot's size: the artwork fitted inside it, on white
      // paper when its shape differs (a landscape work on a portrait print).
      const draw = (poster, x, y, width, height) => {
        const fit = Math.min(width / poster.width, height / poster.height)
        const w = poster.width * fit
        const h = poster.height * fit
        context.save()
        context.shadowColor = "rgba(0, 0, 0, 0.22)"
        context.shadowBlur = 18
        context.shadowOffsetY = 8
        context.fillStyle = "#fbfaf7"
        if (Math.abs(w - width) > 2 || Math.abs(h - height) > 2)
          context.fillRect(x, y, width, height)
        context.restore()
        context.drawImage(poster, x + (width - w) / 2, y + (height - h) / 2, w, h)
      }
      if (sizes) {
        // A gallery set as it hangs: same-size sets as a grid, mixed sets as
        // columns (a large print alone, small ones stacked in pairs) wrapped
        // into rows that share one centre line.
        const gap = 3
        const columns = []
        const same = sizes.every((size) => size === sizes[0])
        if (same) {
          const per = Math.ceil(Math.sqrt(sizes.length))
          sizes.forEach((_, index) => {
            ;(columns[index % per] ??= []).push(index)
          })
        } else {
          const order = sizes.map((_, index) => index)
          const big = order.filter((index) => sizes[index] === "a2")
          const mid = order.filter((index) => sizes[index] === "a3")
          const small = order.filter((index) => sizes[index] === "a4")
          const pairs = []
          for (let index = 0; index < small.length; index += 2)
            pairs.push(small.slice(index, index + 2))
          const sides = [...mid.map((index) => [index]), ...pairs]
          columns.push(...big.map((index) => [index]), ...sides)
        }
        const cm = (index) => cmSizes[sizes[index]]
        const widths = columns.map((column) => Math.max(...column.map((index) => cm(index)[0])))
        const heights = columns.map(
          (column) => column.reduce((sum, index) => sum + cm(index)[1], 0) + gap * (column.length - 1),
        )
        // Rows: the grid's rows, or for mixed sets the large prints in the
        // middle of the top row with the others filling out both sides,
        // and what is left centred below.
        let rows = []
        if (same) rows = [columns.map((_, index) => index)]
        else {
          const total = widths.reduce((sum, width) => sum + width + gap, 0)
          const big = columns.flatMap((column, index) => (sizes[column[0]] === "a2" ? [index] : []))
          const rest = columns.flatMap((column, index) => (sizes[column[0]] === "a2" ? [] : [index]))
          // Rows about as wide as the block is tall, so large sets stay
          // square instead of one long strip.
          const area = columns.reduce((sum, _, index) => sum + widths[index] * heights[index], 0)
          const bigWidth = big.reduce((sum, index) => sum + widths[index] + gap, 0)
          // Up to 12 posters: two rows; larger sets: rows about as wide as
          // the block is tall.
          const target = Math.max(
            bigWidth,
            sizes.length > 12 ? Math.sqrt(area) * 1.15 : total / 2,
          )
          const left = []
          const right = []
          let width = bigWidth
          let order = 0
          while (order < rest.length && width + widths[rest[order]] <= target) {
            ;(order % 2 ? left : right).push(rest[order])
            width += widths[rest[order]] + gap
            order++
          }
          rows = [[...left.reverse(), ...big, ...right]]
          let row = []
          width = 0
          for (const index of rest.slice(order)) {
            // Small sets keep the rest in one row under the first.
            if (sizes.length > 12 && row.length && width + widths[index] > target) {
              rows.push(row)
              row = []
              width = 0
            }
            row.push(index)
            width += widths[index] + gap
          }
          if (row.length) rows.push(row)
        }
        const rowWidth = (row) => row.reduce((sum, index) => sum + widths[index], 0) + gap * (row.length - 1)
        const rowHeight = (row) => Math.max(...row.map((index) => heights[index]))
        const blockWidth = Math.max(...rows.map(rowWidth))
        const blockHeight = rows.reduce((sum, row) => sum + rowHeight(row), 0) + gap * (rows.length - 1)
        const scale = Math.min(1000 / blockWidth, 1150 / blockHeight)
        let top = 675 - (blockHeight * scale) / 2
        for (const row of rows) {
          let left = 600 - (rowWidth(row) * scale) / 2
          for (const column of row) {
            let y = top + ((rowHeight(row) - heights[column]) * scale) / 2
            for (const index of columns[column]) {
              const [w, h] = cm(index)
              draw(posters[index], left + ((widths[column] - w) * scale) / 2, y, w * scale, h * scale)
              y += (h + gap) * scale
            }
            left += (widths[column] + gap) * scale
          }
          top += (rowHeight(row) + gap) * scale
        }
        return canvas.toDataURL("image/png")
      }
      // Side posters first, the middle one on top.
      const slots = [
        { poster: posters[0], x: 360, y: 700, height: 640, angle: -6 },
        { poster: posters[2], x: 840, y: 700, height: 640, angle: 6 },
        { poster: posters[1], x: 600, y: 660, height: 760, angle: 0 },
      ]
      for (const { poster, x, y, height: tall, angle } of slots) {
        // Landscape works are kept as wide as a portrait poster would be.
        const ratio = poster.width / poster.height
        const height = Math.min(tall, (tall * 0.7) / ratio)
        const width = ratio * height
        context.save()
        context.translate(x, y)
        context.rotate((angle * Math.PI) / 180)
        context.shadowColor = "rgba(0, 0, 0, 0.28)"
        context.shadowBlur = 40
        context.shadowOffsetY = 18
        context.drawImage(poster, -width / 2, -height / 2, width, height)
        context.restore()
      }
      return canvas.toDataURL("image/png")
    }, { urls: sources, sizes: bundle.sizes, cmSizes: CM })
    const file = path.join(work, `${bundle.id}.png`)
    await writeFile(file, Buffer.from(png.split(",")[1], "base64"))
    execFileSync("cwebp", ["-quiet", "-q", "80", file, "-o", path.join(outDir, `${bundle.id}.webp`)])
    console.log(`${bundle.id}`)
  }
} finally {
  await browser.close()
  await rm(work, { recursive: true, force: true })
}
