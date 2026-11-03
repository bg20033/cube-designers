// Builds the museum poster collection from public-domain (CC0) works in the
// Art Institute of Chicago API: framed product images plus their metadata.
//
//   npm run media:posters
//
// Needs ffmpeg and cwebp on PATH. Only works the API marks `is_public_domain`
// are kept, so everything written here can be shown and printed.
// API docs: https://api.artic.edu/docs · Licence: https://www.artic.edu/open-access
import { execFileSync } from "node:child_process"
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

// Each series is a set of searches; `artist` keeps only works whose artist
// matches, `poster` keeps only works the museum classifies as posters.
const series = [
  {
    name: "Vintage",
    prefix: "vintage",
    limit: 40,
    // WWI propaganda and charity appeals don't belong in a decor shop.
    exclude: /\b(huns?|loan|bonds?|war|victory|prisoner|doughboy|red cross|help the women|eucharistic|cold)\b/i,
    searches: [{ poster: true, size: 100 }],
  },
  {
    name: "Japoni",
    prefix: "japoni",
    limit: 24,
    searches: [
      { artist: "Katsushika Hokusai", size: 40, take: 9 },
      { artist: "Utagawa Hiroshige", size: 40, take: 9 },
      { artist: "Kitagawa Utamaro", size: 20, take: 3 },
      { artist: "Utagawa Kuniyoshi", size: 20, take: 3 },
    ],
  },
  {
    name: "Klasike",
    prefix: "klasike",
    limit: 30,
    exclude: /calf's head/i,
    searches: [
      { artist: "Claude Monet", size: 30, take: 8 },
      { artist: "Vincent van Gogh", size: 15, take: 4 },
      { artist: "Georges Seurat", size: 10, take: 2 },
      { artist: "Paul Cezanne", size: 20, take: 3 },
      { artist: "Pierre-Auguste Renoir", size: 20, take: 3 },
      { artist: "Paul Gauguin", size: 20, take: 3 },
      { artist: "Gustave Caillebotte", size: 10, take: 2 },
      { artist: "Henri de Toulouse-Lautrec", size: 40, take: 2, painting: true },
      { artist: "Mary Cassatt", size: 20, take: 2, painting: true },
      { artist: "Hilaire Germain Edgar Degas", size: 30, take: 2, painting: true },
    ],
  },
]

const outDir = path.resolve("public/media/collections/museum")
const dataFile = path.resolve("src/data/museum-posters.ts")
const headers = { "AIC-User-Agent": "cube-designers (info@cube-designers.com)" }
const fields = [
  "id",
  "title",
  "artist_title",
  "date_display",
  "image_id",
  "is_public_domain",
  "classification_title",
  "classification_titles",
  "thumbnail",
].join(",")

async function search({ artist, poster, size }) {
  const params = new URLSearchParams({ fields, limit: String(size) })
  params.append("query[bool][must][0][term][is_public_domain]", "true")
  params.append("query[bool][must][1][exists][field]", "image_id")
  if (poster)
    params.append("query[bool][must][2][match][classification_titles]", "poster")
  if (artist) params.set("q", artist)
  const response = await fetch(
    `https://api.artic.edu/api/v1/artworks/search?${params}`,
    { headers },
  )
  if (!response.ok) throw new Error(`AIC search: HTTP ${response.status}`)
  return (await response.json()).data
}

// "Under the Wave off Kanagawa (Kanagawa oki nami ura), also known as…, from
// the series …" → "Under the Wave off Kanagawa"
function shortTitle(title) {
  return title
    .replace(/,? (?:also known as|(?:no\. \d+ )?from (?:the|an) (?:untitled )?(?:series|album)).*$/i, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/^No\. \d+:\s*/i, "")
    .replace(/^"|"$/g, "")
    .trim()
    .slice(0, 70)
}

const slugify = (value) =>
  value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    .replace(/-$/, "")

function usable(work, search) {
  if (!work.is_public_domain || !work.image_id || !work.thumbnail) return false
  if (search.artist && work.artist_title !== search.artist) return false
  const ratio = work.thumbnail.width / work.thumbnail.height
  if (ratio < 0.45 || ratio > 1.7) return false
  // Skip sketches, studies and objects; keep finished images. Posters also
  // carry a "drawings" classification, so only the main one is checked.
  const main = work.classification_title ?? ""
  if (/\b(study|sketch)\b/i.test(work.title)) return false
  if (!search.poster && /drawing|photograph|sculpture|textile|book/i.test(main))
    return false
  if (search.painting && !/painting|oil on/i.test(main)) return false
  return true
}

const picked = []
const seenIds = new Set()
const seenTitles = new Set()
for (const group of series) {
  const chosen = []
  for (const query of group.searches) {
    let taken = 0
    for (const work of await search(query)) {
      if (chosen.length >= group.limit || (query.take && taken >= query.take)) break
      const title = shortTitle(work.title)
      const titleKey = `${work.artist_title}:${title.toLowerCase()}`
      if (!title || seenIds.has(work.id) || seenTitles.has(titleKey)) continue
      if (!usable(work, query) || group.exclude?.test(title)) continue
      seenIds.add(work.id)
      seenTitles.add(titleKey)
      chosen.push({ work, title })
      taken++
    }
  }
  for (const { work, title } of chosen) {
    let slug = `${group.prefix}-${slugify(title)}`
    if (picked.some((item) => item.slug === slug)) slug += `-${work.id}`
    picked.push({
      slug,
      series: group.name,
      aicId: work.id,
      imageId: work.image_id,
      title,
      artist: work.artist_title ?? "Autor i panjohur",
      date: work.date_display ?? "",
    })
  }
  console.log(`${group.name}: ${chosen.length}`)
}

await mkdir(outDir, { recursive: true })
const work = await mkdtemp(path.join(tmpdir(), "cube-museum-"))
const written = []
try {
  for (const poster of picked) {
    const source = path.join(work, `${poster.slug}.jpg`)
    const image = await fetch(
      `https://www.artic.edu/iiif/2/${poster.imageId}/full/843,/0/default.jpg`,
      { headers },
    )
    if (!image.ok) {
      console.warn(`skip ${poster.slug}: IIIF HTTP ${image.status}`)
      continue
    }
    await writeFile(source, Buffer.from(await image.arrayBuffer()))

    // Framed on the shop's grey card like the other posters: white mat,
    // dark frame, centred on a 1200 × 1350 canvas.
    const framed = path.join(work, `${poster.slug}.png`)
    execFileSync("ffmpeg", [
      "-loglevel", "error", "-y", "-i", source, "-vf",
      [
        "scale=w=860:h=940:force_original_aspect_ratio=decrease",
        "pad=iw+28:ih+28:14:14:white",
        "pad=iw+24:ih+24:12:12:0x242525",
        "pad=1200:1350:(ow-iw)/2:(oh-ih)/2:0xeeeef0",
      ].join(","),
      framed,
    ])
    execFileSync("cwebp", ["-quiet", "-q", "78", framed, "-o", path.join(outDir, `${poster.slug}.webp`)])
    const { imageId: _imageId, ...entry } = poster
    written.push(entry)
    process.stdout.write(".")
  }
} finally {
  await rm(work, { recursive: true, force: true })
}

// Drop images left over from a previous selection.
const keep = new Set(written.map((poster) => `${poster.slug}.webp`))
for (const file of await readdir(outDir))
  if (!keep.has(file)) await rm(path.join(outDir, file))

await writeFile(
  dataFile,
  `// Generated by scripts/fetch-museum-posters.mjs — public-domain (CC0) works
// from the Art Institute of Chicago. Re-run the script instead of editing.
// Full-resolution files for printing: https://www.artic.edu/artworks/<aicId>

export type MuseumPoster = {
  slug: string
  series: string
  aicId: number
  title: string
  artist: string
  date: string
}

export const museumPosters: MuseumPoster[] = ${JSON.stringify(written, null, 2)}
`,
)
console.log(`\n${written.length} posters → ${path.relative(process.cwd(), dataFile)}`)
