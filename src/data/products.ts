// Static product catalog. Kept dependency-free so the API functions can import it.
import { archivePosters } from "./archive-posters.js"
import { BUNDLE_PRICES, setDiscount, bundleDefinitions } from "./bundles.js"
import { museumPosters, type MuseumPoster } from "./museum-posters.js"

export type ProductCategory =
  | "Postera"
  | "Paketa"
  | "Foto"
  | "Veshje"
  | "Llampa"
  | "Print"
  | "Promo"
  | "Textile"
  | "Packaging"
  | "Signage"
  | "Smart glass"

export type ProductionSpeed = "Fast" | "Standard" | "Custom"

export type ProductVariant = {
  id: string
  label: string
  price?: number
  // Smallest order for this option, e.g. A6 cards are sold four at a time.
  minQuantity?: number
}

export type Product = {
  id: string
  number: string
  name: string
  category: ProductCategory
  price: number
  quantityLabel: string
  description: string
  tone: "orange" | "violet" | "acid" | "paper"
  production: ProductionSpeed
  material: string
  badge?: "Bestseller" | "New" | "Eco"
  featured?: boolean
  image?: string
  // Poster sub-collection shown as a secondary filter, e.g. "Film" or "Art".
  series?: string
  variantLabel?: string
  defaultVariantId?: string
  variants?: ProductVariant[]
  // Bundles: the product ids sold together, each printed in the chosen size.
  includes?: string[]
  // Gallery sets: the variant each included poster is printed in.
  includeVariants?: string[]
  // The customer supplies the image (photo prints).
  customImage?: boolean
  // A short looping clip of the product at work, with its first frame.
  video?: { src: string; poster: string }
}

// Part of the uploaded image to print, as fractions of its width and height.
export type PhotoCrop = { x: number; y: number; w: number; h: number }

// A customer photo: `image` is the public 1600 px working copy shown in the
// browser, `original` the private full-resolution upload used for printing.
export type PhotoSpec = {
  image: string
  original: string
  crop: PhotoCrop
  landscape?: boolean
  name?: string
}

export type CartItem = {
  variantId?: string
  productId: string
  quantity: number
  photo?: PhotoSpec
}

export const productCategories: ProductCategory[] = [
  "Postera",
  "Paketa",
  "Foto",
  "Veshje",
  "Llampa",
  "Print",
  "Promo",
  "Textile",
  "Packaging",
  "Signage",
  "Smart glass",
]

// Print sizes, small to large. `cm` is width × height in portrait. Archive
// scans are only sold in the sizes their resolution can carry: `minWidth` is
// the original width in px for ~100 dpi or better.
export const printSizes: {
  id: string
  label: string
  price: number
  cm: [number, number]
  minWidth: number
  minQuantity?: number
}[] = [
  {
    id: "a6",
    label: "A6 · 10,5 × 14,8 cm",
    price: 2,
    cm: [10.5, 14.8],
    minWidth: 350,
    minQuantity: 4,
  },
  {
    id: "a5",
    label: "A5 · 14,8 × 21 cm",
    price: 3,
    cm: [14.8, 21],
    minWidth: 520,
  },
  {
    id: "a4",
    label: "A4 · 21 × 29,7 cm",
    price: 6,
    cm: [21, 29.7],
    minWidth: 800,
  },
  {
    id: "a3",
    label: "A3 · 29,7 × 42 cm",
    price: 9,
    cm: [29.7, 42],
    minWidth: 1100,
  },
  { id: "30x40", label: "30 × 40 cm", price: 11, cm: [30, 40], minWidth: 1100 },
  {
    id: "a2",
    label: "A2 · 42 × 59,4 cm",
    price: 15,
    cm: [42, 59.4],
    minWidth: 1550,
  },
  { id: "50x70", label: "50 × 70 cm", price: 20, cm: [50, 70], minWidth: 1900 },
]
// Posters use only the four ISO formats; photo prints retain their own sizes.
export const posterSizes = printSizes.filter((size) =>
  ["a5", "a4", "a3", "a2"].includes(size.id),
)

export const CUSTOM_PRINT_LIMITS = {
  min: 10,
  max: 70,
  maxShortSide: 50,
} as const

// Custom ids encode millimetres in portrait order. Landscape remains the
// photo's existing orientation flag, so every consumer sees the same size.
export function customSizeId(width: number, height: number) {
  if (
    ![width, height].every(
      (value) =>
        Number.isFinite(value) &&
        value >= CUSTOM_PRINT_LIMITS.min &&
        value <= CUSTOM_PRINT_LIMITS.max &&
        Math.abs(value * 10 - Math.round(value * 10)) < 0.00001,
    )
  )
    return undefined
  const [short, long] = [width, height].sort((a, b) => a - b)
  if (short > CUSTOM_PRINT_LIMITS.maxShortSide) return undefined
  return `custom${Math.round(short * 10)}x${Math.round(long * 10)}`
}

export function getPosterSize(
  id?: string,
): (typeof posterSizes)[number] | undefined {
  const standard = printSizes.find((size) => size.id === id)
  if (standard) return standard
  const match = /^custom(\d{3})x(\d{3})$/.exec(id ?? "")
  if (!match) return undefined
  const width = Number(match[1]) / 10,
    height = Number(match[2]) / 10
  if (customSizeId(width, height) !== id || width > height) return undefined
  return {
    id: id!,
    label: `${String(width).replace(".", ",")} × ${String(height).replace(".", ",")} cm · Custom`,
    cm: [width, height],
    price: Math.min(
      ...printSizes
        .filter(
          (size) =>
            (size.minQuantity ?? 1) === 1 &&
            size.cm[0] >= width &&
            size.cm[1] >= height,
        )
        .map((size) => size.price),
    ),
    minWidth: Math.ceil((width / 2.54) * 100),
  }
}

// What a print is made on, with its price per size. Paper keeps the bare size
// id as its variant id (so carts and orders from before finishes existed still
// resolve); every other finish is "<size>-<finish>", e.g. "50x70-pleksi".
export const printFinishes: {
  id: string
  label: string
  description: string
  prices: Record<string, number>
  frame?: "black" | "white" | "oak"
}[] = [
  {
    id: "leter",
    label: "Letër mat",
    description:
      "Letër mat 250 g/m², pa kornizë. E gatshme për kornizën tënde.",
    prices: Object.fromEntries(
      printSizes.map((size) => [size.id, size.price]),
    ),
  },
  {
    id: "pleksi",
    label: "Pleksiglas",
    description:
      "Printuar pas akrilikut 4 mm. Shkëlqen si xham dhe varet me mbajtëse të fshehura.",
    prices: { a5: 5, a4: 10, a3: 15, "30x40": 18, a2: 25, "50x70": 35 },
  },
  {
    id: "kanavace",
    label: "Kanavacë",
    description:
      "Pëlhurë e shtrirë në kornizë druri 2 cm; printi mbështillet edhe anash.",
    prices: { a4: 13, a3: 19, "30x40": 23, a2: 32, "50x70": 45 },
  },
  {
    id: "kornize-zeze",
    label: "Kornizë e zezë",
    description: "Kornizë e hollë e zezë me xham akrilik, gati për varje.",
    prices: { a5: 9, a4: 15, a3: 21, "30x40": 25, a2: 33, "50x70": 45 },
    frame: "black",
  },
  {
    id: "kornize-bardhe",
    label: "Kornizë e bardhë",
    description: "Kornizë e hollë e bardhë me xham akrilik, gati për varje.",
    prices: { a5: 9, a4: 15, a3: 21, "30x40": 25, a2: 33, "50x70": 45 },
    frame: "white",
  },
  {
    id: "kornize-lisi",
    label: "Kornizë lisi",
    description: "Kornizë druri lisi natyral me xham akrilik, gati për varje.",
    prices: { a5: 11, a4: 18, a3: 24, "30x40": 28, a2: 37, "50x70": 49 },
    frame: "oak",
  },
]
export const getFinish = (id?: string) =>
  printFinishes.find((finish) => finish.id === id)
export const variantIdFor = (size: string, finish: string) =>
  finish === "leter" ? size : `${size}-${finish}`

// "50x70-kornize-zeze" → { size: "50x70", finish: "kornize-zeze" }.
export function parseVariantId(id?: string) {
  if (!id) return undefined
  const dash = id.indexOf("-")
  const size = dash < 0 ? id : id.slice(0, dash)
  const finish = dash < 0 ? "leter" : id.slice(dash + 1)
  return getPosterSize(size) && getFinish(finish) ? { size, finish } : undefined
}

// Every finish in every given size it is offered in. Posters with the same
// sizes share one array: the catalog has ~2,000 posters but a few size sets.
const variantCache = new Map<string, ProductVariant[]>()
function printVariants(sizeIds: string[]): ProductVariant[] {
  const key = sizeIds.join(",")
  if (!variantCache.has(key)) variantCache.set(key, buildPrintVariants(sizeIds))
  return variantCache.get(key)!
}
function buildPrintVariants(sizeIds: string[]): ProductVariant[] {
  return printFinishes.flatMap((finish) =>
    sizeIds
      .filter((sizeId) => sizeId in finish.prices)
      .map((sizeId) => {
        const size = getPosterSize(sizeId)!
        return {
          id: variantIdFor(sizeId, finish.id),
          label:
            finish.id === "leter"
              ? size.label
              : `${size.label} · ${finish.label}`,
          price: finish.prices[sizeId],
          ...(finish.id === "leter" && size.minQuantity
            ? { minQuantity: size.minQuantity }
            : {}),
        }
      }),
  )
}
const posterVariants = printVariants(posterSizes.map((size) => size.id))
// What a poster costs in the size it opens with.
const PAPER_A3 = getPosterSize("a3")!.price
// Archive posters open in A4 when their resolution supports it.
const defaultSize = (variants: ProductVariant[]) =>
  ["a4", "a5"]
    .map((id) => variants.find((variant) => variant.id === id))
    .find(Boolean) ?? variants[0]
const shirtVariants: ProductVariant[] = ["XS", "S", "M", "L", "XL", "XXL"].map(
  (size) => ({ id: size.toLowerCase(), label: size }),
)

// Public-domain posters (CC0, Art Institute of Chicago), framed like the rest.
const featuredMuseumPosters = new Set([
  "japoni-under-the-wave-off-kanagawa",
  "klasike-a-sunday-on-la-grande-jatte-1884",
  "klasike-paris-street-rainy-day",
  "klasike-water-lilies",
  "vintage-zodiaque",
  "vintage-moulin-rouge-la-goulue",
])
const museumDescriptions: Record<string, (poster: MuseumPoster) => string> = {
  Vintage: (poster) => `Poster origjinal nga ${poster.artist}, ${poster.date}.`,
  Japoni: (poster) =>
    `Print japonez në dru (ukiyo-e) nga ${poster.artist}, ${poster.date}.`,
}
const museumProducts = museumPosters.map((poster, index): Product => ({
  id: poster.slug,
  series: poster.series,
  variantLabel: "Formati",
  defaultVariantId: "a3",
  variants: posterVariants,
  number: String(15 + index).padStart(2, "0"),
  name: poster.title,
  category: "Postera",
  price: PAPER_A3,
  quantityLabel: "A3 · 29,7 × 42 cm · pa kornizë",
  description: `${
    museumDescriptions[poster.series]?.(poster) ??
    `${poster.artist}, ${poster.date}.`
  } Ristampë e një vepre në domen publik (CC0) nga Art Institute of Chicago.`,
  tone: "paper",
  production: "Standard",
  material: "Letër mat 250 g/m²",
  ...(featuredMuseumPosters.has(poster.slug) ? { featured: true } : {}),
  image: `/media/collections/museum/${poster.slug}.webp`,
}))

// Public-domain film, music and theatre posters from Wikimedia Commons.
const archiveKinds: Record<string, string> = {
  Kinema: "Poster filmi",
  Muzikë: "Poster koncerti",
  Teatër: "Poster teatri dhe cirku",
  Udhëtim: "Poster udhëtimi",
  Nota: "Kopertinë notash muzikore",
  "Belle Époque": "Poster Belle Époque",
}
// Well-known films lead the catalog and the film wall so the archive is
// visible without opening the Kinema filter.
export const archiveSpotlight = [
  "kinema-dracula",
  "kinema-king-kong",
  "kinema-gilda",
  "kinema-singin-in-the-rain",
  "kinema-the-maltese-falcon",
  "kinema-frankenstein",
  "kinema-the-third-man",
  "kinema-city-lights",
]
// Scans too small for A5 stay out of the shop.
const archiveProducts = archivePosters.flatMap((poster, index): Product[] => {
  const variants = printVariants(
    posterSizes
      .filter((size) => poster.width >= size.minWidth)
      .map((size) => size.id),
  )
  if (!variants.length) return []
  const preferred = defaultSize(variants)
  return [
    {
      id: poster.slug,
      series: poster.series,
      variantLabel: "Formati",
      defaultVariantId: preferred.id,
      variants,
      number: String(15 + museumPosters.length + index).padStart(2, "0"),
      name: poster.title,
      category: "Postera",
      price: preferred.price!,
      quantityLabel: `${preferred.label} · pa kornizë`,
      description: `${archiveKinds[poster.series] ?? "Poster"} origjinal nga viti ${poster.year}. Ristampë e një posteri në domen publik.`,
      tone: "paper",
      production: "Standard",
      material: "Letër mat 250 g/m²",
      ...(archiveSpotlight.includes(poster.slug) ? { featured: true } : {}),
      image: `/media/collections/archive/${poster.slug}.webp`,
    },
  ]
})

// Launch collection concepts. Prices are indicative until confirmed by the studio.
const studioProducts: Product[] = [
  {
    id: "forma-blue",
    series: "Art",
    variantLabel: "Formati",
    defaultVariantId: "a3",
    variants: posterVariants,
    number: "01",
    name: "Forma — Blue",
    category: "Postera",
    price: PAPER_A3,
    quantityLabel: "A3 · 29,7 × 42 cm · pa kornizë",
    description:
      "Forma të pastra. Blu që të mbetet në mendje. Art print për këndin tënd të preferuar.",
    tone: "paper",
    production: "Standard",
    material: "Letër mat 250 g/m²",
    badge: "New",
    featured: true,
    image: "/media/collections/poster-blue.svg",
  },
  {
    id: "diell",
    series: "Art",
    variantLabel: "Formati",
    defaultVariantId: "a3",
    variants: posterVariants,
    number: "02",
    name: "Diëll",
    category: "Postera",
    price: PAPER_A3,
    quantityLabel: "A3 · 29,7 × 42 cm · pa kornizë",
    description:
      "Pak ngrohtësi në çdo mur. Një kompozim me harqe dhe një diell në terrakotë.",
    tone: "paper",
    production: "Standard",
    material: "Letër mat 250 g/m²",
    featured: true,
    image: "/media/collections/poster-orange.svg",
  },
  {
    id: "orbit",
    series: "Art",
    variantLabel: "Formati",
    defaultVariantId: "a3",
    variants: posterVariants,
    number: "03",
    name: "Orbit",
    category: "Postera",
    price: PAPER_A3,
    quantityLabel: "A3 · 29,7 × 42 cm · pa kornizë",
    description:
      "Ritëm, rrethe dhe ekuilibër. Një studim grafik në të zezë dhe të bardhë.",
    tone: "paper",
    production: "Standard",
    material: "Letër mat 250 g/m²",
    featured: true,
    image: "/media/collections/poster-mono.svg",
  },
  {
    id: "mesnate",
    series: "Film",
    variantLabel: "Formati",
    defaultVariantId: "a3",
    variants: posterVariants,
    number: "08",
    name: "Mesnatë",
    category: "Postera",
    price: PAPER_A3,
    quantityLabel: "A3 · 29,7 × 42 cm · pa kornizë",
    description:
      "Neo-noir për murin tënd. Hëna mbi qytet, dritaret ndezur dhe titulli në neon rozë. Film fiktiv, poster origjinal i CUBE.",
    tone: "paper",
    production: "Standard",
    material: "Letër mat 250 g/m²",
    badge: "New",
    featured: true,
    image: "/media/collections/poster-film-mesnate.svg",
  },
  {
    id: "vera-e-fundit",
    series: "Film",
    variantLabel: "Formati",
    defaultVariantId: "a3",
    variants: posterVariants,
    number: "09",
    name: "Vera e Fundit",
    category: "Postera",
    price: PAPER_A3,
    quantityLabel: "A3 · 29,7 × 42 cm · pa kornizë",
    description:
      "Diell retro, valë dhe nostalgji vere. Poster në stilin e kinemasë së viteve ’70. Film fiktiv, poster origjinal i CUBE.",
    tone: "paper",
    production: "Standard",
    material: "Letër mat 250 g/m²",
    featured: true,
    image: "/media/collections/poster-film-vera-e-fundit.svg",
  },
  {
    id: "sharri",
    series: "Film",
    variantLabel: "Formati",
    defaultVariantId: "a3",
    variants: posterVariants,
    number: "10",
    name: "Sharri",
    category: "Postera",
    price: PAPER_A3,
    quantityLabel: "A3 · 29,7 × 42 cm · pa kornizë",
    description:
      "Male në shtresa, një diell i kuq dhe tipografi e madhe. Thriller minimal në tonet e gurit. Film fiktiv, poster origjinal i CUBE.",
    tone: "paper",
    production: "Standard",
    material: "Letër mat 250 g/m²",
    image: "/media/collections/poster-film-sharri.svg",
  },
  {
    id: "dashuri-35mm",
    series: "Film",
    variantLabel: "Formati",
    defaultVariantId: "a3",
    variants: posterVariants,
    number: "11",
    name: "Dashuri 35mm",
    category: "Postera",
    price: PAPER_A3,
    quantityLabel: "A3 · 29,7 × 42 cm · pa kornizë",
    description:
      "Dy rrathë, një zemër dhe shiriti i filmit. Poster romantik me karakter. Film fiktiv, poster origjinal i CUBE.",
    tone: "paper",
    production: "Standard",
    material: "Letër mat 250 g/m²",
    badge: "New",
    image: "/media/collections/poster-film-dashuri-35mm.svg",
  },
  {
    id: "autostrada",
    series: "Film",
    variantLabel: "Formati",
    defaultVariantId: "a3",
    variants: posterVariants,
    number: "12",
    name: "Autostrada",
    category: "Postera",
    price: PAPER_A3,
    quantityLabel: "A3 · 29,7 × 42 cm · pa kornizë",
    description:
      "Rrugë pa fund drejt perëndimit. Road movie në vjollcë, rozë dhe portokalli. Film fiktiv, poster origjinal i CUBE.",
    tone: "paper",
    production: "Standard",
    material: "Letër mat 250 g/m²",
    featured: true,
    image: "/media/collections/poster-film-autostrada.svg",
  },
  {
    id: "kthimi",
    series: "Film",
    variantLabel: "Formati",
    defaultVariantId: "a3",
    variants: posterVariants,
    number: "13",
    name: "Kthimi",
    category: "Postera",
    price: PAPER_A3,
    quantityLabel: "A3 · 29,7 × 42 cm · pa kornizë",
    description:
      "Astronaut, planet blu dhe yje. Një odise e qetë në hapësirë për këndin tënd. Film fiktiv, poster origjinal i CUBE.",
    tone: "paper",
    production: "Standard",
    material: "Letër mat 250 g/m²",
    image: "/media/collections/poster-film-kthimi.svg",
  },
  {
    id: "opal-dome-lamp",
    number: "15",
    name: "Opal Dome Lamp",
    category: "Llampa",
    series: "Bauhaus",
    price: 89,
    quantityLabel: "1 copë · 36 cm",
    description:
      "Kupolë qelqi opal mbi një këmbë kromi. Klasikja Bauhaus që e mbush dhomën me dritë të butë. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Qelq opal · krom",
    badge: "New",
    image: "/media/collections/blanks/lamp-opal-dome.webp",
  },
  {
    id: "primary-lamp",
    number: "16",
    name: "Primary Lamp",
    category: "Llampa",
    series: "Bauhaus",
    price: 79,
    quantityLabel: "1 copë · 42 cm",
    description:
      "Kon i kuq, sferë e verdhë, cilindër blu: tri ngjyrat bazë të Bauhaus në një llampë. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Metal i lyer mat · LED e ngrohtë",
    badge: "New",
    image: "/media/collections/blanks/lamp-primary.webp",
  },
  {
    id: "atelier-desk-lamp",
    number: "17",
    name: "Atelier Desk Lamp",
    category: "Llampa",
    series: "Bauhaus",
    price: 69,
    quantityLabel: "1 copë · 45 cm",
    description:
      "Krah i artikuluar dhe kupolë metalike e zezë. Dritë e drejtuar për tavolinën e punës. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Metal i zi mat",
    image: "/media/collections/blanks/lamp-desk-black.webp",
  },
  {
    id: "globe-floor-lamp",
    number: "18",
    name: "Globe Floor Lamp",
    category: "Llampa",
    series: "Bauhaus",
    price: 149,
    quantityLabel: "1 copë · 1,6 m",
    description:
      "Një sferë opal mbi shtyllë të hollë çeliku. Dritë e butë për këndin e leximit. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Qelq opal · çelik i brushuar",
    image: "/media/collections/blanks/lamp-floor-globe.webp",
  },
  {
    id: "mustard-pendant",
    number: "19",
    name: "Mustard Pendant",
    category: "Llampa",
    series: "Bauhaus",
    price: 79,
    quantityLabel: "1 copë · Ø 30 cm",
    description:
      "Kupolë metalike e verdhë mustardë me brendi të bardhë, për mbi tavolinën e ngrënies. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Metal i emaluar · kabllo tekstili",
    image: "/media/collections/blanks/lamp-pendant-yellow.webp",
  },
  {
    id: "terracotta-moon-lamp",
    number: "20",
    name: "Terracotta Moon Lamp",
    category: "Llampa",
    series: "Bauhaus",
    price: 89,
    quantityLabel: "1 copë · 38 cm",
    description:
      "Cilindër terrakote, disk krem dhe gjysmëhënë qelqi. Forma të thjeshta, dritë e ngrohtë. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Qeramikë · qelq i mjegullt",
    image: "/media/collections/blanks/lamp-terracotta.webp",
  },
  {
    id: "red-line-sconce",
    number: "21",
    name: "Red Line Sconce",
    category: "Llampa",
    series: "Bauhaus",
    price: 65,
    quantityLabel: "1 copë · Ø 22 cm",
    description:
      "Aplikë muri me disk të bardhë, krah të kuq dhe sferë qelqi. Grafikë në mur, edhe kur është e fikur. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Metal i lyer · qelq opal",
    image: "/media/collections/blanks/lamp-sconce-red.webp",
  },
  {
    id: "cobalt-mushroom-lamp",
    number: "22",
    name: "Cobalt Mushroom Lamp",
    category: "Llampa",
    series: "Bauhaus",
    price: 69,
    quantityLabel: "1 copë · 32 cm",
    description:
      "Kërpudhë e lëmuar në blu kobalt. Një pikë e fortë ngjyre pranë posterave. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Metal me llak me shkëlqim",
    image: "/media/collections/blanks/lamp-mushroom-blue.webp",
  },
  {
    id: "tube-lamp",
    number: "23",
    name: "Tube Lamp",
    category: "Llampa",
    series: "Bauhaus",
    price: 99,
    quantityLabel: "1 copë · 40 cm",
    description:
      "Cilindër qelqi i mjegullt në kornizë kromi, mbi bazë të zezë. Dritë vertikale dhe e pastër. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Krom · qelq i mjegullt",
    image: "/media/collections/blanks/lamp-tube-chrome.webp",
  },
  {
    id: "arc-floor-lamp",
    number: "24",
    name: "Arc Floor Lamp",
    category: "Llampa",
    price: 189,
    quantityLabel: "1 copë · 1,9 m",
    description:
      "Hark i hollë çeliku mbi bazë mermeri, me kupolë të bardhë. Dritë mbi divan pa e shpuar tavanin. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Çelik i zi · mermer",
    image: "/media/collections/blanks/lamp-arc-floor.webp",
  },
  {
    id: "pleated-oak-lamp",
    number: "25",
    name: "Pleated Oak Lamp",
    category: "Llampa",
    price: 75,
    quantityLabel: "1 copë · 40 cm",
    description:
      "Abazhur letre me pala mbi bazë lisi. Dritë e ngrohtë dhe e butë për komodinë. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Letër · dru lisi",
    image: "/media/collections/blanks/lamp-pleated-oak.webp",
  },
  {
    id: "paper-globe-floor-lamp",
    number: "26",
    name: "Paper Globe Floor Lamp",
    category: "Llampa",
    price: 119,
    quantityLabel: "1 copë · 1,4 m",
    description:
      "Sferë letre orizi mbi tri këmbë të holla metalike, si një hënë e vogël në kënd. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Letër orizi · metal i zi",
    image: "/media/collections/blanks/lamp-paper-globe.webp",
  },
  {
    id: "amber-mushroom-lamp",
    number: "27",
    name: "Amber Mushroom Lamp",
    category: "Llampa",
    price: 85,
    quantityLabel: "1 copë · 34 cm",
    description:
      "Kërpudhë e tëra prej qelqi qelibar. E ndezur, e mbush dhomën me dritë mjalti. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Qelq qelibar",
    image: "/media/collections/blanks/lamp-amber-mushroom.webp",
  },
  {
    id: "orange-mini-lamp",
    number: "28",
    name: "Orange Mini Lamp",
    category: "Llampa",
    price: 45,
    quantityLabel: "1 copë · 22 cm",
    description:
      "Llampë e vogël në portokalli të ndezur. E lehtë, me ngjyrë të fortë, për raft ose komodinë. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Plastikë me shkëlqim · LED",
    image: "/media/collections/blanks/lamp-orange-mini.webp",
  },
  {
    id: "cylinder-pendant",
    number: "29",
    name: "Cylinder Pendant",
    category: "Llampa",
    price: 59,
    quantityLabel: "1 copë · Ø 8 cm",
    description:
      "Cilindër i zi mat që e hedh dritën poshtë. Bukur në varg mbi banak ose tavolinë. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Alumin i zi mat",
    image: "/media/collections/blanks/lamp-black-cylinder.webp",
  },
  {
    id: "wave-ceramic-lamp",
    number: "30",
    name: "Wave Ceramic Lamp",
    category: "Llampa",
    price: 95,
    quantityLabel: "1 copë · 48 cm",
    description:
      "Bazë qeramike krem me valë dhe abazhur liri. Skulpturë e butë për sallon. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Qeramikë · li",
    image: "/media/collections/blanks/lamp-wave-ceramic.webp",
  },
  {
    id: "prism-globe-lamp",
    number: "31",
    name: "Prism Globe Lamp",
    category: "Llampa",
    price: 79,
    quantityLabel: "1 copë · 36 cm",
    description:
      "Prizëm i bardhë që mban një sferë qelqi të mjegullt. Gjeometri e pastër, dritë e butë. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Metal i bardhë mat · qelq",
    image: "/media/collections/blanks/lamp-prism-globe.webp",
  },
  {
    id: "brass-halo-sconce",
    number: "32",
    name: "Brass Halo Sconce",
    category: "Llampa",
    price: 89,
    quantityLabel: "1 copë · Ø 25 cm",
    description:
      "Disk bronzi në mur me një aureolë drite rreth tij. Dritë indirekte për korridor dhe dhomë gjumi. Specifikat konfirmohen para porosisë.",
    tone: "paper",
    production: "Custom",
    material: "Bronz i brushuar · LED",
    image: "/media/collections/blanks/lamp-brass-halo.webp",
  },
]

const spotlightProducts = archiveSpotlight.flatMap(
  (slug) => archiveProducts.find((product) => product.id === slug) ?? [],
)

const singlePosters = new Map(
  [...studioProducts, ...museumProducts, ...archiveProducts].map((product) => [
    product.id,
    product,
  ]),
)
const listNames = (names: string[]) =>
  `${names.slice(0, -1).join(", ")} dhe ${names[names.length - 1]}`

// A bundle is only built when all of its posters are in the catalog, and is
// sold in the sizes every one of them can be printed at.
const bundleProducts = bundleDefinitions.flatMap((bundle, index): Product[] => {
  const posters = bundle.includes.map((id) => singlePosters.get(id))
  if (posters.some((poster) => !poster)) return []
  if (bundle.sizes) return gallerySet(bundle, posters as Product[], index)
  const sizes = posterSizes.filter(
    (size) =>
      size.id in BUNDLE_PRICES &&
      posters.every((poster) =>
        poster!.variants?.some((variant) => variant.id === size.id),
      ),
  )
  if (!sizes.length) return []
  const preferred =
    sizes.find((size) => size.id === "a4") ??
    sizes[0]
  const names = posters.map((poster) => poster!.name)
  const saving = posters.length * preferred.price - BUNDLE_PRICES[preferred.id]
  return [
    {
      id: bundle.id,
      number: `P${String(index + 1).padStart(2, "0")}`,
      name: bundle.name,
      category: "Paketa",
      price: BUNDLE_PRICES[preferred.id],
      quantityLabel: `${posters.length} postera · ${preferred.label} · pa kornizë`,
      description: `${bundle.tagline} ${posters.length} postera në një paketë: ${listNames(names)}. Kursen ${saving} € krahasuar me blerjen veç e veç.`,
      tone: "paper",
      production: "Standard",
      material: "Letër mat 250 g/m²",
      ...(bundle.featured ? { featured: true } : {}),
      image: `/media/collections/bundles/${bundle.id}.webp`,
      variantLabel: "Formati i secilit poster",
      defaultVariantId: preferred.id,
      variants: sizes.map((size) => ({
        id: size.id,
        label: `${posters.length} × ${size.label}`,
        price: BUNDLE_PRICES[size.id],
      })),
      includes: bundle.includes,
    },
  ]
})

// A gallery set: each poster in its own fixed paper size, for less than the
// posters bought one by one. Left out unless every poster comes in its size.
function gallerySet(
  bundle: (typeof bundleDefinitions)[number],
  posters: Product[],
  index: number,
): Product[] {
  const sizes = bundle.sizes!
  if (
    sizes.length !== posters.length ||
    posters.some(
      (poster, slot) =>
        !poster.variants?.some((variant) => variant.id === sizes[slot]),
    )
  )
    return []
  const single = sizes.reduce(
    (total, size) => total + getPosterSize(size)!.price,
    0,
  )
  // Rounded to a price ending in 9.
  const price = Math.round((single * setDiscount(sizes.length)) / 10) * 10 - 1
  const counts = [...new Set(sizes)]
    .map((size) => ({
      size,
      count: sizes.filter((entry) => entry === size).length,
      label: getPosterSize(size)!.label.split(" · ")[0],
    }))
    .sort(
      (a, b) =>
        posterSizes.findIndex((size) => size.id === b.size) -
        posterSizes.findIndex((size) => size.id === a.size),
    )
  const summary = counts
    .map((entry) => `${entry.count} × ${entry.label}`)
    .join(" + ")
  return [
    {
      id: bundle.id,
      number: `S${String(index + 1).padStart(2, "0")}`,
      name: bundle.name,
      category: "Paketa",
      series: posters.length >= 20 ? "Mega set" : "Set galerie",
      price,
      quantityLabel: `${posters.length} postera · ${summary} · pa kornizë`,
      description: `${bundle.tagline} ${posters.length} postera (${summary}) për një mur të tërë. Kursen ${single - price} € krahasuar me blerjen veç e veç.`,
      tone: "paper",
      production: "Standard",
      material: "Letër mat 250 g/m²",
      ...(bundle.featured ? { featured: true } : {}),
      image: `/media/collections/bundles/${bundle.id}.webp`,
      variantLabel: "Seti",
      defaultVariantId: "set",
      variants: [
        { id: "set", label: `${posters.length} postera · ${summary}`, price },
      ],
      includes: bundle.includes,
      includeVariants: sizes,
    },
  ]
}

// Clothing printed or embroidered with the customer's logo or design. Prices
// are per piece; team orders are quoted lower.
const clothingProducts: Product[] = [
  {
    id: "tshirts",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V01",
    name: "Maicë klasike",
    category: "Veshje",
    price: 12,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Maicë pa jakë në pambuk të trashë, me logon ose dizajnin tënd para, prapa ose në mëngë. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Standard",
    material: "Pambuk 100% · 180 g/m²",
    featured: true,
    image: "/media/collections/blanks/tee-crew-front.webp",
  },
  {
    id: "vneck-tees",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V02",
    name: "Maicë me qafë V",
    category: "Veshje",
    price: 13,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Maicë pa jakë me qafë V, me print para ose prapa. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Standard",
    material: "Pambuk 100%",
    featured: true,
    image: "/media/collections/blanks/vneck-tees.webp",
  },
  {
    id: "long-sleeve-tees",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V03",
    name: "Maicë me mëngë të gjata",
    category: "Veshje",
    price: 16,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Maicë me mëngë të gjata, me print në gjoks, mëngë ose shpinë. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Standard",
    material: "Pambuk 100%",
    image: "/media/collections/blanks/long-sleeve-tees.webp",
  },
  {
    id: "tank-tops",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V04",
    name: "Atlete",
    category: "Veshje",
    price: 11,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Atlete pa mëngë për palestra, ekipe dhe evente sportive. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Standard",
    material: "Pambuk i lehtë",
    image: "/media/collections/blanks/tank-tops.webp",
  },
  {
    id: "polo-shirts",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V05",
    name: "Polo me jakë",
    category: "Veshje",
    price: 18,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Polo me jakë në pambuk piqué, me logo të qëndisur ose të printuar në gjoks. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Standard",
    material: "Pambuk piqué · 220 g/m²",
    image: "/media/collections/blanks/polo-front.webp",
  },
  {
    id: "work-shirts",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V06",
    name: "Këmishë pune",
    category: "Veshje",
    price: 24,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Këmishë me mëngë të gjata dhe dy xhepa, me logo në gjoks. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Custom",
    material: "Pambuk / poliester",
    image: "/media/collections/blanks/work-shirts.webp",
  },
  {
    id: "sweatshirts",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V07",
    name: "Duks",
    category: "Veshje",
    price: 22,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Duks pa kapuç me print ose qëndisje para dhe prapa. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Standard",
    material: "Fleece pambuku · 280 g/m²",
    image: "/media/collections/blanks/sweatshirt.webp",
  },
  {
    id: "hoodies",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V08",
    name: "Hoodie",
    category: "Veshje",
    price: 26,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Hoodie me kapuç dhe xhep para, me print ose qëndisje. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Standard",
    material: "Fleece pambuku · 300 g/m²",
    image: "/media/collections/blanks/hoodie.webp",
  },
  {
    id: "zip-hoodies",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V09",
    name: "Hoodie me zinxhir",
    category: "Veshje",
    price: 29,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Hoodie me zinxhir të plotë, me logo në gjoks dhe dizajn në shpinë. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Standard",
    material: "Fleece pambuku",
    image: "/media/collections/blanks/zip-hoodies.webp",
  },
  {
    id: "sports-jerseys",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V10",
    name: "Fanellë sportive",
    category: "Veshje",
    price: 19,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Fanellë me emër, numër dhe logo, me printim sublimimi për gjithë ekipin. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Custom",
    material: "Poliester dry-fit",
    image: "/media/collections/blanks/sports-jerseys.webp",
  },
  {
    id: "hi-vis-vests",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V11",
    name: "Jelek reflektues",
    category: "Veshje",
    price: 9,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Jelek reflektues me logo në shpinë dhe gjoks, për punëtori, servise dhe evente. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Standard",
    material: "Poliester · shirita reflektues",
    image: "/media/collections/blanks/hi-vis-vests.webp",
  },
  {
    id: "gilets",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V12",
    name: "Jelek i mbushur",
    category: "Veshje",
    price: 32,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Jelek pa mëngë, i mbushur dhe i lehtë, me logo të qëndisur në gjoks. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Custom",
    material: "Najlon · mbushje e lehtë",
    image: "/media/collections/blanks/gilets.webp",
  },
  {
    id: "softshell-jackets",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V13",
    name: "Xhaketë softshell",
    category: "Veshje",
    price: 42,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Xhaketë pune kundër erës dhe shiut të lehtë, me logo të qëndisur. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Custom",
    material: "Softshell 3-shtresor",
    image: "/media/collections/blanks/softshell-jackets.webp",
  },
  {
    id: "coveralls",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V14",
    name: "Kominoshe pune",
    category: "Veshje",
    price: 39,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Kominoshe për servis, punëtori dhe ndërtim, me logo në gjoks dhe shpinë. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Custom",
    material: "Pambuk i trashë",
    image: "/media/collections/blanks/coveralls.webp",
  },
  {
    id: "chef-jackets",
    variantLabel: "Madhësia",
    defaultVariantId: "m",
    variants: shirtVariants,
    number: "V15",
    name: "Xhaketë kuzhinieri",
    category: "Veshje",
    price: 29,
    quantityLabel: "1 copë · XS–XXL",
    description:
      "Xhaketë kuzhinieri me kopsa të dyfishta dhe logo të qëndisur. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Custom",
    material: "Pambuk 100%",
    image: "/media/collections/blanks/chef-jackets.webp",
  },
  {
    id: "aprons",
    number: "V16",
    name: "Përparëse",
    category: "Veshje",
    price: 14,
    quantityLabel: "1 copë · një madhësi",
    description:
      "Përparëse për kafene, restorante dhe dyqane, me logo të printuar ose të qëndisur. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Standard",
    material: "Kanavacë pambuku",
    image: "/media/collections/blanks/aprons.webp",
  },
  {
    id: "caps",
    number: "V17",
    name: "Kapelë",
    category: "Veshje",
    price: 10,
    quantityLabel: "1 copë · e rregullueshme",
    description:
      "Kapelë me strehë dhe logo të qëndisur para ose anash. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Standard",
    material: "Pambuk twill",
    image: "/media/collections/blanks/cap.webp",
  },
  {
    id: "bucket-hats",
    number: "V18",
    name: "Kapelë bucket",
    category: "Veshje",
    price: 11,
    quantityLabel: "1 copë · një madhësi",
    description:
      "Kapelë bucket me logo të qëndisur ose të printuar. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Standard",
    material: "Pambuk twill",
    image: "/media/collections/blanks/bucket-hats.webp",
  },
  {
    id: "beanies",
    number: "V19",
    name: "Kapuç i thurur",
    category: "Veshje",
    price: 9,
    quantityLabel: "1 copë · një madhësi",
    description:
      "Kapuç dimri me logo të qëndisur ose etiketë. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Standard",
    material: "Akrilik i thurur",
    image: "/media/collections/blanks/beanies.webp",
  },
  {
    id: "socks",
    number: "V20",
    name: "Çorape",
    category: "Veshje",
    price: 6,
    quantityLabel: "1 palë · 36–46",
    description:
      "Çorape me dizajn dhe logo të thurur sipas brandit. Që nga 1 copë; për ekipe çmimi bie.",
    tone: "paper",
    production: "Custom",
    material: "Pambuk i krehur",
    image: "/media/collections/blanks/socks.webp",
  },
]

export const collectionProducts: Product[] = [
  ...studioProducts.slice(0, 3),
  ...spotlightProducts,
  ...bundleProducts,
  ...studioProducts.slice(3),
  ...clothingProducts,
  ...museumProducts,
  ...archiveProducts.filter(
    (product) => !archiveSpotlight.includes(product.id),
  ),
]

// The customer's own photo, printed in any size and finish (/shop/foto).
export const PHOTO_PRODUCT_ID = "foto"
export const photoProduct: Product = {
  id: PHOTO_PRODUCT_ID,
  number: "F01",
  name: "Foto jote",
  category: "Foto",
  price: getPosterSize("30x40")!.price,
  quantityLabel: "30 × 40 cm · Letër mat",
  description:
    "Ngarko foton tënde dhe printoje në letër, pleksiglas, kanavacë ose me kornizë, në madhësinë që do.",
  tone: "paper",
  production: "Standard",
  material: "Sipas zgjedhjes",
  image: "/media/collections/photo-print.svg",
  variantLabel: "Formati",
  defaultVariantId: "30x40",
  variants: printVariants(printSizes.map((size) => size.id)),
  customImage: true,
}

export const products: Product[] = [
  ...collectionProducts,
  photoProduct,
  {
    id: "business-cards",
    number: "01",
    name: "Business Cards",
    category: "Print",
    price: 35,
    quantityLabel: "100 copë",
    description: "Kartë 350gsm, print dy-anësh dhe finish mat.",
    tone: "paper",
    production: "Fast",
    material: "Premium paper",
    badge: "Bestseller",
    featured: true,
    image: "/media/collections/blanks/business-cards.webp",
  },
  {
    id: "rollup-banner",
    number: "02",
    name: "Roll-up Banner",
    category: "Print",
    price: 95,
    quantityLabel: "85 × 200 cm",
    description: "Konstruksion, print premium dhe çantë transporti.",
    tone: "violet",
    production: "Standard",
    material: "Blockout film",
    featured: true,
    image: "/media/collections/blanks/rollup.webp",
  },
  {
    id: "branded-pens",
    number: "03",
    name: "Branded Pens",
    category: "Promo",
    price: 65,
    quantityLabel: "50 copë",
    description: "Lapsa metalikë me print njëngjyrësh të logos.",
    tone: "acid",
    production: "Standard",
    material: "Aluminium",
    badge: "Bestseller",
    image: "/media/collections/blanks/pens.webp",
  },
  {
    id: "notebooks",
    number: "04",
    name: "Studio Notebooks",
    category: "Promo",
    price: 120,
    quantityLabel: "25 copë",
    description: "Fletore A5 me kopertinë të personalizuar dhe 80 faqe.",
    tone: "orange",
    production: "Standard",
    material: "Recycled paper",
    badge: "Eco",
    image: "/media/collections/blanks/notebook.webp",
  },
  {
    id: "stickers",
    number: "06",
    name: "Die-cut Stickers",
    category: "Print",
    price: 45,
    quantityLabel: "100 copë",
    description: "Vinyl rezistent, formë e personalizuar dhe laminim.",
    tone: "acid",
    production: "Fast",
    material: "Weatherproof vinyl",
    badge: "Bestseller",
    image: "/media/collections/blanks/stickers.webp",
  },
  {
    id: "flyers",
    number: "07",
    name: "Campaign Flyers",
    category: "Print",
    price: 55,
    quantityLabel: "250 copë",
    description: "A5, print full-color dy-anësh në letër 170gsm.",
    tone: "violet",
    production: "Fast",
    material: "Silk paper",
    image: "/media/collections/blanks/flyers.webp",
  },
  {
    id: "tote-bags",
    number: "08",
    name: "Tote Bags",
    category: "Textile",
    price: 160,
    quantityLabel: "20 copë",
    description: "Pambuk natyral me print të personalizuar.",
    tone: "orange",
    production: "Standard",
    material: "Natural cotton",
    badge: "Eco",
    image: "/media/collections/blanks/tote.webp",
  },
  {
    id: "brochures",
    number: "09",
    name: "Company Brochures",
    category: "Print",
    price: 95,
    quantityLabel: "100 copë",
    description: "A4 palosur, 6 faqe, full-color dhe finish premium.",
    tone: "paper",
    production: "Standard",
    material: "Silk paper",
    image: "/media/collections/blanks/brochure.webp",
  },
  {
    id: "menus",
    number: "10",
    name: "Restaurant Menus",
    category: "Print",
    price: 110,
    quantityLabel: "25 copë",
    description: "Menu rezistente me laminim dhe format sipas brandit.",
    tone: "orange",
    production: "Standard",
    material: "Laminated card",
    badge: "New",
    image: "/media/collections/blanks/menu.webp",
  },
  {
    id: "posters",
    number: "11",
    name: "Campaign Posters",
    category: "Print",
    price: 70,
    quantityLabel: "50 copë",
    description: "A2 poster me ngjyra të forta dhe print high-resolution.",
    tone: "violet",
    production: "Fast",
    material: "Poster paper",
    image: "/media/collections/blanks/posters.webp",
  },
  {
    id: "vinyl-banner",
    number: "12",
    name: "Outdoor Banner",
    category: "Signage",
    price: 85,
    quantityLabel: "200 × 100 cm",
    description: "Banner outdoor me vrima metalike dhe material rezistent.",
    tone: "acid",
    production: "Fast",
    material: "PVC vinyl",
    featured: true,
    image: "/media/collections/blanks/vinyl-banner.webp",
  },
  {
    id: "window-graphics",
    number: "13",
    name: "Window Graphics",
    category: "Signage",
    price: 180,
    quantityLabel: "deri 3 m²",
    description: "Grafika për vitrina me material dhe prerje të personalizuar.",
    tone: "paper",
    production: "Custom",
    material: "Cut vinyl",
    badge: "New",
    image: "/media/collections/blanks/window-graphics.webp",
  },
  {
    id: "mugs",
    number: "14",
    name: "Branded Mugs",
    category: "Promo",
    price: 90,
    quantityLabel: "24 copë",
    description: "Filxhanë qeramike me print full-color rrethor.",
    tone: "violet",
    production: "Standard",
    material: "Ceramic",
    image: "/media/collections/blanks/mug.webp",
  },
  {
    id: "lanyards",
    number: "15",
    name: "Event Lanyards",
    category: "Promo",
    price: 120,
    quantityLabel: "50 copë",
    description: "Lanyards të printuar me kapëse dhe badge holder.",
    tone: "orange",
    production: "Standard",
    material: "Polyester",
    image: "/media/collections/blanks/lanyard.webp",
  },
  {
    id: "product-labels",
    number: "18",
    name: "Product Labels",
    category: "Packaging",
    price: 75,
    quantityLabel: "250 copë",
    description: "Etiketa në roll, formë dhe material sipas produktit.",
    tone: "orange",
    production: "Fast",
    material: "Paper / PP",
    badge: "Bestseller",
    image: "/media/collections/blanks/labels.webp",
  },
  {
    id: "shipping-boxes",
    number: "19",
    name: "Shipping Boxes",
    category: "Packaging",
    price: 210,
    quantityLabel: "50 copë",
    description: "Kuti corrugated me print të brandit dhe madhësi custom.",
    tone: "violet",
    production: "Custom",
    material: "Corrugated board",
    badge: "Eco",
    image: "/media/collections/blanks/shipping-box.webp",
  },
  {
    id: "paper-bags",
    number: "20",
    name: "Retail Paper Bags",
    category: "Packaging",
    price: 190,
    quantityLabel: "100 copë",
    description: "Qese premium me dorezë dhe print sipas identitetit.",
    tone: "acid",
    production: "Custom",
    material: "Kraft paper",
    badge: "Eco",
    image: "/media/collections/blanks/paper-bag.webp",
  },
  {
    id: "drawstring-bags",
    number: "21",
    name: "Drawstring Bags",
    category: "Textile",
    price: 120,
    quantityLabel: "25 copë",
    description: "Çantë me kordon për evente, palestra dhe promovime.",
    tone: "paper",
    production: "Standard",
    material: "Pambuk / poliester",
    image: "/media/collections/blanks/drawstring-bags.webp",
  },
  {
    id: "backpacks",
    number: "22",
    name: "Backpacks",
    category: "Textile",
    price: 380,
    quantityLabel: "10 copë",
    description: "Çantë shpine me logo të qëndisur, për ekipe dhe dhurata korporative.",
    tone: "paper",
    production: "Standard",
    material: "Poliester rezistent",
    image: "/media/collections/blanks/backpacks.webp",
  },
  {
    id: "water-bottles",
    number: "23",
    name: "Water Bottles",
    category: "Promo",
    price: 180,
    quantityLabel: "20 copë",
    description: "Shishe termike metalike me logo të gdhendur me laser ose të printuar.",
    tone: "paper",
    production: "Standard",
    material: "Inox · izolim i dyfishtë",
    image: "/media/collections/blanks/water-bottles.webp",
  },
  {
    id: "tumblers",
    number: "24",
    name: "Travel Tumblers",
    category: "Promo",
    price: 200,
    quantityLabel: "20 copë",
    description: "Gotë termike me kapak për kafe në lëvizje, me logo.",
    tone: "paper",
    production: "Standard",
    material: "Inox",
    image: "/media/collections/blanks/tumblers.webp",
  },
  {
    id: "umbrellas",
    number: "25",
    name: "Umbrellas",
    category: "Promo",
    price: 240,
    quantityLabel: "10 copë",
    description: "Çadër e madhe me logo të printuar në panele.",
    tone: "paper",
    production: "Standard",
    material: "Poliester · kornizë fibre",
    image: "/media/collections/blanks/umbrellas.webp",
  },
  {
    id: "usb-drives",
    number: "26",
    name: "USB Drives",
    category: "Promo",
    price: 160,
    quantityLabel: "25 copë",
    description: "USB me logo të printuar ose të gdhendur, 16–64 GB.",
    tone: "paper",
    production: "Standard",
    material: "Plastikë / metal",
    image: "/media/collections/blanks/usb-drives.webp",
  },
  {
    id: "power-banks",
    number: "27",
    name: "Power Banks",
    category: "Promo",
    price: 260,
    quantityLabel: "10 copë",
    description: "Bateri portative me logo, dhuratë praktike për klientët.",
    tone: "paper",
    production: "Standard",
    material: "Plastikë mat · 10 000 mAh",
    image: "/media/collections/blanks/power-banks.webp",
  },
  {
    id: "keychains",
    number: "28",
    name: "Keychains",
    category: "Promo",
    price: 80,
    quantityLabel: "50 copë",
    description: "Varëse çelësash akrilike ose metalike, me formë sipas logos.",
    tone: "paper",
    production: "Standard",
    material: "Akrilik / metal",
    image: "/media/collections/blanks/keychains.webp",
  },
  {
    id: "mouse-pads",
    number: "29",
    name: "Mouse Pads",
    category: "Promo",
    price: 140,
    quantityLabel: "25 copë",
    description: "Shtroje mausi me print full-color dhe bazë gome.",
    tone: "paper",
    production: "Standard",
    material: "Gome · pëlhurë",
    image: "/media/collections/blanks/mouse-pads.webp",
  },
  {
    id: "pin-badges",
    number: "30",
    name: "Button Badges",
    category: "Promo",
    price: 60,
    quantityLabel: "100 copë",
    description: "Distinktivë të rrumbullakët me print, për evente dhe fushata.",
    tone: "paper",
    production: "Standard",
    material: "Metal · film mat",
    image: "/media/collections/blanks/pin-badges.webp",
  },
  {
    id: "coasters",
    number: "31",
    name: "Coasters",
    category: "Promo",
    price: 90,
    quantityLabel: "50 copë",
    description: "Nënkupa për kafene dhe bare, me print sipas brandit.",
    tone: "paper",
    production: "Standard",
    material: "Karton / dru / tapë",
    image: "/media/collections/blanks/coasters.webp",
  },
  {
    id: "phone-cases",
    number: "32",
    name: "Phone Cases",
    category: "Promo",
    price: 150,
    quantityLabel: "10 copë",
    description: "Mbështjellëse telefoni me print full-color ose logo.",
    tone: "paper",
    production: "Standard",
    material: "Silikon / plastikë",
    image: "/media/collections/blanks/phone-cases.webp",
  },
  {
    id: "lighters",
    number: "33",
    name: "Lighters",
    category: "Promo",
    price: 70,
    quantityLabel: "100 copë",
    description: "Çakmakë me logo, për bare, kafene dhe evente.",
    tone: "paper",
    production: "Standard",
    material: "Plastikë",
    image: "/media/collections/blanks/lighters.webp",
  },
  {
    id: "sticky-notes",
    number: "34",
    name: "Sticky Notes",
    category: "Promo",
    price: 90,
    quantityLabel: "50 blloqe",
    description: "Blloqe ngjitëse me logo në çdo fletë.",
    tone: "paper",
    production: "Standard",
    material: "Letër ngjitëse",
    image: "/media/collections/blanks/sticky-notes.webp",
  },
  {
    id: "stationery-set",
    number: "35",
    name: "Stationery Set",
    category: "Print",
    price: 180,
    quantityLabel: "Set · 250 copë",
    description: "Letër me kokë, zarfe dhe kartëvizita me të njëjtin identitet.",
    tone: "paper",
    production: "Standard",
    material: "Letër premium 120 g/m²",
    image: "/media/collections/blanks/stationery-set.webp",
  },
  {
    id: "presentation-folders",
    number: "36",
    name: "Presentation Folders",
    category: "Print",
    price: 170,
    quantityLabel: "50 copë",
    description: "Dosje A4 me xhep për oferta, kontrata dhe prezantime.",
    tone: "paper",
    production: "Standard",
    material: "Karton 350 g/m²",
    image: "/media/collections/blanks/presentation-folders.webp",
  },
  {
    id: "desk-calendars",
    number: "37",
    name: "Desk Calendars",
    category: "Print",
    price: 220,
    quantityLabel: "25 copë",
    description: "Kalendar tavoline me 12 faqe dhe dizajn sipas brandit.",
    tone: "paper",
    production: "Standard",
    material: "Karton · spirale",
    image: "/media/collections/blanks/desk-calendars.webp",
  },
  {
    id: "invitations",
    number: "38",
    name: "Invitation Cards",
    category: "Print",
    price: 85,
    quantityLabel: "50 copë",
    description: "Ftesa për dasma, evente dhe hapje, me zarfe.",
    tone: "paper",
    production: "Standard",
    material: "Letër me teksturë 300 g/m²",
    image: "/media/collections/blanks/invitations.webp",
  },
  {
    id: "gift-vouchers",
    number: "39",
    name: "Gift Vouchers",
    category: "Print",
    price: 70,
    quantityLabel: "100 copë",
    description: "Vaucerë dhuratë me numërim dhe zarf.",
    tone: "paper",
    production: "Standard",
    material: "Letër 350 g/m²",
    image: "/media/collections/blanks/gift-vouchers.webp",
  },
  {
    id: "table-tents",
    number: "40",
    name: "Table Tents",
    category: "Print",
    price: 60,
    quantityLabel: "25 copë",
    description: "Karta tavoline për menu, oferta dhe rezervime.",
    tone: "paper",
    production: "Standard",
    material: "Karton i laminuar",
    image: "/media/collections/blanks/table-tents.webp",
  },
  {
    id: "a-frame-signs",
    number: "41",
    name: "A-frame Signs",
    category: "Signage",
    price: 160,
    quantityLabel: "1 copë",
    description: "Tabelë trotuari me dy faqe të printuara, për dyqane dhe kafene.",
    tone: "paper",
    production: "Standard",
    material: "Alumin · PVC",
    image: "/media/collections/blanks/a-frame-signs.webp",
  },
  {
    id: "acrylic-signs",
    number: "42",
    name: "Acrylic Signs",
    category: "Signage",
    price: 75,
    quantityLabel: "1 copë · 30 × 20 cm",
    description: "Tabela akrilike për zyra dhe dyer, me distancues metalikë.",
    tone: "paper",
    production: "Standard",
    material: "Akrilik 5 mm",
    image: "/media/collections/blanks/acrylic-signs.webp",
  },
  {
    id: "feather-flags",
    number: "43",
    name: "Feather Flags",
    category: "Signage",
    price: 190,
    quantityLabel: "1 copë · 3 m",
    description: "Flamur reklamues me shtyllë dhe bazë, për ambient të jashtëm.",
    tone: "paper",
    production: "Standard",
    material: "Poliester · fibër",
    image: "/media/collections/blanks/feather-flags.webp",
  },
  {
    id: "vehicle-branding",
    number: "44",
    name: "Vehicle Branding",
    category: "Signage",
    price: 450,
    quantityLabel: "1 automjet",
    description: "Brandim i automjetit me folie të printuar, pjesërisht ose plotësisht.",
    tone: "paper",
    production: "Standard",
    material: "Folie vinili e laminuar",
    image: "/media/collections/blanks/vehicle-branding.webp",
  },
  {
    id: "lightbox-signs",
    number: "45",
    name: "Lightbox Signs",
    category: "Signage",
    price: 380,
    quantityLabel: "1 copë · 100 × 50 cm",
    description: "Tabelë me ndriçim LED për fasada dhe interier.",
    tone: "paper",
    production: "Standard",
    material: "Alumin · LED · akrilik",
    image: "/media/collections/blanks/lightbox-signs.webp",
  },
  {
    id: "event-tents",
    number: "46",
    name: "Event Tents",
    category: "Signage",
    price: 650,
    quantityLabel: "1 copë · 3 × 3 m",
    description: "Tendë pop-up me print në tavan dhe anët, për panaire dhe evente.",
    tone: "paper",
    production: "Standard",
    material: "Poliester · kornizë alumini",
    image: "/media/collections/blanks/event-tents.webp",
  },
  {
    id: "coffee-cups",
    number: "47",
    name: "Coffee Cups",
    category: "Packaging",
    price: 120,
    quantityLabel: "500 copë",
    description: "Gota letre për kafe me kapak, me print sipas brandit.",
    tone: "paper",
    production: "Standard",
    material: "Letër me shtresë",
    image: "/media/collections/blanks/coffee-cups.webp",
  },
  {
    id: "pizza-boxes",
    number: "48",
    name: "Pizza Boxes",
    category: "Packaging",
    price: 180,
    quantityLabel: "100 copë",
    description: "Kuti pice me print 1–2 ngjyra në kapak.",
    tone: "paper",
    production: "Standard",
    material: "Karton i valëzuar",
    image: "/media/collections/blanks/pizza-boxes.webp",
  },
  {
    id: "takeaway-boxes",
    number: "49",
    name: "Takeaway Boxes",
    category: "Packaging",
    price: 110,
    quantityLabel: "200 copë",
    description: "Kuti ushqimi për takeaway, me logo ose ngjitëse.",
    tone: "paper",
    production: "Standard",
    material: "Karton",
    image: "/media/collections/blanks/takeaway-boxes.webp",
  },
  {
    id: "gift-boxes",
    number: "50",
    name: "Gift Boxes",
    category: "Packaging",
    price: 260,
    quantityLabel: "50 copë",
    description: "Kuti dhurate me kapak, me logo të shtypur ose me folie.",
    tone: "paper",
    production: "Standard",
    material: "Karton i fortë",
    image: "/media/collections/blanks/gift-boxes.webp",
  },
  {
    id: "stand-up-pouches",
    number: "51",
    name: "Stand-up Pouches",
    category: "Packaging",
    price: 150,
    quantityLabel: "100 copë",
    description: "Qese me zinxhir për kafe, çaj dhe ushqime, me print.",
    tone: "paper",
    production: "Standard",
    material: "Film i laminuar",
    image: "/media/collections/blanks/stand-up-pouches.webp",
  },
  {
    id: "tissue-paper",
    number: "52",
    name: "Tissue Paper",
    category: "Packaging",
    price: 95,
    quantityLabel: "250 fletë",
    description: "Letër mëndafshi me logo të përsëritur për paketim.",
    tone: "paper",
    production: "Standard",
    material: "Letër 17 g/m²",
    image: "/media/collections/blanks/tissue-paper.webp",
  },
  {
    id: "award-plaques",
    number: "53",
    name: "Award Plaques",
    category: "Promo",
    price: 35,
    quantityLabel: "1 copë",
    description: "Pllakë mirënjohjeje druri me pllakëz metalike të gdhendur me laser, për punonjës, partnerë dhe evente.",
    tone: "paper",
    production: "Standard",
    material: "Dru arre · alumin i gdhendur",
    image: "/media/collections/blanks/award-plaques.webp",
  },
  {
    id: "acrylic-awards",
    number: "54",
    name: "Acrylic Awards",
    category: "Promo",
    price: 29,
    quantityLabel: "1 copë",
    description: "Mirënjohje akrilike e prerë sipas formës, me print UV ose gdhendje.",
    tone: "paper",
    production: "Standard",
    material: "Akrilik 15 mm",
    image: "/media/collections/blanks/acrylic-awards.webp",
  },
  {
    id: "crystal-trophies",
    number: "55",
    name: "Crystal Trophies",
    category: "Promo",
    price: 45,
    quantityLabel: "1 copë",
    description: "Trofe kristali me gdhendje me laser, për çmime dhe përvjetorë.",
    tone: "paper",
    production: "Standard",
    material: "Kristal optik",
    image: "/media/collections/blanks/crystal-trophies.webp",
  },
  {
    id: "medals",
    number: "56",
    name: "Medals",
    category: "Promo",
    price: 120,
    quantityLabel: "50 copë",
    description: "Medalje metalike me shirit të printuar, për gara, shkolla dhe evente sportive.",
    tone: "paper",
    production: "Standard",
    material: "Metal · shirit poliester",
    image: "/media/collections/blanks/medals.webp",
  },
  {
    id: "frosted-glass-film",
    number: "57",
    name: "Frosted Glass Film",
    category: "Signage",
    price: 25,
    quantityLabel: "1 m²",
    description: "Folie e mjegullt për xhamat e zyrës, me shirit, logo ose motive të prera.",
    tone: "paper",
    production: "Custom",
    material: "Folie vinili e mjegullt",
    image: "/media/collections/blanks/frosted-glass-film.webp",
  },
  {
    id: "one-way-vision",
    number: "58",
    name: "One-way Vision",
    category: "Signage",
    price: 30,
    quantityLabel: "1 m²",
    description: "Folie e perforuar për vitrina: nga jashtë duket grafika, nga brenda sheh jashtë.",
    tone: "paper",
    production: "Custom",
    material: "Vinil i perforuar",
    image: "/media/collections/blanks/one-way-vision.webp",
  },
  {
    id: "glass-door-decals",
    number: "59",
    name: "Glass Door Decals",
    category: "Signage",
    price: 45,
    quantityLabel: "1 copë · deri 1 m²",
    description: "Ngjitëse për dyer xhami: logo, orari i punës dhe udhëzime.",
    tone: "paper",
    production: "Custom",
    material: "Vinil i prerë",
    image: "/media/collections/blanks/glass-door-decals.webp",
  },
  {
    id: "smart-film",
    number: "83",
    name: "Smart Glass",
    category: "Smart glass",
    price: 95,
    quantityLabel: "1 m² · me telekomandë",
    description:
      "Smart Glass: xham inteligjent që kalon nga i mjegullt në transparent me një shtypje të telekomandës. Për zyra, salla takimesh, klinika dhe banja. Sistemi përfshin transformatorin dhe telekomandën; matjen dhe montimin i bëjmë në vend.",
    tone: "paper",
    production: "Custom",
    material: "Sistem Smart Glass · transformator · telekomandë",
    badge: "New",
    featured: true,
    image: "/media/collections/blanks/smart-film-off.webp",
    video: {
      src: "/media/collections/blanks/smart-film.mp4",
      poster: "/media/collections/blanks/smart-film-off.webp",
    },
  },
  {
    id: "illuminated-3d-letters",
    number: "60",
    name: "Illuminated 3D Letters",
    category: "Signage",
    price: 480,
    quantityLabel: "1 set · deri 2 m",
    description: "Shkronja 3D me ndriçim LED për fasada, me logo dhe emrin e biznesit.",
    tone: "paper",
    production: "Custom",
    material: "Alumin · akrilik · LED",
    image: "/media/collections/blanks/illuminated-3d-letters.webp",
  },
  {
    id: "backlit-3d-logo",
    number: "61",
    name: "Backlit 3D Logo",
    category: "Signage",
    price: 320,
    quantityLabel: "1 copë · Ø 80 cm",
    description: "Logo 3D me ndriçim nga pas (halo) për recepsion dhe zyra.",
    tone: "paper",
    production: "Custom",
    material: "Inox · LED",
    image: "/media/collections/blanks/backlit-3d-logo.webp",
  },
  {
    id: "neon-signs",
    number: "62",
    name: "LED Neon Signs",
    category: "Signage",
    price: 180,
    quantityLabel: "1 copë · 60 cm",
    description: "Tabelë neon LED me logon ose një fjali, në ngjyrën që do.",
    tone: "paper",
    production: "Custom",
    material: "Neon LED fleksibël · akrilik",
    image: "/media/collections/blanks/neon-signs.webp",
  },
  {
    id: "pylon-signs",
    number: "63",
    name: "Pylon Signs",
    category: "Signage",
    price: 950,
    quantityLabel: "1 copë · 2,5 m",
    description: "Totem me ndriçim për hyrje, parkingje dhe pika shitjeje.",
    tone: "paper",
    production: "Custom",
    material: "Alumin · akrilik · LED",
    image: "/media/collections/blanks/pylon-signs.webp",
  },
  {
    id: "blade-signs",
    number: "64",
    name: "Blade Signs",
    category: "Signage",
    price: 260,
    quantityLabel: "1 copë · Ø 60 cm",
    description: "Tabelë e rrumbullakët me ndriçim, dyanëshe, që del nga muri.",
    tone: "paper",
    production: "Custom",
    material: "Alumin · akrilik · LED",
    image: "/media/collections/blanks/blade-signs.webp",
  },
  {
    id: "flags",
    number: "65",
    name: "Flags",
    category: "Signage",
    price: 35,
    quantityLabel: "1 copë · 100 × 150 cm",
    description: "Flamur me print full-color për shtizë, fasadë ose evente.",
    tone: "paper",
    production: "Custom",
    material: "Poliester flamuri",
    image: "/media/collections/blanks/flags.webp",
  },
  {
    id: "table-flags",
    number: "66",
    name: "Table Flags",
    category: "Promo",
    price: 15,
    quantityLabel: "1 copë",
    description: "Flamurë tavoline me mbajtëse metalike, për takime dhe konferenca.",
    tone: "paper",
    production: "Standard",
    material: "Satin · krom",
    image: "/media/collections/blanks/table-flags.webp",
  },
  {
    id: "teardrop-flags",
    number: "67",
    name: "Teardrop Flags",
    category: "Signage",
    price: 170,
    quantityLabel: "1 copë · 2,5 m",
    description: "Flamur në formë pike me shtyllë dhe bazë, për hyrje dhe evente.",
    tone: "paper",
    production: "Custom",
    material: "Poliester · fibër",
    image: "/media/collections/blanks/teardrop-flags.webp",
  },
  {
    id: "bunting",
    number: "68",
    name: "Bunting",
    category: "Promo",
    price: 40,
    quantityLabel: "10 m",
    description: "Varg flamujsh trekëndësh me logo ose ngjyra, për dyqane dhe festa.",
    tone: "paper",
    production: "Standard",
    material: "Poliester",
    image: "/media/collections/blanks/bunting.webp",
  },
  {
    id: "car-flags",
    number: "69",
    name: "Car Flags",
    category: "Promo",
    price: 12,
    quantityLabel: "1 copë",
    description: "Flamur për dritaren e makinës, për ndeshje dhe karvane.",
    tone: "paper",
    production: "Standard",
    material: "Poliester · plastikë",
    image: "/media/collections/blanks/car-flags.webp",
  },
  {
    id: "desk-mats",
    number: "70",
    name: "XXL Desk Mats",
    category: "Promo",
    price: 22,
    quantityLabel: "1 copë · 90 × 40 cm",
    description: "Shtroje e madhe tavoline për mausin dhe tastierën, me print full-color.",
    tone: "paper",
    production: "Standard",
    material: "Gome · pëlhurë",
    image: "/media/collections/blanks/desk-mats.webp",
  },
  {
    id: "round-mouse-pads",
    number: "71",
    name: "Round Mouse Pads",
    category: "Promo",
    price: 120,
    quantityLabel: "25 copë",
    description: "Shtroje mausi e rrumbullakët me print full-color.",
    tone: "paper",
    production: "Standard",
    material: "Gome · pëlhurë",
    image: "/media/collections/blanks/round-mouse-pads.webp",
  },
  {
    id: "ergonomic-mouse-pads",
    number: "72",
    name: "Ergonomic Mouse Pads",
    category: "Promo",
    price: 220,
    quantityLabel: "25 copë",
    description: "Shtroje mausi me mbështetëse dore prej xheli.",
    tone: "paper",
    production: "Standard",
    material: "Xhel · pëlhurë",
    image: "/media/collections/blanks/ergonomic-mouse-pads.webp",
  },
  {
    id: "pvc-cards",
    number: "73",
    name: "PVC Cards",
    category: "Print",
    price: 90,
    quantityLabel: "100 copë",
    description: "Karta plastike për anëtarësi, besnikëri dhe hyrje, me numër ose barkod.",
    tone: "paper",
    production: "Standard",
    material: "PVC 0,76 mm",
    image: "/media/collections/blanks/pvc-cards.webp",
  },
  {
    id: "name-badges",
    number: "74",
    name: "Name Badges",
    category: "Promo",
    price: 75,
    quantityLabel: "25 copë",
    description: "Etiketa emri metalike me magnet, për stafin.",
    tone: "paper",
    production: "Standard",
    material: "Alumin · magnet",
    image: "/media/collections/blanks/name-badges.webp",
  },
  {
    id: "patches",
    number: "75",
    name: "Embroidered Patches",
    category: "Textile",
    price: 90,
    quantityLabel: "50 copë",
    description: "Arna të qëndisura me logo, për veshje, kapele dhe çanta.",
    tone: "paper",
    production: "Standard",
    material: "Qëndisje · ngjitje me hekur",
    image: "/media/collections/blanks/patches.webp",
  },
  {
    id: "wristbands",
    number: "76",
    name: "Event Wristbands",
    category: "Promo",
    price: 60,
    quantityLabel: "100 copë",
    description: "Byzylykë për evente, me print ose numërim, silikoni ose tyvek.",
    tone: "paper",
    production: "Standard",
    material: "Silikon / tyvek",
    image: "/media/collections/blanks/wristbands.webp",
  },
  {
    id: "fridge-magnets",
    number: "77",
    name: "Fridge Magnets",
    category: "Promo",
    price: 70,
    quantityLabel: "100 copë",
    description: "Magnetë frigoriferi me print full-color, për restorante dhe agjenci.",
    tone: "paper",
    production: "Standard",
    material: "Magnet fleksibël",
    image: "/media/collections/blanks/fridge-magnets.webp",
  },
  {
    id: "wall-calendars",
    number: "78",
    name: "Wall Calendars",
    category: "Print",
    price: 180,
    quantityLabel: "25 copë",
    description: "Kalendar muri me 12 faqe dhe foto ose dizajn sipas brandit.",
    tone: "paper",
    production: "Standard",
    material: "Letër 170 g/m² · spirale",
    image: "/media/collections/blanks/wall-calendars.webp",
  },
  {
    id: "foam-boards",
    number: "79",
    name: "Foam Boards",
    category: "Signage",
    price: 35,
    quantityLabel: "1 copë · 70 × 100 cm",
    description: "Panel i lehtë për evente, ekspozita dhe udhëzime.",
    tone: "paper",
    production: "Custom",
    material: "Forex / foam 5 mm",
    image: "/media/collections/blanks/foam-boards.webp",
  },
  {
    id: "photo-books",
    number: "80",
    name: "Photo Books",
    category: "Print",
    price: 35,
    quantityLabel: "1 copë · 30 faqe",
    description: "Libër fotografish me kapak të fortë, për dasma, udhëtime dhe portofolio.",
    tone: "paper",
    production: "Standard",
    material: "Letër foto mat",
    image: "/media/collections/blanks/photo-books.webp",
  },
  {
    id: "puzzles",
    number: "81",
    name: "Puzzles",
    category: "Promo",
    price: 15,
    quantityLabel: "1 copë · 500 pjesë",
    description: "Puzzle me foton ose dizajnin tënd, në kuti të printuar.",
    tone: "paper",
    production: "Standard",
    material: "Karton 2 mm",
    image: "/media/collections/blanks/puzzles.webp",
  },
  {
    id: "canvas-prints",
    number: "82",
    name: "Canvas Prints",
    category: "Print",
    price: 45,
    quantityLabel: "1 copë · 60 × 90 cm",
    description: "Kanavacë e tendosur në kornizë druri, për zyra, hotele dhe restorante.",
    tone: "paper",
    production: "Standard",
    material: "Kanavacë pambuku · dru",
    image: "/media/collections/blanks/canvas-prints.webp",
  },
]

export function getProductBySlug(slug: string) {
  return products.find((product) => product.id === slug)
}
