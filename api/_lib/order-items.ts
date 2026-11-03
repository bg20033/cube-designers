import type { Product } from "../../src/data/products.js"
import {
  getProductVariant,
  getSelection,
  sanitizePhoto,
} from "../../src/data/commerce.js"
import { HttpError } from "./http.js"

export function prepareOrderItems(input: unknown, products: Product[]) {
  if (!Array.isArray(input) || !input.length || input.length > 50)
    throw new HttpError(400, "Shporta është bosh ose ka shumë produkte.")
  const catalog = new Map(products.map((product) => [product.id, product]))
  return input.map((raw: unknown) => {
    const item = (raw ?? {}) as Record<string, unknown>
    const product = catalog.get(String(item.productId))
    const quantity = item.quantity
    if (!product)
      throw new HttpError(
        400,
        "Një produkt nuk është më i disponueshëm. Rifresko shportën.",
      )
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 999
    )
      throw new HttpError(400, "Sasia nuk është valide.")
    if (
      item.variantId !== undefined &&
      (typeof item.variantId !== "string" ||
        !getProductVariant(product, item.variantId))
    )
      throw new HttpError(
        400,
        "Opsioni i produktit nuk është më i disponueshëm.",
      )
    const selection = getSelection(
      product,
      item.variantId as string | undefined,
      !!(
        item.photo &&
        typeof item.photo === "object" &&
        (item.photo as Record<string, unknown>).landscape === true
      ),
    )
    // Photo prints need the customer's upload; nothing else may carry one.
    const photo =
      item.photo === undefined ? undefined : sanitizePhoto(item.photo)
    if (product.customImage ? !photo : item.photo !== undefined)
      throw new HttpError(
        400,
        product.customImage
          ? "Fotoja e ngarkuar mungon ose nuk është valide. Ngarkoje përsëri."
          : "Ky produkt nuk pranon foto.",
      )
    if (quantity < selection.minQuantity)
      throw new HttpError(
        400,
        `${selection.label} porositet minimum ${selection.minQuantity} copë.`,
      )
    // Bundles keep the posters they contain so the order can be printed.
    const includes = product.includes?.map((id, slot) => ({
      productId: id,
      name: catalog.get(id)?.name ?? id,
      // Gallery sets print each poster in its own size.
      ...(product.includeVariants?.[slot]
        ? { variantId: product.includeVariants[slot] }
        : {}),
    }))
    return {
      productId: product.id,
      name: product.name,
      ...(selection.variantId ? { variantId: selection.variantId } : {}),
      ...(includes?.length ? { includes } : {}),
      ...(photo ? { photo } : {}),
      quantityLabel: selection.label,
      price: selection.price,
      quantity,
      lineTotal: Math.round(selection.price * quantity * 100) / 100,
    }
  })
}
