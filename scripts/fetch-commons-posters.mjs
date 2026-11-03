// Builds the archive poster collection (film, music, theatre) from public
// domain files on Wikimedia Commons: framed product images plus metadata.
//
//   npm run media:archive            (add -- --dry-run to preview the picks)
//
// Needs ffmpeg and cwebp on PATH. A file is kept only when Commons tags it
// with a public-domain template, its licence metadata says public domain, and
// it was published before 1956 — old enough to be public domain in Kosovo and
// the EU as an anonymous work, not only in the US.
// API: https://commons.wikimedia.org/w/api.php
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { formatArchiveData } from "./archive-data.mjs"

const headers = { "User-Agent": "cube-designers/1.0 (info@cube-designers.com)" }
const LATEST_YEAR = 1955

const series = [
  {
    name: "Kinema",
    prefix: "kinema",
    limit: 1500,
    title: /film|movie|poster/i,
    searches: [
      'film poster hastemplate:"PD-US-no notice"',
      'film poster hastemplate:"PD-US-not renewed"',
      'movie poster hastemplate:"PD-US-expired"',
      'film poster hastemplate:"PD-US-expired"',
      'movie poster hastemplate:"PD-US-no notice"',
      'movie poster hastemplate:"PD-US-not renewed"',
      'one sheet poster hastemplate:"PD-US-no notice"',
      'one sheet poster hastemplate:"PD-US-expired"',
    ],
  },
  {
    name: "Muzikë",
    prefix: "muzike",
    limit: 300,
    title: /concert|jazz|opera|music|musique|orchest|symphon|festival|recital|band|operette|konzert|ball\b/i,
    searches: [
      'concert poster hastemplate:"PD-old-70"',
      'concert poster hastemplate:"PD-US-expired"',
      'opera poster hastemplate:"PD-old-70"',
      'music poster hastemplate:"PD-old-70"',
      'jazz poster hastemplate:"PD-US-expired"',
      'jazz poster hastemplate:"PD-US-no notice"',
      'affiche concert hastemplate:"PD-old-70"',
      'Konzert Plakat hastemplate:"PD-old-70"',
      'affiche opéra hastemplate:"PD-old-70"',
    ],
  },
  {
    name: "Teatër",
    prefix: "teater",
    limit: 300,
    title: /theat|teatr|th[ée]âtre|circus|cirque|cabaret|vaudeville|play|spectacle|revue/i,
    searches: [
      'theatre poster hastemplate:"PD-old-70"',
      'theater poster hastemplate:"PD-US-expired"',
      'circus poster hastemplate:"PD-US-expired"',
      'cabaret poster hastemplate:"PD-old-70"',
      'affiche théâtre hastemplate:"PD-old-70"',
      'affiche cirque hastemplate:"PD-old-70"',
      'Theaterplakat hastemplate:"PD-old-70"',
    ],
  },
  // Illustrated sheet music covers from before 1931 (PD-US-expired) or by
  // artists who died more than 70 years ago.
  {
    name: "Nota",
    prefix: "nota",
    limit: 1200,
    fileOnly: true,
    title: /sheet music|song|cover|march|waltz|valse|rag\b|ragtime|fox.?trot|one.?step|two.?step|blues|tango|noten|partition/i,
    searches: [
      'sheet music cover hastemplate:"PD-US-expired"',
      'sheet music hastemplate:"PD-US-expired"',
      'song sheet music hastemplate:"PD-US-expired"',
      'ragtime sheet music hastemplate:"PD-US-expired"',
      'fox trot sheet music hastemplate:"PD-US-expired"',
      'sheet music cover hastemplate:"PD-old-70"',
      'partition musicale hastemplate:"PD-old-70"',
    ],
  },
  // Travel and Belle Époque posters only take PD-old-70 files: most are
  // European, so the artist must have died more than 70 years ago.
  {
    name: "Udhëtim",
    prefix: "udhetim",
    limit: 600,
    fileOnly: true,
    title: /travel|railway|railways|rail\b|chemin de fer|tourism|touris|visit|line\b|cruise|ski|resort|reise|bahn|voyage|airways|riviera|steamship|plage|bains|winter|sport|kurort|côte|lloyd|cunard|express/i,
    searches: [
      'travel poster hastemplate:"PD-old-70"',
      'railway poster hastemplate:"PD-old-70"',
      'tourism poster hastemplate:"PD-old-70"',
      'affiche chemin de fer hastemplate:"PD-old-70"',
      'affiche tourisme hastemplate:"PD-old-70"',
      'Reiseplakat hastemplate:"PD-old-70"',
      'steamship poster hastemplate:"PD-old-70"',
    ],
  },
  {
    name: "Belle Époque",
    prefix: "belle-epoque",
    limit: 600,
    fileOnly: true,
    title: /affiche|plakat|poster|cartel|manifesto|lithograph/i,
    searches: [
      'Mucha poster hastemplate:"PD-old-70"',
      'Cheret affiche hastemplate:"PD-old-70"',
      'art nouveau poster hastemplate:"PD-old-70"',
      'Steinlen affiche hastemplate:"PD-old-70"',
      'Grasset affiche hastemplate:"PD-old-70"',
      'Cappiello affiche hastemplate:"PD-old-70"',
      'affiche hastemplate:"PD-old-70"',
      'Plakat hastemplate:"PD-old-70"',
    ],
  },
]

// Old posters include war propaganda, racist caricature and exploitation
// films; none of that goes in the shop.
// Characters that are still trademarks are left out too, and so are scans
// that are programmes, playbills or photos rather than posters.
const blocked =
  /minstrel|coon|darkey|darkie|nigger|sambo|mammy|blackface|pickaninny|savage|uncle tom|nazi|hitler|swastika|propaganda|recruit|enlist|war bonds?|liberty loan|\bhuns?\b|klan|kkk|birth of a nation|ingagi|teaserama|mom and dad|nude|naked|sex|strip|burlesque|reefer|marihuana|marijuana|cocaine|opium|mickey|disney|tarzan|popeye|superman|batman|zorro|lone ranger|lobby|still from|screenshot|title card|trailer|newspaper|advert|programme|program for|playbill|theaterzettel|recueil|documents iconographiques|puzzle|show card|exhibition|ausstellung|soviet|bolshevik|\bwwi*\b|ww[12]|trepkowski|white league|darktown|minnie|back cover|chink|chinee|\bjaps?\b|injun|squaw|hottentot|cannibal|kaiser|over there|\barmy\b|soldier|\bnavy\b|\btroops?\b|armiya|\barmy\b|arm[ée]e|\bparti\b|\bpartia\b|communist|kommun|proclamation|v[öo]lkerschau|dahomey|oubliez pas|obronie|praca dla|kalino|weg met|persil|\baudi\b|vache qui rit|pelikan|delhaize|picon|florio|projet d|gallica|wyzwol|stalingrad|wojna|robotnik|arbeid|piłsudski|pilsudski|colonial|africain|anticommun|[ée]lection|kodak|martell|pellegrino|asahi|red cross|\barmes\b|guerre|krieg|alcool tue|alkohol|hongert|trybuna|wolno|powt[oó]rzy|votate|elezioni|wahl|campari|cinzano|martini|michelin|peugeot|fiat\b|dunlop|coca|pepsi|nestl|perrier|woman passing|epreuve|variante|avant la lettre|sans lettre/i

async function api(params) {
  const url = new URL("https://commons.wikimedia.org/w/api.php")
  for (const [key, value] of Object.entries({ format: "json", ...params }))
    url.searchParams.set(key, String(value))
  for (let attempt = 0; attempt < 7; attempt++) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(60000) })
      if (response.ok) return await response.json()
    } catch {
      // Timeouts and dropped connections are retried below.
    }
    // Commons rate-limits long runs; back off up to a minute between tries.
    await new Promise((resolve) => setTimeout(resolve, Math.min(60000, 5000 * 2 ** attempt)))
  }
  // A failed search stops the run rather than writing a shrunken catalog.
  throw new Error(`Commons API failed: ${url}`)
}

const stripHtml = (value = "") =>
  value.replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim()

function findYear(...values) {
  for (const value of values) {
    const match = stripHtml(value).match(/\b(18[5-9]\d|19\d\d)\b/)
    if (match) return Number(match[1])
  }
  return undefined
}

// "File:GrandHotelFilmPoster.jpg" → "Grand Hotel",
// "Yvette Guilbert Concert parisien... : [affiche] / …" → "Yvette Guilbert Concert parisien"
function cleanTitle(fileTitle, objectName, year) {
  let title = stripHtml(objectName) || fileTitle.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "")
  title = title
    .replace(/_/g, " ")
    // "Leopoldo Metlicovitz - Poster Grande Stagione" → "Grande Stagione"
    .replace(/^.+?\s+-\s+Poster\s+(.+)$/i, "$1")
    // "Affiche 'Cognac Jacquet', ca. 1910" → "Cognac Jacquet"
    .replace(/^(?:a?affiche\s+)?'([^']+)'.*$/i, "$1")
    .replace(/\s+(?:voor|van) stokerij\b.*$/i, "")
    // Sheet music: "Sheet music cover - APRIL SHOWERS", "Cover of the sheet
    // music for In a Monastery", "Carolina Moon sheet music (cover)"
    .replace(/^(?:front )?cover (?:of|to|for) the sheet music (?:for|to|of) /i, "")
    .replace(/^sheet music cover(?: to| for| of)?\s*[-–—:]?\s*/i, "")
    .replace(/\s*[-,(]*\s*\(?sheet music\b.*$/i, "")
    .replace(/\s*\(?cover(?: art)?\)?\s*$/i, "")
    .replace(/\bjpe?g\b/gi, "")
    .replace(/^"([^"]+)".*$/, "$1")
    .replace(/^(?:SM \d+|Art detail, from-)\s*/i, "")
    .replace(/\s*-?\s*(?:cover(?: page| \d)?|alternative|front)\s*$/i, "")
    .replace(/\s*label QS:.*$/i, "")
    .replace(/\s*(?::\s*)?\[affiche.*$/i, "")
    .replace(/\s*\.{3}.*$/, "")
    .replace(/(?:Film|Movie|Theatrical|Theatherical)?Poster\b/g, " poster")
    .replace(/(\w)poster\b/gi, "$1 poster")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-z])(\d{4})\b/gi, "$1 $2")
    .replace(/[_]+|(?<=\w)-{1,2}(?=\w)/g, " ")
    .replace(/\((?:[^)]*\b(?:poster|film|restor|crop|edit|version|window card)\b[^)]*)\)?/gi, "")
    .replace(/\b(?:theatrical |original |release |re-release )?(?:film |movie |theat(?:re|er) |concert |circus |one-sheet |half-sheet )?poster\b.*$/i, "")
    .replace(/^poster (?:for|of) /i, "")
    .replace(/\s*[-–—,:]?\s*\b(?:restoration|restored|crisco edit|cropped|re[- ]?issue|style [a-z]|window card|danish|english|swedish|french|german)\b.*$/i, "")
    .replace(/\(\d{4}\)/g, "")
    .replace(/\s+\bfilm\b\s*$/i, "")
    .replace(new RegExp(`\\(?\\b${year}\\b\\)?`), "")
    .replace(/^affiche(?: publicitaire)?(?: (?:du|de la|de l'|des|pour))?\s*[-–—:]?\s*/i, "")
    .replace(/\s+(?:-\s*)?(?:crop(?:ped)?|US|UK|theat(?:h)?erical)$/i, "")
    .replace(/\s+\b(?:18|19)\d\d$/, "")
    .replace(/^[\s,.;:–—-]+|[\s,.;:(–—-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
  // SHOUTED TITLES → Title Case
  if (title === title.toUpperCase())
    title = title.toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
  // Long archive descriptions: keep the first clause, cut on a word boundary.
  title = title.split(/[.;]\s/)[0]
  if (title.length > 48) title = title.slice(0, 48).replace(/\s+\S*$/, "")
  title = title
    .replace(/\s*\([^)]*$/, "")
    .replace(/[\s,.;:…–—-]+$/, "")
    .replace(/(?:,\s*ca|\s+(?:-\s*)?(?:crop(?:ped)?|US|UK|theat(?:h)?erical|publicity))$/i, "")
    .replace(/[\s,.;:…–—-]+$/, "")
  return title.charAt(0).toUpperCase() + title.slice(1)
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

async function candidates(query, wanted) {
  const found = []
  let offset = 0
  while (found.length < wanted && offset < 2000) {
    const data = await api({
      action: "query",
      generator: "search",
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: 6,
      gsrlimit: 50,
      gsroffset: offset,
      prop: "imageinfo",
      iiprop: "url|size|extmetadata",
      iiurlwidth: 843,
      iiextmetadatafilter: "LicenseShortName|Copyrighted|ObjectName|DateTimeOriginal|Artist",
    })
    const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index)
    found.push(...pages)
    if (!data.continue) break
    offset = data.continue.gsroffset
  }
  return found
}

// Hand-checked Internet Archive items marked public domain or CC0 by their
// uploaders. Uploader marks are often wrong, so only posters published before
// 1931 whose artists died more than 70 years ago are listed.
// API: https://archive.org/metadata/{identifier}
const archiveOrg = [
  ["metropolis-poster", "Kinema", "Metropolis", 1927, "Heinz Schulz-Neudamm"],
  ["sunrise-film-poster", "Kinema", "Sunrise", 1927, "Autor i panjohur"],
  ["wings-poster", "Kinema", "Wings", 1927, "Autor i panjohur"],
  ["the-battle-of-the-century-1927-film-poster", "Kinema", "The Battle of the Century", 1927, "Autor i panjohur"],
  ["phantom-of-the-opera-1925-poster", "Kinema", "The Phantom of the Opera", 1925, "Autor i panjohur"],
  ["lodger-film-poster", "Kinema", "The Lodger", 1927, "Autor i panjohur"],
  ["97475t", "Kinema", "Beyond the Rocks", 1922, "Autor i panjohur"],
  ["dinky-doodle-in-egypt-fbo-1926-one-sheet", "Kinema", "Dinky Doodle in Egypt", 1926, "Autor i panjohur"],
  ["sd-scouting-history-regular-scout-poster-1926", "Kinema", "A Regular Scout", 1926, "Autor i panjohur"],
  ["henri-brispot-cinematographe-lumiere-1896", "Kinema", "Cinématographe Lumière", 1896, "Henri Brispot"],
  ["king-of-jazz-1930-window-card", "Muzikë", "King of Jazz", 1930, "Autor i panjohur"],
  ["manuel-orazi-theatre-de-loie-fuller-lithograph-1900", "Teatër", "Théâtre de Loïe Fuller", 1900, "Manuel Orazi"],
  ["jules-cheret-reynauds-pantomimes-lumineuses-at-the-musee-grevin-1892", "Teatër", "Pantomimes Lumineuses", 1892, "Jules Chéret"],
  ["wesley-vaudeville-savoy-theatre-june-17-1911", "Teatër", "Wesley Vaudeville, Savoy Theatre", 1911, "H. B. Smith"],
  ["1930-royal-mail-to-south-america-travel-poster-by-kenneth-denton-shoesmith-alcantara", "Udhëtim", "Royal Mail to South America", 1930, "Kenneth Denton Shoesmith"],
  ["pliniocodognatopugliecasteldelmonte", "Udhëtim", "Puglie, Castel del Monte", 1925, "Plinio Codognato"],
  ["pliniocodognatomendoladelledolomiti", "Udhëtim", "Mendola delle Dolomiti", 1920, "Plinio Codognato"],
  ["pliniocodognatovinidilussocasalemonferrato", "Belle Époque", "Vini di Lusso, Casale Monferrato", 1920, "Plinio Codognato"],
  ["pliniocodognato1929internationmotorboatcompetition", "Belle Époque", "International Motorboat Competition", 1929, "Plinio Codognato"],
  ["pliniocodognatoolioamadeoegiribaldi", "Belle Époque", "Olio Amadeo e Giribaldi", 1925, "Plinio Codognato"],
  ["pliniocodognatodionis", "Belle Époque", "Dionis", 1920, "Plinio Codognato"],
  ["cycles-brilliant-1900-france-vintage-poster", "Belle Époque", "Cycles Brilliant", 1900, "Autor i panjohur"],
  ["spring-hop-beer-poster-ww1-1914-hungary", "Belle Époque", "Spring Hop Beer", 1914, "Autor i panjohur"],
]

async function archiveOrgImage(identifier) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`https://archive.org/metadata/${identifier}`, {
        headers,
        signal: AbortSignal.timeout(60000),
      })
      if (!response.ok) continue
      const { files = [], metadata = {} } = await response.json()
      if (!/publicdomain/i.test(metadata.licenseurl ?? "")) return undefined
      const image = files
        .filter(
          (file) =>
            file.source === "original" &&
            !file.name.startsWith("__ia_thumb") &&
            /\.(jpe?g|png)$/i.test(file.name) &&
            Number(file.size ?? 0) < 40_000_000,
        )
        .sort((a, b) => Number(b.size ?? 0) - Number(a.size ?? 0))[0]
      if (!image) return undefined
      return `https://archive.org/download/${identifier}/${encodeURIComponent(image.name)}`
    } catch {
      // Retried below.
    }
    await new Promise((resolve) => setTimeout(resolve, 3000 * (attempt + 1)))
  }
  return undefined
}

const picked = []
// Title key → picked poster, so a later, larger scan of the same poster wins.
const seenTitles = new Map()
const seenFiles = new Set()
for (const group of series) {
  let count = 0
  for (const query of group.searches) {
    if (count >= group.limit) break
    for (const page of await candidates(query, group.limit * 3)) {
      if (count >= group.limit) break
      const info = page.imageinfo?.[0]
      if (!info?.thumburl || seenFiles.has(page.title)) continue
      const meta = info.extmetadata ?? {}
      const licence = stripHtml(meta.LicenseShortName?.value)
      if (!/public domain/i.test(licence) || meta.Copyrighted?.value === "True") continue
      if (info.width < 700 || info.height < 900) continue
      const ratio = info.width / info.height
      if (ratio < 0.55 || ratio > 0.85) continue
      const year = findYear(meta.DateTimeOriginal?.value, meta.ObjectName?.value, page.title)
      if (!year || year > LATEST_YEAR) continue
      const raw = `${page.title} ${stripHtml(meta.ObjectName?.value)}`
      // Archive descriptions mention all sorts of words, so the stricter
      // series only look at the file name.
      if (blocked.test(raw) || !group.title.test(group.fileOnly ? page.title : raw)) continue
      const artist = stripHtml(meta.Artist?.value).slice(0, 80)
      let title = cleanTitle(page.title, meta.ObjectName?.value, year)
      // Some files are named after the artist, not the poster.
      if (artist && title.toLowerCase().startsWith(artist.toLowerCase()))
        title = title.slice(artist.length).replace(/^[\s,:–—-]+/, "")
      const key = title.toLowerCase().replace(/[^a-z0-9]/g, "")
      // Run-together file names ("Thecherokeeflash") can't be titled reliably.
      if (title.length < 5 || /^\S{13,}$/.test(title)) continue
      const earlier = seenTitles.get(key)
      if (earlier) {
        if (earlier.series === group.name && info.width > earlier.width) {
          Object.assign(earlier, {
            artist: artist || earlier.artist,
            source: info.descriptionurl,
            thumb: info.thumburl,
            width: info.width,
          })
          seenFiles.add(page.title)
        }
        continue
      }
      seenFiles.add(page.title)
      let slug = `${group.prefix}-${slugify(title)}`
      if (picked.some((item) => item.slug === slug)) slug += `-${year}`
      if (picked.some((item) => item.slug === slug)) continue
      const poster = {
        slug,
        series: group.name,
        title,
        year,
        artist: artist || "Autor i panjohur",
        source: info.descriptionurl,
        thumb: info.thumburl,
        width: info.width,
      }
      picked.push(poster)
      seenTitles.set(key, poster)
      count++
    }
  }
  console.log(`${group.name}: ${count}`)
}

for (const [identifier, seriesName, title, year, artist] of archiveOrg) {
  const key = title.toLowerCase().replace(/[^a-z0-9]/g, "")
  if (seenTitles.has(key)) continue
  const thumb = await archiveOrgImage(identifier)
  if (!thumb) {
    console.warn(`skip archive.org ${identifier}: no public-domain image`)
    continue
  }
  const group = series.find((item) => item.name === seriesName)
  let width = 0
  for (let attempt = 0; attempt < 3 && !width; attempt++) {
    try {
      width = Number(
        execFileSync("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries", "stream=width", "-of", "csv=p=0", thumb])
          .toString()
          .trim(),
      )
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3000 * (attempt + 1)))
    }
  }
  if (!width) {
    console.warn(`skip archive.org ${identifier}: image unavailable`)
    continue
  }
  const poster = {
    slug: `${group.prefix}-${slugify(title)}`,
    series: seriesName,
    title,
    year,
    artist,
    source: `https://archive.org/details/${identifier}`,
    thumb,
    width,
  }
  picked.push(poster)
  seenTitles.set(key, poster)
}

// `--dry-run` lists the selection without downloading anything.
if (process.argv.includes("--dry-run")) {
  for (const poster of picked)
    console.log(`${poster.series.padEnd(7)} ${poster.year} ${poster.title}`)
  process.exit(0)
}

const outDir = path.resolve("public/media/collections/archive")
const sourcesFile = path.resolve("docs/archive-poster-sources.json")
const previousSources = new Map(
  existsSync(sourcesFile)
    ? JSON.parse(await readFile(sourcesFile, "utf8")).map((item) => [item.slug, item.source])
    : [],
)
const dataFile = path.resolve("src/data/archive-posters.ts")
await mkdir(outDir, { recursive: true })
const work = await mkdtemp(path.join(tmpdir(), "cube-archive-"))
const written = []
try {
  for (const poster of picked) {
    const { thumb: _thumb, ...entry } = poster
    // Images from an earlier run are kept while their source is unchanged;
    // delete one to fetch it again.
    if (
      existsSync(path.join(outDir, `${poster.slug}.webp`)) &&
      previousSources.get(poster.slug) === poster.source
    ) {
      written.push(entry)
      continue
    }
    const source = path.join(work, `${poster.slug}.img`)
    try {
      const response = await fetch(poster.thumb, { headers, signal: AbortSignal.timeout(60000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      await writeFile(source, Buffer.from(await response.arrayBuffer()))
    } catch (error) {
      console.warn(`\nskip ${poster.slug}: ${error.message}`)
      continue
    }
    const framed = path.join(work, `${poster.slug}.png`)
    try {
      // Framed on the shop's grey card like the other posters.
      execFileSync("ffmpeg", [
        "-loglevel", "error", "-y", "-i", source, "-frames:v", "1", "-vf",
        [
          "scale=w=760:h=940:force_original_aspect_ratio=decrease",
          "pad=iw+28:ih+28:14:14:white",
          "pad=iw+24:ih+24:12:12:0x242525",
          "pad=1200:1350:(ow-iw)/2:(oh-ih)/2:0xeeeef0",
        ].join(","),
        framed,
      ])
      execFileSync("cwebp", ["-quiet", "-q", "76", framed, "-o", path.join(outDir, `${poster.slug}.webp`)])
    } catch {
      console.warn(`\nskip ${poster.slug}: could not convert`)
      continue
    }
    written.push(entry)
    process.stdout.write(".")
    // Be polite to upload.wikimedia.org.
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
} finally {
  await rm(work, { recursive: true, force: true })
}

const keep = new Set(written.map((poster) => `${poster.slug}.webp`))
for (const file of await readdir(outDir))
  if (!keep.has(file)) await rm(path.join(outDir, file))

// The shop bundle only needs what it shows; credits and source pages for each
// file go to docs/ so they stay on record without weighing down the page.
await writeFile(dataFile, formatArchiveData(written, LATEST_YEAR))
await writeFile(
  sourcesFile,
  `${JSON.stringify(
    written.map(({ slug, artist, source }) => ({ slug, artist, source })),
    null,
    2,
  )}\n`,
)
console.log(`\n${written.length} posters → ${path.relative(process.cwd(), dataFile)}`)
