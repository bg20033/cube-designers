# Si e printon një porosi

Fotot që shihen në shop janë kopje të vogla për web (843 px, me kornizë të
vizatuar). **Mos i printo ato.** Për print përdoret gjithmonë origjinali, dhe
skripta më poshtë ta përgatit vetë.

## 1. Merre komandën nga admini

`/admin` → **Porositë** → hape porosinë. Poshtë tabelës së produkteve është
**Skedarët për print**, p.sh.:

```
npm run print -- kinema-gilda:50x70 paketa-horror-klasik:a4 --out CUBE-482913
```

Shtyp **Kopjo komandën**.

## 2. Ekzekutoje në terminal

Në folderin e projektit (`cube-designers`), ngjite komandën dhe shtyp Enter.
Skedarët dalin te `print/CUBE-482913/`:

- një **JPG** dhe një **PDF** për çdo print (paketat ndahen vetë në 3 postera)
- 300 dpi, në madhësinë e porositur, me **3 mm bleed** dhe buzë të bardhë
  (8 mm; te A5 dhe A6 pak më e ngushtë)
- `kinema-gilda-50x70-pleksi.pdf` = posteri, formati, materiali
- fotot e klientëve dalin si `foto-1-…`, `foto-2-…` sipas radhës në porosi

Sasinë (× 2, × 3) e printon sipas tabelës në admin. Skedari bëhet vetëm një
herë. A6 porositet gjithmonë së paku 4 copë.

## 3. Dërgoja printerit

Dërgoja PDF-të shtypshkronjës (ose printoji vetë) në:

| Formati | Madhësia e prerjes | Me bleed |
|---|---|---|
| A6 | 10,5 × 14,8 cm | 11,1 × 15,4 cm |
| A5 | 14,8 × 21 cm | 15,4 × 21,6 cm |
| A4 | 21 × 29,7 cm | 21,6 × 30,3 cm |
| A3 | 29,7 × 42 cm | 30,3 × 42,6 cm |
| 30x40 | 30 × 40 cm | 30,6 × 40,6 cm |
| A2 | 42 × 59,4 cm | 42,6 × 60 cm |
| 50x70 | 50 × 70 cm | 50,6 × 70,6 cm |

Letra: mat 250 g/m² (si në përshkrimin e produktit).

## Materialet

| Materiali | Skedari | Çka i dërgon printerit |
|---|---|---|
| Letër mat | buzë e bardhë + 3 mm bleed | print në letër mat 250 g/m² |
| Pleksiglas | foto: deri në skaj + 3 mm bleed | print pas akrilikut 4 mm, me mbajtëse muri |
| Kanavacë | **+3 cm anash** për mbështjellje (te fotot buzët pasqyrohen) | kanavacë e shtrirë në kornizë druri 2 cm |
| Kornizë e zezë / e bardhë / lisi | si letra | printi në letër, futet në kornizë me xham akrilik |

## Fotot e klientëve

Te porosia në admin, fotoja ka thumbnail dhe linkun **Shkarko origjinalin**.
Komanda e printit e përfshin vetë (`'foto@50x70-kanavace@…'`), me prerjen dhe
orientimin që zgjodhi klienti. Që skripta t’i marrë origjinalet private, në
`.env.local` duhet `BLOB_READ_WRITE_TOKEN` (Vercel → Storage → Blob → `.env.local`).
Nëse e ke shkarkuar origjinalin me dorë, në vend të linkut mund të shkruash
rrugën e skedarit lokal.

## Kur skripta jep paralajmërim

- **`⚠ origjinali është vetëm ~90 dpi`**: skanimi origjinal është i vogël për
  këtë madhësi. Shop-i i shet vetëm madhësitë që një skanim i mban (rreth 100
  dpi e më shumë), por kontrolloje PDF-in me sy para printimit. Nëse të duket
  i butë, propozoja klientit një madhësi më të vogël.
- **Postera nga Art Institute of Chicago** (seritë Vintage, Japoni, Klasike):
  API-ja e tyre jep vetëm 843 px. Hape linkun që të jep skripta, shtyp
  **Download**, dhe ruaje fajllin si `print/sources/<produkti>.jpg` (p.sh.
  `print/sources/japoni-under-the-wave-off-kanagawa.jpg`). Pastaj ekzekutoje
  komandën prapë.
- **Ke një skanim më të mirë** për cilindo poster? Vendose te
  `print/sources/<produkti>.jpg` (ose .png/.tif). Skripta e përdor atë para
  çdo burimi tjetër.

## Nga vijnë origjinalet

| Seria | Burimi |
|---|---|
| Kinema, Muzikë, Teatër, Nota, Udhëtim, Belle Époque | Wikimedia Commons / Internet Archive, linku për secilin te `docs/archive-poster-sources.json` |
| Vintage, Japoni, Klasike | Art Institute of Chicago (shkarkim manual, shih më lart) |
| Art, Film (CUBE) | SVG-të e studios, vektor, në çdo madhësi pa humbje |

## Pas deploy-it

Nëse produktet në admin janë importuar në databazë, shop-i online i lexon
vetëm prej andej. Pas çdo deploy që shton postera, paketa ose madhësi/materiale:
`/admin` → **Produktet** → **Shto produktet e koleksionit që mungojnë** (edhe
"Foto jote" hyn kështu), pastaj **Përditëso madhësitë & materialet**. Ndryshe
posterat e rinj nuk duken dhe porositë për ta refuzohen.

Duhen: Node, `ffmpeg` dhe `sips` (macOS), dhe Chromium i Playwright-it
(`npx playwright install chromium` nëse mungon). `print/` nuk shkon në git.
