import {
  getFinish,
  getPosterSize,
  parseVariantId,
  type CartItem,
  type PhotoSpec,
  type Product,
  type ProductVariant,
} from "./products.js"

export function getProductVariant(
  product: Product,
  variantId?: string,
): ProductVariant | undefined {
  const standard =
    product.variants?.find(
      (variant) => variant.id === (variantId ?? product.defaultVariantId),
    ) ?? (variantId ? undefined : product.variants?.[0])
  if (standard) return standard
  const parsed = parseVariantId(variantId)
  if (!product.customImage || !parsed?.size.startsWith("custom"))
    return undefined
  const size = getPosterSize(parsed.size)!
  // Use the least expensive existing single-print format that can contain
  // both dimensions. Never trust a price sent by the browser or use A6's
  // discounted batch tariff for a single custom print.
  const rates = (product.variants ?? [])
    .flatMap((variant) => {
      const option = parseVariantId(variant.id)
      if (
        !option ||
        option.size.startsWith("custom") ||
        option.finish !== parsed.finish ||
        (variant.minQuantity ?? 1) > 1
      )
        return []
      const cm = getPosterSize(option.size)!.cm
      if (cm[0] + 0.0001 < size.cm[0] || cm[1] + 0.0001 < size.cm[1]) return []
      return [{ price: variant.price ?? product.price, area: cm[0] * cm[1] }]
    })
    .sort((a, b) => a.price - b.price || a.area - b.area)
  if (!rates.length) return undefined
  return {
    id: variantId!,
    label: `${size.label}${parsed.finish === "leter" ? "" : ` · ${getFinish(parsed.finish)!.label}`}`,
    price: rates[0].price,
    minQuantity: 1,
  }
}

export function getSelection(
  product: Product,
  variantId?: string,
  landscape = false,
) {
  const variant = getProductVariant(product, variantId)
  const parsed = variant && parseVariantId(variant.id)
  const custom =
    parsed?.size.startsWith("custom") && landscape
      ? getPosterSize(parsed.size)
      : undefined
  const label = custom
    ? `${String(custom.cm[1]).replace(".", ",")} × ${String(custom.cm[0]).replace(".", ",")} cm · Custom${parsed!.finish === "leter" ? "" : ` · ${getFinish(parsed!.finish)!.label}`}`
    : variant?.label
  return {
    variantId: variant?.id,
    label: variant
      ? `${product.variantLabel ?? "Opsioni"}: ${label}`
      : product.quantityLabel,
    price: variant?.price ?? product.price,
    minQuantity: variant?.minQuantity ?? 1,
  }
}

// Every photo print is its own line, even in the same size.
export function cartLineKey(
  item: Pick<CartItem, "productId" | "variantId" | "photo">,
) {
  const photo = item.photo
    ? `:${item.photo.original}:${Object.values(item.photo.crop).join(",")}:${item.photo.landscape ? "l" : "p"}`
    : ""
  return `${item.productId}:${item.variantId ?? ""}${photo}`
}

// Uploaded photos live in Vercel Blob under /foto/: the working copy in the
// public store area, the original in the private one.
export function isPhotoUrl(value: unknown, access: "public" | "private") {
  if (typeof value !== "string" || value.length > 500) return false
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(`.${access}.blob.vercel-storage.com`) &&
      url.pathname.startsWith("/foto/")
    )
  } catch {
    return false
  }
}

export function sanitizePhoto(value: unknown): PhotoSpec | undefined {
  if (!value || typeof value !== "object") return undefined
  const input = value as Record<string, unknown>
  const crop = (input.crop ?? {}) as Record<string, unknown>
  const [x, y, w, h] = ["x", "y", "w", "h"].map((key) => crop[key])
  if (
    !isPhotoUrl(input.image, "public") ||
    !isPhotoUrl(input.original, "private") ||
    ![x, y, w, h].every(
      (number) => typeof number === "number" && Number.isFinite(number),
    )
  )
    return undefined
  const box = { x, y, w, h } as PhotoSpec["crop"]
  if (
    box.x < 0 ||
    box.y < 0 ||
    box.w < 0.02 ||
    box.h < 0.02 ||
    box.x + box.w > 1.0001 ||
    box.y + box.h > 1.0001
  )
    return undefined
  const name =
    typeof input.name === "string" ? input.name.trim().slice(0, 80) : ""
  return {
    image: input.image as string,
    original: input.original as string,
    crop: box,
    ...(input.landscape === true ? { landscape: true } : {}),
    ...(name ? { name } : {}),
  }
}

export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return []
  const result = new Map<string, CartItem>()
  for (const item of value.slice(0, 50)) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.productId !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.productId) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 999 ||
      (item.variantId !== undefined &&
        (typeof item.variantId !== "string" ||
          !/^[a-z0-9-]{1,60}$/.test(item.variantId)))
    )
      continue
    const photo =
      item.photo === undefined ? undefined : sanitizePhoto(item.photo)
    if (item.photo !== undefined && !photo) continue
    const clean: CartItem = {
      productId: item.productId,
      quantity: item.quantity,
      ...(item.variantId ? { variantId: item.variantId } : {}),
      ...(photo ? { photo } : {}),
    }
    const key = cartLineKey(clean)
    result.set(key, {
      ...clean,
      quantity: Math.min(
        999,
        (result.get(key)?.quantity ?? 0) + clean.quantity,
      ),
    })
  }
  return [...result.values()]
}

export function resolveCart(cart: CartItem[], catalog: Product[]) {
  const unavailable: CartItem[] = []
  const lines = cart.flatMap((item) => {
    const product = catalog.find((candidate) => candidate.id === item.productId)
    if (
      !product ||
      (item.variantId && !getProductVariant(product, item.variantId)) ||
      !product.customImage !== !item.photo
    ) {
      unavailable.push(item)
      return []
    }
    const selection = getSelection(
      product,
      item.variantId,
      item.photo?.landscape,
    )
    // Carts saved before a minimum existed are raised to it.
    const quantity = Math.max(item.quantity, selection.minQuantity)
    return [{ ...item, quantity, product, selection, key: cartLineKey(item) }]
  })
  return { lines, unavailable }
}

export function addCartItem(
  cart: CartItem[],
  product: Product,
  variantId?: string,
  photo?: PhotoSpec,
) {
  const selection = getSelection(product, variantId)
  const key = cartLineKey({
    productId: product.id,
    variantId: selection.variantId,
    photo,
  })
  const match = (item: CartItem) =>
    item.productId === product.id &&
    cartLineKey({
      ...item,
      variantId: getSelection(product, item.variantId).variantId,
    }) === key
  if (cart.some(match))
    return cart.map((item) =>
      match(item)
        ? { ...item, quantity: Math.min(item.quantity + 1, 999) }
        : item,
    )
  if (cart.length >= 50) return cart
  return [
    ...cart,
    {
      productId: product.id,
      quantity: selection.minQuantity,
      ...(selection.variantId ? { variantId: selection.variantId } : {}),
      ...(photo ? { photo } : {}),
    },
  ]
}
