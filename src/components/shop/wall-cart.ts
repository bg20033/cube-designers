import { cartLineKey, getProductVariant, getSelection } from "@/data/commerce"
import type { CartItem, Product } from "@/data/products"
import { MAX_ITEMS, wallVariants, type WallItem } from "./wall-layout"

// What moves between the wall planner and the cart: prints for a product or
// a cart, and the cart lines a wall adds up to.

export function newUid() {
  return `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

// Wall items for a poster, or for each poster of a bundle, in the size and
// finish the product opens with; a gallery set gives each poster its own.
export function itemsFor(
  product: Product,
  catalog: Map<string, Product>,
): WallItem[] {
  return (product.includes ?? [product.id]).flatMap((id, slot) => {
    const poster = catalog.get(id)
    const variants = poster ? wallVariants(poster) : []
    const variant =
      variants.find(
        (option) =>
          option.id ===
          (product.includeVariants?.[slot] ?? product.defaultVariantId),
      ) ??
      variants.find((option) => option.id === poster?.defaultVariantId) ??
      variants[0]
    if (!poster || !variant) return []
    return [{ uid: newUid(), productId: id, variant: variant.id, x: 0, y: 0 }]
  })
}

// Wall items for the cart's posters, photos and bundles, one per copy, and
// the keys of the cart lines they came from. A6 cards and other products stay
// in the cart only; a line that would not fit whole is left out.
export function cartItemsForWall(
  cart: CartItem[],
  catalog: Map<string, Product>,
) {
  const items: WallItem[] = []
  const keys: string[] = []
  for (const line of cart) {
    const product = catalog.get(line.productId)
    if (!product) continue
    const posters = (product.includes ?? [product.id]).map((id) =>
      catalog.get(id),
    )
    const variantAt = (slot: number) =>
      product.includeVariants?.[slot] ?? line.variantId
    const fits = posters.every(
      (poster, slot) =>
        poster &&
        (wallVariants(poster).some((option) => option.id === variantAt(slot)) ||
          (poster.customImage &&
            line.photo &&
            getProductVariant(poster, line.variantId))),
    )
    if (!fits || items.length + posters.length * line.quantity > MAX_ITEMS)
      continue
    keys.push(cartLineKey(line))
    for (let copy = 0; copy < line.quantity; copy++)
      for (const [slot, poster] of posters.entries())
        items.push({
          uid: newUid(),
          productId: poster!.id,
          variant: variantAt(slot)!,
          x: 0,
          y: 0,
          ...(line.photo ? { photo: line.photo } : {}),
        })
  }
  return { items, keys }
}

export type WallLine = {
  key: string
  product: Product
  variant: string
  label: string
  photo?: WallItem["photo"]
  uids: string[]
  count: number
  price: number
}

// One cart line per poster, size and photo. A full set of a bundle's posters
// in the bundle's sizes is priced as that bundle; larger sets are matched
// first so a small bundle does not take their posters.
export function summarizeWall(
  items: WallItem[],
  catalog: Map<string, Product>,
  bundles: Product[],
) {
  const lines = new Map<string, WallLine>()
  const free = new Map(items.map((item) => [item.uid, item]))
  const addLine = (
    product: Product,
    variant: string,
    uids: string[],
    photo?: WallItem["photo"],
  ) => {
    const key = `${product.id}:${variant}:${photo ? JSON.stringify(photo) : ""}`
    const line = lines.get(key)
    if (line) {
      line.count++
      line.uids.push(...uids)
      return
    }
    const selection = getSelection(product, variant, photo?.landscape)
    lines.set(key, {
      key,
      product,
      variant,
      label: selection.label.replace(/^[^:]+: /, ""),
      photo,
      uids,
      count: 1,
      price: selection.price,
    })
  }
  const bySize = [...bundles].sort(
    (a, b) => (b.includes?.length ?? 0) - (a.includes?.length ?? 0),
  )
  for (const bundle of bySize)
    for (const option of bundle.variants ?? [])
      for (;;) {
        const taken = new Set<string>()
        const set = (bundle.includes ?? []).map((id, slot) => {
          const match = [...free.values()].find(
            (item) =>
              !taken.has(item.uid) &&
              item.productId === id &&
              item.variant === (bundle.includeVariants?.[slot] ?? option.id) &&
              !item.photo,
          )
          if (match) taken.add(match.uid)
          return match
        })
        if (!set.length || set.some((item) => !item)) break
        for (const item of set) free.delete(item!.uid)
        addLine(
          bundle,
          option.id,
          set.map((item) => item!.uid),
        )
      }
  for (const item of free.values()) {
    const product = catalog.get(item.productId)
    if (product && getProductVariant(product, item.variant))
      addLine(product, item.variant, [item.uid], item.photo)
  }
  const list = [...lines.values()]
  return {
    lines: list,
    total: list.reduce((sum, line) => sum + line.count * line.price, 0),
  }
}
