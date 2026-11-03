import { productCategories, type Product } from "../../src/data/products.js"
import { HttpError, oneOf, text } from "./http.js"

const categories = productCategories
const tones = ["orange", "violet", "acid", "paper"] as const
const speeds = ["Fast", "Standard", "Custom"] as const
const badges = ["Bestseller", "New", "Eco"] as const

export function parseProduct(value: unknown): Product {
  if (!value || typeof value !== "object")
    throw new HttpError(400, "Produkti mungon.")
  const input = value as Record<string, unknown>

  const id = text(input.id, "slug", { max: 60, required: true })
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new HttpError(
      400,
      "Slug-u lejon vetëm shkronja të vogla, numra dhe viza.",
    )
  }

  const price = Number(input.price)
  if (!Number.isFinite(price) || price < 0 || price > 100_000) {
    throw new HttpError(400, "Çmimi nuk është valid.")
  }

  const badge = text(input.badge, "badge", { max: 20 })
  const image = text(input.image, "image", { max: 500 })
  const series = text(input.series, "seria", { max: 40 })
  const video =
    input.video && typeof input.video === "object"
      ? {
          src: text((input.video as Record<string, unknown>).src, "video", {
            max: 500,
            required: true,
          }),
          poster: text(
            (input.video as Record<string, unknown>).poster,
            "video poster",
            { max: 500, required: true },
          ),
        }
      : undefined

  let variants: Product["variants"]
  if (input.variants !== undefined) {
    if (!Array.isArray(input.variants) || input.variants.length > 60)
      throw new HttpError(400, "Lejohen deri në 60 opsione.")
    variants = input.variants.map((raw: unknown) => {
      if (!raw || typeof raw !== "object")
        throw new HttpError(400, "Opsion i pavlefshëm.")
      const item = raw as Record<string, unknown>
      const id = text(item.id, "ID e opsionit", { max: 60, required: true })
      if (!/^[a-z0-9-]+$/.test(id))
        throw new HttpError(
          400,
          "ID e opsionit lejon shkronja të vogla, numra dhe viza.",
        )
      const label = text(item.label, "emri i opsionit", {
        max: 60,
        required: true,
      })
      const price = item.price
      if (
        price !== undefined &&
        (typeof price !== "number" ||
          !Number.isFinite(price) ||
          price < 0 ||
          price > 100000)
      )
        throw new HttpError(400, "Çmim i pavlefshëm për opsionin.")
      const minQuantity = item.minQuantity
      if (
        minQuantity !== undefined &&
        (!Number.isInteger(minQuantity) ||
          (minQuantity as number) < 1 ||
          (minQuantity as number) > 100)
      )
        throw new HttpError(400, "Sasia minimale duhet të jetë 1–100.")
      return {
        id,
        label,
        ...(typeof price === "number"
          ? { price: Math.round(price * 100) / 100 }
          : {}),
        ...(typeof minQuantity === "number" && minQuantity > 1
          ? { minQuantity }
          : {}),
      }
    })
    if (new Set(variants.map((item) => item.id)).size !== variants.length)
      throw new HttpError(400, "ID-të e opsioneve duhet të jenë unike.")
  }
  const defaultVariantId = text(input.defaultVariantId, "opsioni fillestar", {
    max: 60,
  })
  if (
    defaultVariantId &&
    !variants?.some((item) => item.id === defaultVariantId)
  )
    throw new HttpError(400, "Opsioni fillestar nuk ekziston.")
  const variantLabel = text(input.variantLabel, "etiketa e opsioneve", {
    max: 40,
  })
  let includes: string[] | undefined
  if (input.includes !== undefined) {
    if (
      !Array.isArray(input.includes) ||
      input.includes.length > 40 ||
      input.includes.some(
        (item) =>
          typeof item !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item),
      )
    )
      throw new HttpError(
        400,
        "Lista e produkteve të paketës nuk është valide.",
      )
    includes = input.includes as string[]
  }
  // Gallery sets: one variant id per included poster.
  let includeVariants: string[] | undefined
  if (input.includeVariants !== undefined) {
    if (
      !includes ||
      !Array.isArray(input.includeVariants) ||
      input.includeVariants.length !== includes.length ||
      input.includeVariants.some(
        (item) => typeof item !== "string" || !/^[a-z0-9-]{1,60}$/.test(item),
      )
    )
      throw new HttpError(400, "Madhësitë e setit nuk janë valide.")
    includeVariants = input.includeVariants as string[]
  }

  return {
    id,
    number: text(input.number, "numri", { max: 6 }) || "00",
    name: text(input.name, "emri", { max: 120, required: true }),
    category: oneOf(input.category, categories, "kategori"),
    price: Math.round(price * 100) / 100,
    quantityLabel: text(input.quantityLabel, "sasia", {
      max: 60,
      required: true,
    }),
    description: text(input.description, "përshkrimi", {
      max: 600,
      required: true,
    }),
    tone: oneOf(input.tone, tones, "ngjyrë"),
    production: oneOf(input.production, speeds, "prodhim"),
    material: text(input.material, "materiali", { max: 80, required: true }),
    ...(badge ? { badge: oneOf(badge, badges, "badge") } : {}),
    ...(input.featured === true ? { featured: true } : {}),
    ...(image ? { image } : {}),
    ...(series ? { series } : {}),
    ...(includes?.length ? { includes } : {}),
    ...(includeVariants ? { includeVariants } : {}),
    ...(input.customImage === true ? { customImage: true } : {}),
    ...(video ? { video } : {}),
    ...(variants?.length
      ? {
          variants,
          ...(variantLabel ? { variantLabel } : {}),
          ...(defaultVariantId ? { defaultVariantId } : {}),
        }
      : {}),
  }
}
