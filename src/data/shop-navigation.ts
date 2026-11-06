import { shopHref, studioHref } from "@/lib/site-links"
import type { Product, ProductCategory } from "./products"

export const businessCategories: { value: ProductCategory; label: string }[] = [
  { value: "Print", label: "Printime" },
  { value: "Veshje", label: "Veshje" },
  { value: "Textile", label: "Çanta & tekstil" },
  { value: "Promo", label: "Produkte promocionale" },
  { value: "Packaging", label: "Ambalazh & paketim" },
  { value: "Signage", label: "Reklama & sinjalistikë" },
]

export const shopNavigation = [
  { label: "Krejt", value: "Krejt", href: shopHref("/shop#catalog") },
  {
    label: "Për biznese",
    value: "Biznes",
    href: shopHref("/shop?category=Biznes"),
  },
  {
    label: "Postera",
    value: "Postera",
    href: shopHref("/shop?category=Postera"),
  },
  { label: "Smart Glass", value: "Smart glass", href: shopHref("/shop/smart-glass") },
  { label: "Ftesa online", value: "Ftesa online", href: studioHref("/ftesa") },
  // Llampat janë të fshehura për momentin; produktet ruhen në katalog.
  // { label: "Llampa", value: "Llampa", href: shopHref("/shop?category=Llampa") },
]

export const LAMPS_ENABLED = false
export const isShopProduct = (product: Product) =>
  LAMPS_ENABLED || product.category !== "Llampa"

const collectionCategories = ["Postera", "Paketa", "Veshje", "Smart glass"]

export function matchesShopCategory(
  product: Product,
  category: string,
  search = "",
) {
  if (!isShopProduct(product)) return false
  if (category === "Krejt")
    return !!search.trim() || collectionCategories.includes(product.category)
  if (category === "Biznes")
    return !["Postera", "Paketa", "Foto", "Smart glass"].includes(product.category) && !product.customImage
  if (category === "Postera")
    return ["Postera", "Paketa"].includes(product.category)
  return product.category === category
}

export const shopCategoryLabel = (category: string) =>
  shopNavigation.find((item) => item.value === category)?.label ??
  businessCategories.find((item) => item.value === category)?.label ?? category

export const parentShopCategory = (category: string) =>
  businessCategories.some((item) => item.value === category) ? "Biznes" : category === "Paketa" ? "Postera" : category

type ShopCategoryOption = { label: string; value?: string; href?: string }

export function getShopCategoryOptions(category: string): ShopCategoryOption[] {
  const parent = parentShopCategory(category)
  if (parent === "Postera") {
    return [
      { label: "Krejt posterat", value: "Postera" },
      { label: "Paketa", value: "Paketa" },
      { label: "Konfiguro murin", href: shopHref("/shop/muri") },
      { label: "Printo foton", href: shopHref("/shop/foto") },
    ]
  }
  if (parent === "Biznes") {
    return [
      { label: "Krejt për biznese", value: "Biznes" },
      ...businessCategories,
    ]
  }
  return [{ label: shopCategoryLabel(category), value: category }]
}
