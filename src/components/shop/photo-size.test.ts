import { describe, expect, it } from "vitest"
import {
  customSizeId,
  getPosterSize,
  parseVariantId,
  photoProduct,
  products,
} from "@/data/products"
import {
  addCartItem,
  getProductVariant,
  getSelection,
  resolveCart,
} from "@/data/commerce"
import { cropFor } from "@/lib/photo-upload"
import { prepareOrderItems } from "../../../api/_lib/order-items"
import { decodeWall, encodeWall, outerSize, type Wall } from "./wall-layout"
import { sizeForPhoto } from "./photo-size"

const photo = {
  image: "https://store1.public.blob.vercel-storage.com/foto/web/a.jpg",
  original:
    "https://store1.private.blob.vercel-storage.com/foto/original/a.jpg",
  crop: { x: 0, y: 0, w: 1, h: 1 },
  landscape: true,
}

describe("custom photo sizes", () => {
  it("stores millimetre precision in a canonical size and rejects unsupported sizes", () => {
    expect(customSizeId(45.5, 30)).toBe("custom300x455")
    expect(getPosterSize("custom300x455")?.cm).toEqual([30, 45.5])
    expect(parseVariantId("custom300x455-kornize-lisi")).toEqual({
      size: "custom300x455",
      finish: "kornize-lisi",
    })
    for (const size of [
      [0, 30],
      [9.9, 30],
      [50.1, 60],
      [30, 70.1],
      [NaN, 30],
      [30.123, 45],
    ])
      expect(customSizeId(size[0], size[1])).toBeUndefined()
    for (const id of [
      "custom455x300",
      "custom000x455",
      "custom100x999",
      "custom30x45",
    ])
      expect(getPosterSize(id)).toBeUndefined()
  })
  it("fits square, portrait and landscape photo proportions with negligible cropping", () => {
    expect(sizeForPhoto(1.5)).toEqual([40, 26.7])
    expect(sizeForPhoto(0.75)).toEqual([30, 40])
    expect(sizeForPhoto(1)).toEqual([40, 40])
    expect(sizeForPhoto(8)).toBeUndefined()
    const dims = sizeForPhoto(1.5)!
    const crop = cropFor(
      { width: 6000, height: 4000 },
      dims[0] / dims[1],
      1,
      0.5,
      0.5,
    )
    expect(crop.w).toBeGreaterThan(0.998)
    expect(crop.h).toBeGreaterThan(0.998)
  })
  it("quotes from the actual catalog tariff and refuses custom variants on ordinary posters", () => {
    expect(getSelection(photoProduct, "custom300x450").price).toBe(15)
    expect(getSelection(photoProduct, "custom300x400").price).toBe(11)
    expect(getSelection(photoProduct, "custom100x100")).toMatchObject({
      price: 3,
      minQuantity: 1,
    })
    expect(
      getSelection(photoProduct, "custom300x455-kornize-lisi", true).label,
    ).toContain("45,5 × 30 cm")
    expect(
      getProductVariant(
        products.find((product) => product.id === "diell")!,
        "custom300x400",
      ),
    ).toBeUndefined()
    const updated = {
      ...photoProduct,
      variants: photoProduct.variants!.map((variant) =>
        ["a2", "50x70"].includes(variant.id)
          ? { ...variant, price: 48 }
          : variant,
      ),
    }
    expect(getSelection(updated, "custom300x450").price).toBe(48)
  })
  it("keeps custom dimensions, orientation and server-calculated prices through cart and order", () => {
    const cart = addCartItem(
      [],
      photoProduct,
      "custom300x455-kornize-lisi",
      photo,
    )
    const resolved = resolveCart(cart, products)
    expect(resolved.unavailable).toEqual([])
    expect(resolved.lines[0].selection.label).toContain("45,5 × 30 cm")
    const order = prepareOrderItems(
      [{ ...cart[0], price: 0.01, lineTotal: 0.01 }],
      products,
    )
    expect(order[0]).toMatchObject({
      variantId: "custom300x455-kornize-lisi",
      quantity: 1,
      price: 37,
      lineTotal: 37,
      photo,
    })
    expect(order[0].quantityLabel).toContain("45,5 × 30 cm")
    expect(() =>
      prepareOrderItems([{ ...cart[0], variantId: "custom999x999" }], products),
    ).toThrow()
  })
  it("retains a custom photo's geometry in shared walls", () => {
    const wall: Wall = {
      width: 300,
      height: 260,
      color: "#f3f1ec",
      sofa: true,
      grid: false,
      items: [
        {
          uid: "custom",
          productId: "foto",
          variant: "custom300x455-kornize-lisi",
          photo,
          x: 150,
          y: 95,
        },
      ],
    }
    const restored = decodeWall(
      encodeWall(wall),
      new Map(products.map((product) => [product.id, product])),
    )!
    expect(restored.items).toHaveLength(1)
    expect(outerSize(restored.items[0])).toEqual([49.5, 34])
  })
})
