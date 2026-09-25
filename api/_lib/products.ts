import type { Product } from "../../src/data/products.js"
import { HttpError, oneOf, text } from "./http.js"

const categories = ["Print", "Promo", "Textile", "Packaging", "Signage"] as const
const tones = ["orange", "violet", "acid", "paper"] as const
const speeds = ["Fast", "Standard", "Custom"] as const
const badges = ["Bestseller", "New", "Eco"] as const

export function parseProduct(value: unknown): Product {
  if (!value || typeof value !== "object") throw new HttpError(400, "Produkti mungon.")
  const input = value as Record<string, unknown>

  const id = text(input.id, "slug", { max: 60, required: true })
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new HttpError(400, "Slug-u lejon vetëm shkronja të vogla, numra dhe viza.")
  }

  const price = Number(input.price)
  if (!Number.isFinite(price) || price < 0 || price > 100_000) {
    throw new HttpError(400, "Çmimi nuk është valid.")
  }

  const badge = text(input.badge, "badge", { max: 20 })
  const image = text(input.image, "image", { max: 500 })

  return {
    id,
    number: text(input.number, "numri", { max: 6 }) || "00",
    name: text(input.name, "emri", { max: 120, required: true }),
    category: oneOf(input.category, categories, "kategori"),
    price: Math.round(price * 100) / 100,
    quantityLabel: text(input.quantityLabel, "sasia", { max: 60, required: true }),
    description: text(input.description, "përshkrimi", { max: 600, required: true }),
    tone: oneOf(input.tone, tones, "ngjyrë"),
    production: oneOf(input.production, speeds, "prodhim"),
    material: text(input.material, "materiali", { max: 80, required: true }),
    ...(badge ? { badge: oneOf(badge, badges, "badge") } : {}),
    ...(input.featured === true ? { featured: true } : {}),
    ...(image ? { image } : {}),
  }
}
