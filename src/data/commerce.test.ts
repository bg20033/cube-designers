import { describe, expect, it } from "vitest"
import {
  addCartItem,
  getSelection,
  resolveCart,
  sanitizeCart,
  sanitizePhoto,
} from "./commerce"
import {
  getPosterSize,
  parseVariantId,
  posterSizes,
  products,
} from "./products"
import { archivePosters } from "./archive-posters"
import { bundleDefinitions } from "./bundles"
import { prepareOrderItems } from "../../api/_lib/order-items"
import { parseProduct } from "../../api/_lib/products"

const shirt = products.find((product) => product.id === "tshirts")!
const poster = products.find((product) => product.id === "forma-blue")!

describe("product selections", () => {
  it("keeps different sizes separate and merges repeated selections", () => {
    let cart = addCartItem([], shirt, "l")
    cart = addCartItem(cart, shirt, "xl")
    cart = addCartItem(cart, shirt, "l")
    expect(cart).toEqual([
      { productId: shirt.id, quantity: 2, variantId: "l" },
      { productId: shirt.id, quantity: 1, variantId: "xl" },
    ])
    expect(getSelection(shirt).variantId).toBe("m")
  })
  it("migrates legacy cart defaults without duplicating the same size", () => {
    expect(
      addCartItem([{ productId: shirt.id, quantity: 1 }], shirt, "m"),
    ).toEqual([{ productId: shirt.id, quantity: 2 }])
  })
  it("rejects malformed storage and preserves valid lines", () => {
    expect(sanitizeCart({ broken: true })).toEqual([])
    expect(
      sanitizeCart([
        null,
        { productId: shirt.id, quantity: -5 },
        { productId: shirt.id, quantity: 1.5 },
        { productId: shirt.id, quantity: 2 },
        { productId: shirt.id, quantity: 3 },
      ]),
    ).toEqual([{ productId: shirt.id, quantity: 5 }])
  })
  it("separates unavailable products and removed variants from valid selections", () => {
    const result = resolveCart(
      [
        { productId: shirt.id, quantity: 1, variantId: "removed" },
        { productId: "missing", quantity: 1 },
        { productId: poster.id, quantity: 2, variantId: "a2" },
      ],
      products,
    )
    expect(result.unavailable).toHaveLength(2)
    expect(result.lines[0].selection.price * result.lines[0].quantity).toBe(30)
  })
})

describe("server product and price validation", () => {
  it("calculates variant prices from the catalog and ignores browser totals", () => {
    expect(
      prepareOrderItems(
        [
          {
            productId: poster.id,
            quantity: 2,
            variantId: "a2",
            price: 0,
            total: 0,
          },
        ],
        products,
      )[0],
    ).toMatchObject({
      price: 15,
      lineTotal: 30,
      variantId: "a2",
      quantityLabel: "Formati: A2 · 42 × 59,4 cm",
    })
  })
  it("rejects invalid quantities, missing products, and unknown variants", () => {
    for (const quantity of [0, -1, 1.5, 1000, "1"])
      expect(() =>
        prepareOrderItems([{ productId: shirt.id, quantity }], products),
      ).toThrow()
    expect(() =>
      prepareOrderItems(
        [{ productId: shirt.id, quantity: 1, variantId: "not-a-size" }],
        products,
      ),
    ).toThrow()
    expect(() =>
      prepareOrderItems([{ productId: "missing", quantity: 1 }], products),
    ).toThrow()
  })
  it("preserves valid admin variants and rejects invalid defaults or duplicate IDs", () => {
    expect(parseProduct(poster).variants).toEqual(poster.variants)
    expect(() =>
      parseProduct({ ...poster, defaultVariantId: "missing" }),
    ).toThrow()
    expect(() =>
      parseProduct({
        ...poster,
        variants: [poster.variants![0], poster.variants![0]],
      }),
    ).toThrow()
    expect(() =>
      parseProduct({
        ...poster,
        variants: [{ id: "test", label: "Test", price: -1 }],
      }),
    ).toThrow()
  })
  it("keeps a product's demo video when the dashboard saves it", () => {
    const film = products.find((product) => product.id === "smart-film")!
    expect(film.video).toBeDefined()
    expect(parseProduct(film).video).toEqual(film.video)
  })
})

describe("bundles and print sizes", () => {
  const bundles = products.filter((product) => product.category === "Paketa")

  it("only offers bundle sizes that every poster inside can be printed at", () => {
    expect(bundles.length).toBeGreaterThan(0)
    for (const bundle of bundles) {
      const posters = bundle.includes!.map((id) =>
        products.find((product) => product.id === id),
      )
      expect(posters.every(Boolean)).toBe(true)
      // Sets fix a size per poster; three-poster bundles share one.
      const sizes = (slot: number) =>
        bundle.includeVariants
          ? [bundle.includeVariants[slot]]
          : bundle.variants!.map((variant) => variant.id)
      posters.forEach((poster, slot) => {
        for (const size of sizes(slot))
          expect(poster!.variants!.map((item) => item.id)).toContain(size)
      })
    }
  })
  it("keeps the posters of a bundle on the order line for printing", () => {
    const bundle = bundles[0]
    const [line] = prepareOrderItems(
      [
        {
          productId: bundle.id,
          quantity: 1,
          variantId: bundle.defaultVariantId,
        },
      ],
      products,
    )
    expect(line.includes?.map((item) => item.productId)).toEqual(
      bundle.includes,
    )
    expect(parseProduct(bundle).includes).toEqual(bundle.includes)
    expect(() =>
      parseProduct({ ...bundle, includes: ["Not A Slug"] }),
    ).toThrow()
  })
  it("sells archive scans only in the sizes their resolution carries", () => {
    for (const poster of archivePosters) {
      const product = products.find((item) => item.id === poster.slug)
      if (poster.width < posterSizes[0].minWidth) {
        expect(product).toBeUndefined()
        continue
      }
      const sizes = product!.variants!.map((variant) => variant.id)
      for (const size of posterSizes)
        expect(sizes.includes(size.id)).toBe(poster.width >= size.minWidth)
    }
  })
  it("offers posters and bundles only in A5, A4, A3 and A2", () => {
    const allowed = ["a5", "a4", "a3", "a2"]
    expect(posterSizes.map((size) => size.id)).toEqual(allowed)
    for (const product of products.filter((item) => ["Postera", "Paketa"].includes(item.category))) {
      for (const id of product.includeVariants ?? product.variants!.map((variant) => variant.id)) {
        if (id !== "set") expect(allowed).toContain(parseVariantId(id)?.size)
      }
      expect(product.variants!.some((variant) => variant.id === product.defaultVariantId)).toBe(true)
    }
    for (const variantId of ["a6", "30x40", "50x70", "50x70-pleksi"])
      expect(() => prepareOrderItems([{ productId: poster.id, quantity: 1, variantId }], products)).toThrow(/disponueshëm/)
  })
})

describe("finishes and photo prints", () => {
  const photoProduct = products.find((product) => product.customImage)!
  const photo = {
    image: "https://store1.public.blob.vercel-storage.com/foto/web/a.jpg",
    original:
      "https://store1.private.blob.vercel-storage.com/foto/original/a.jpg",
    crop: { x: 0, y: 0.1, w: 1, h: 0.8 },
  }

  it("names finishes in the variant and prices them per size", () => {
    expect(parseVariantId("50x70-kornize-zeze")).toEqual({
      size: "50x70",
      finish: "kornize-zeze",
    })
    expect(parseVariantId("30x40")).toEqual({ size: "30x40", finish: "leter" })
    expect(parseVariantId("a6-pleksi")).toBeDefined()
    expect(getSelection(poster, "a2-pleksi")).toMatchObject({
      price: 25,
      label: "Formati: A2 · 42 × 59,4 cm · Pleksiglas",
    })
    // Canvas starts at A4; A5 remains available on paper and acrylic.
    expect(getSelection(poster, "a5-kanavace").variantId).toBeUndefined()
    expect(getSelection(poster, "a6-kanavace").variantId).toBeUndefined()
  })
  it("accepts only Vercel Blob photo uploads with a sane crop", () => {
    expect(sanitizePhoto(photo)).toEqual(photo)
    expect(sanitizePhoto({ ...photo, image: photo.original })).toBeUndefined()
    expect(
      sanitizePhoto({ ...photo, original: "https://example.com/foto/a.jpg" }),
    ).toBeUndefined()
    expect(
      sanitizePhoto({ ...photo, crop: { x: 0.5, y: 0, w: 0.8, h: 1 } }),
    ).toBeUndefined()
  })
  it("requires a photo for photo prints and refuses one elsewhere", () => {
    const [line] = prepareOrderItems(
      [
        {
          productId: photoProduct.id,
          quantity: 1,
          variantId: "a3-kanavace",
          photo,
        },
      ],
      products,
    )
    expect(line).toMatchObject({ price: 19, photo })
    expect(() =>
      prepareOrderItems(
        [{ productId: photoProduct.id, quantity: 1, variantId: "a3" }],
        products,
      ),
    ).toThrow(/Fotoja/)
    expect(() =>
      prepareOrderItems(
        [{ productId: poster.id, quantity: 1, variantId: "a3", photo }],
        products,
      ),
    ).toThrow()
  })
  it("keeps every photo on its own cart line", () => {
    let cart = addCartItem([], photoProduct, "30x40", photo)
    cart = addCartItem(cart, photoProduct, "30x40", {
      ...photo,
      crop: { x: 0, y: 0, w: 1, h: 0.8 },
    })
    cart = addCartItem(cart, photoProduct, "30x40", photo)
    expect(cart.map((item) => item.quantity)).toEqual([2, 1])
    expect(sanitizeCart(cart)).toHaveLength(2)
    expect(
      resolveCart([{ productId: photoProduct.id, quantity: 1 }], products)
        .unavailable,
    ).toHaveLength(1)
  })
})

describe("gallery sets", () => {
  const sets = products.filter((product) => product.includeVariants)
  it("builds every set with one size per poster, cheaper than buying singly", () => {
    expect(sets.map((set) => set.id)).toEqual(
      expect.arrayContaining([
        "set-hollywood-12-a3",
        "set-monstrat-mozaik",
        "set-muzeu-mozaik",
      ]),
    )
    for (const set of sets) {
      expect(set.includeVariants).toHaveLength(set.includes!.length)
      expect(set.includes!.length).toBeGreaterThanOrEqual(4)
      const single = set.includeVariants!.reduce(
        (total, size) => total + getPosterSize(size)!.price,
        0,
      )
      expect(set.price).toBeLessThan(single)
      expect(set.price % 10).toBe(9)
    }
  })
  it("builds every bundle and set that is defined, mega sets included", () => {
    for (const bundle of bundleDefinitions)
      expect(products.some((product) => product.id === bundle.id)).toBe(true)
    expect(
      sets.filter((set) => set.includes!.length >= 20).length,
    ).toBeGreaterThanOrEqual(5)
  })
  it("orders keep each poster's size for printing", () => {
    const [line] = prepareOrderItems(
      [{ productId: "set-monstrat-mozaik", variantId: "set", quantity: 1 }],
      products,
    )
    expect(line.includes?.[0]).toMatchObject({
      productId: "kinema-king-kong",
      variantId: "a2",
    })
    expect(line.includes?.at(-1)).toMatchObject({ variantId: "a4" })
  })
})
