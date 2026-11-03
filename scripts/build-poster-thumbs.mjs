// Builds light WebP copies of the shop's poster images for grids and cards:
// public/media/collections/<dir>/x.webp → public/media/collections/w480/<dir>/x.webp (and w800).
// The full-size file stays for product pages. Needs `cwebp` (brew install webp).
// Re-run after adding posters: npm run media:thumbs
import { execFile } from "node:child_process"
import { mkdir, readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

const run = promisify(execFile)
const root = path.resolve("public/media/collections")
const sources = ["archive", "museum", "bundles", "blanks"]
const widths = [480, 800]

// Pixel width from the WebP header (lossy, lossless or extended).
function webpWidth(buffer) {
  const chunk = buffer.toString("ascii", 12, 16)
  if (chunk === "VP8 ") return buffer.readUInt16LE(26) & 0x3fff
  if (chunk === "VP8L") return ((buffer[22] << 8 | buffer[21]) & 0x3fff) + 1
  if (chunk === "VP8X") return buffer.readUIntLE(24, 3) + 1
  return 0
}

const jobs = []
for (const dir of sources) {
  for (const name of await readdir(path.join(root, dir))) {
    if (!name.endsWith(".webp")) continue
    const source = path.join(root, dir, name)
    const sourceTime = (await stat(source)).mtimeMs
    const width = webpWidth(await readFile(source))
    for (const target of widths) {
      const output = path.join(root, `w${target}`, dir, name)
      const existing = await stat(output).catch(() => null)
      if (existing && existing.mtimeMs >= sourceTime) continue
      jobs.push({ source, output, resize: width > target ? target : 0 })
    }
  }
}

let done = 0
async function worker() {
  for (let job = jobs.shift(); job; job = jobs.shift()) {
    await mkdir(path.dirname(job.output), { recursive: true })
    const resize = job.resize ? ["-resize", String(job.resize), "0"] : []
    await run("cwebp", ["-quiet", "-q", "74", "-m", "6", ...resize, job.source, "-o", job.output])
    done++
  }
}
const total = jobs.length
await Promise.all(Array.from({ length: 8 }, worker))
console.log(`Poster thumbnails: ${done} of ${total} written.`)
