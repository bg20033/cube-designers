# CUBE launch collection

The seven new products are a proposed launch collection with indicative prices, not verified inventory. Replace their specifications and prices in the admin before accepting production orders. Posters are sold without frames in proposed 30 × 40 cm (€25) and 50 × 70 cm (€35) formats; shirt sizes XS–XXL can be selected in the product page or quick view. Lamp specifications require studio confirmation. Checkout creates an order request; no payment is taken online.

The original print catalog remains available. `/shop` and product routes are enabled, prerendered and included in the generated sitemap. A database-managed catalog takes precedence over the static catalog, as before; when an existing database already has products, use the admin’s “Shto produktet e koleksionit që mungojnë” button to import missing entries without overwriting existing products. A deliberately inactive catalog stays empty.

## Visual assets

- Smart Glass at `/shop/smart-glass` reuses the existing `blanks/smart-film.mp4` demo and `blanks/smart-film-off.webp` scene. `blanks/smart-glass-clear.webp` is the frame at 4.8 seconds of that same video, encoded as WebP for the two-state preview. The original product ID and media filenames stay unchanged for existing links and saved orders; its public name is Smart Glass.

- `public/media/collections/studio-scene.jpg`: generated with the built-in `image_gen` tool, then saved as a compressed JPEG in the workspace. The shop serves WebP copies of it (`studio-scene-1536.webp`, `studio-scene-768.webp`, made with `cwebp -q 78`/`-q 75`).
- `public/media/collections/museum/*.webp` and `src/data/museum-posters.ts`: public-domain (CC0) works from the Art Institute of Chicago API in three series (Vintage posters, Japoni woodblock prints, Klasike paintings), framed by `npm run media:posters` (`scripts/fetch-museum-posters.mjs`, needs ffmpeg and cwebp). The script searches the API, keeps only works marked `is_public_domain`, skips studies, sketches and wartime propaganda, and replaces the previous selection. Edit the `series` list in the script to change it. The shop images are 843px web copies; download full-resolution files for printing from `https://www.artic.edu/artworks/<aicId>`.
- `public/media/collections/archive/*.webp` and `src/data/archive-posters.ts`: public-domain film (Kinema), music (Muzikë), theatre/circus (Teatër), travel (Udhëtim) and Belle Époque posters plus illustrated sheet music covers (Nota), framed by `npm run media:archive` (`scripts/fetch-commons-posters.mjs`; add `-- --dry-run` to preview the picks). Images from earlier runs are reused; delete a WebP to fetch it again.
  - Wikimedia Commons: a file is kept only when Commons tags it with a public-domain template, its licence metadata says public domain, it was published before 1956 and the scan is at least 700×900 px. Film posters use the `PD-US-*` templates (US works, public domain in the EU under the rule of the shorter term); travel and Belle Époque posters, which are mostly European, use only `PD-old-70` (artist died more than 70 years ago).
  - Internet Archive (archive.org): most "public domain" marks there are set by uploaders and are often wrong (recent Marvel and Pokémon posters carry them), so only a hand-checked list in the script is used: pre-1931 posters by artists who died more than 70 years ago, with no live brands.
  - The script skips programmes and playbills, war and political propaganda, racist caricature, exploitation films, characters that are still trademarks (Mickey Mouse, Tarzan, etc.) and adverts for brands that still trade (Campari, Fiat, Michelin, etc.).
  - Artist and source page for every slug are in `docs/archive-poster-sources.json`. The shop images are 843px web copies; download full-resolution files from the source page for printing.
- `public/media/collections/poster-{blue,orange,mono}.svg`: original vector art and framed product concepts.
- `public/media/collections/blanks/*.webp`: unbranded product photos (clothing, lamps, promo, print, signage and packaging), generated with Higgsfield (`gpt_image_2_5`) on one light grey background and saved with `cwebp -q 80 -resize 900 0`. Clothing (category Veshje) is priced per piece with sizes XS–XXL; lamps are Custom and confirmed before ordering. `smart-film.mp4` is a FLUX 3 Video clip (start frame `smart-film-off`, end frame the clear scene) played forward then reversed with ffmpeg, so it loops off → on → off; a product's `video` shows first on its page under "Si funksionon".
- `public/media/collections/film-*.svg` and `poster-film-*.svg`: original posters for fictional films (Mesnatë, Vera e Fundit, Sharri, Dashuri 35mm, Autostrada, Kthimi), as bare artwork for the shop's film wall and as framed product shots. They do not reproduce any real film poster, title or logo; keep it that way, because real film posters cannot be resold without a licence.

Posters carry an optional `series` ("Art", "Film", "Vintage", "Japoni", "Klasike", "Kinema", "Muzikë", "Teatër", "Udhëtim", "Belle Époque", "Nota"), shown as a sub-filter under Postera. The shop's "Krejt" view shows only Postera, Paketa, Veshje and Llampa; the business print catalog sits under "Për biznese" (`?category=Biznes`).

All collection imagery is illustrative. The site explicitly labels the collection as a concept and the prices as indicative.

## Image generation prompt

Use case: product-mockup. Create one premium photorealistic wide landscape editorial photograph for CUBE, a Kosovo design studio launching art posters and lamps. Aspect ratio 3:2. A quiet architectural gallery corner: warm pale grey plaster wall, pale natural oak low bench, three large thin black oak framed graphic art prints casually leaning against the wall, small sculptural off-white mushroom table lamp on far right turned on. Main central print has cobalt blue rectangular background and abstract bold cream paper-cut geometric circular shapes; left smaller frame has vivid burnt-orange sun and black minimalist concentric arch on warm white paper; right smaller frame has monochrome geometric circular study. No words or typography anywhere, no logos, no website UI. Restrained beautiful styling, excellent realistic matte paper texture, subtle glass reflection, afternoon sunlight from left casts long soft diagonal shadows, very high end design magazine photography. Camera front facing with slight depth, all artwork entirely in frame with generous neutral negative space at top, art and objects concentrated lower two thirds. Natural accurate materials, soft tactile physical shadows, gallery-quality composition. No plants, no people, no books, no clutter, no watermarks. This is a design concept visualization, not an existing product photo.

## Film wall spotlight

`archiveSpotlight` in `src/data/products.ts` lists the well-known films that
lead the default shop grid; the first six hang on the film wall. Their wall
images in `public/media/collections/film-wall/` are the archive WebPs with the
grey canvas cropped off (ffmpeg `negate,cropdetect`, scaled to 400px wide).

## Print sizes and bundles

Posters come in A6, A5, A4, A3, 30 × 40 cm, A2 and 50 × 70 cm, from
`posterSizes` in
`src/data/products.ts`. Archive posters only get the sizes their original scan
can carry at roughly 100 dpi (`width` in `src/data/archive-posters.ts`: 350 px
for A6, 520 for A5, 800 for A4, 1100 for A3 and 30 × 40, 1550 for A2, 1900
for 50 × 70);
smaller scans stay out of the shop. A variant's `minQuantity` is enforced in
the cart, by the order API and by the admin product parser.

Bundles (`src/data/bundles.ts`, category "Paketa") sell three posters at
`BUNDLE_PRICES` (A4 15, A3 23, 30 × 40 28, A2 39, 50 × 70 52 €) in the sizes all three
support. Gallery sets
(`sizes` in a definition, one paper size per poster) sell 4 to 30 posters at a
fixed composition, e.g. 12 × A3 or 1 × A2 + 4 × A3 + 6 × A4, for 75% of the
singles (70% from 20 posters; "Mega set"), rounded to a price ending in 9. A
set's only variant is `set`; `includeVariants` on the product carries each
poster's size to the cart, the wall planner, the order line and the print
command. Their images
are built by `npm run media:bundles` (`scripts/build-bundle-images.mjs`; pass
part of an id to rebuild only those), as a to-scale mosaic for sets. `src/data/bundles.test.ts` checks every
bundle end to end: distinct posters that exist and come in the bundle's
sizes, prices below the singles and the saving the description states,
artists named in a title or tagline, the cart, the order line, the print
command, a tidy layout on an empty wall that adds back up to the bundle, and
that the scripts parse `bundles.ts` the same way. Order
lines for bundles keep the posters they include.

Print files for an order: `npm run print` (`scripts/print-files.mjs`). The
admin order view shows the exact command; the step-by-step guide is
`docs/printimi.md`.

## Wall planner

`/shop/muri` (`src/components/shop/WallPlannerPage.tsx`, geometry in
`wall-layout.ts`) lets a visitor put up to 30 posters on a wall of real size
(150–600 × 220–350 cm), pick each poster's size (A5 to 50 × 70; A6 is left out
because it sells four at a time), a frame style that is only a preview, wall
colour and a 210 cm sofa for scale. Posters snap to the wall centre and to each
other's edges; Galeri / Qendër / Rresht / Rrjetë arrange them in their current
sizes on one centre line. "Provo" (`compose` in `wall-layout.ts`) picks a
random composition with new sizes (centre, frame, grid, brick, top or bottom
line, salon, rhythm, columns, stairs), a random lead print and order, never
repeating the result on the wall; walls with many prints may use more of the
wall so they do not all shrink to A5. "Ri-rregullo" (`rearrange`) moves the
same prints into another shape without changing any size (gallery with the
largest in the middle or at the ends, centre, frame, rows, rhythm, grid and
brick for same-size prints, even stacks, stairs). Each shape orders the
prints by size, so rows are symmetric and similar prints pair up; a shape
counts only if it fits inside the wall's margins above the sofa, and never
repeats the last one. With the sofa shown, blocks hang about 20 cm above
it. The wall is kept in local storage, can be shared as a `?muri=` link,
downloaded as a PNG, and added to the cart in one go. Product pages link to it
with `?add=<poster or bundle id>`.

Prints always keep at least 4 cm between them (`MIN_GAP`): a new print goes
into the free spot nearest the others without moving them (`addToWall`), a
dragged print slides along a neighbour instead of covering it
(`nearestFree`), and a print that grows pushes its neighbours aside
(`settle`).

A selected print has corner handles: dragging one keeps the opposite corner in
place and snaps the print to the nearest standard size (`resizeFromCorner`);
`+` / `−` step one size up or down. Poster search in the planner and the shop
uses multi-select filters (`src/components/store/poster-filters.ts`: series,
decade from the poster's year, and large sizes it can be printed in), kept in
the shop URL as `?seria=Kinema,Muzikë&dekada=1930&madhesia=a2`.

The cart drawer's "Shiko si duken në mur" opens `?shporta=1`, which puts the
cart's posters, photos and bundles (expanded to their posters; A6 cards stay
out) on the wall. Saving that wall replaces those cart lines rather than
adding them again. A full set of a bundle's posters in one paper size is priced
as the bundle in the wall summary.

The planner cuts the poster out of each shop mockup in the browser (the area
inside the dark frame), so it works with any product image that follows the
framed-mockup layout.

## Finishes

Every poster size comes in finishes (`printFinishes` in `src/data/products.ts`):
Letër mat (all sizes), Pleksiglas (A5 and up), Kanavacë (A4 and up), and
black, white or oak frames (A5 and up), each priced per size.

| € | A6 | A5 | A4 | A3 | 30×40 | A2 | 50×70 |
|---|---|---|---|---|---|---|---|
| Letër mat | 2 (min. 4) | 3 | 6 | 9 | 11 | 15 | 20 |
| Pleksiglas | – | 5 | 10 | 15 | 18 | 25 | 35 |
| Kanavacë | – | – | 13 | 19 | 23 | 32 | 45 |
| Kornizë e zezë / e bardhë | – | 9 | 15 | 21 | 25 | 33 | 45 |
| Kornizë lisi | – | 11 | 18 | 24 | 28 | 37 | 49 | Paper keeps the bare size as its
variant id (`30x40`); other finishes are `<size>-<finish>` (`50x70-pleksi`), so
carts and orders from before finishes still resolve. Product pages pick size
and finish with `SizeFinishPicker`, which shows the print to scale over a 210
cm sofa; `PrintSurface` draws each finish the same way there, in the wall
planner and on the photo page.

After a deploy, the dashboard's **Përditëso madhësitë & materialet** copies
variants and prices from the code into products already in the database
(names, texts and images edited there are kept).

## Customer photo prints

`/shop/foto` (`PhotoPrintPage.tsx`) and the wall planner's "Ngarko foton tënde"
upload a customer's photo straight from the browser to Vercel Blob
(`api/uploads.ts` issues the tokens): the original goes in as a **private**
blob under `foto/original/`, plus a 1600 px JPEG working copy as a public blob
under `foto/web/` (random, unguessable name) for previews. The customer crops
it to the print's shape, picks portrait or landscape, size and finish, and sees
the print quality in dpi. Cart lines and orders carry the crop
(`PhotoSpec`); `sanitizePhoto` only accepts URLs from a Vercel Blob store under
`/foto/`, and the order API refuses photo products without a photo.

Setup: create a Blob store in the Vercel project (Storage → Create → Blob). That
adds `BLOB_READ_WRITE_TOKEN`; without it `/api/uploads` answers 503 and the page
offers a preview only. The admin downloads originals through
`/api/admin/photo`, and `npm run print` renders photos from them.
