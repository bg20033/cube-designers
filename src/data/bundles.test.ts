import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parseBundles } from "../../scripts/bundle-source.mjs"
import { prepareOrderItems } from "../../api/_lib/order-items"
import { printCommand } from "@/components/admin/print-command"
import type { Order } from "@/components/admin/types"
import {
  cartItemsForWall,
  itemsFor,
  summarizeWall,
} from "@/components/shop/wall-cart"
import {
  MAX_ITEMS,
  addToWall,
  collides,
  outerSize,
  type Wall,
} from "@/components/shop/wall-layout"
import { addCartItem, resolveCart } from "./commerce"
import { BUNDLE_PRICES, bundleDefinitions, setDiscount } from "./bundles"
import { getPosterSize, products, type Product } from "./products"

// Every bundle and gallery set, checked end to end: the data, the price, the
// cart, the order, the print command, the wall planner and the scripts.

const catalog = new Map(products.map((product) => [product.id, product]))
const bundles = products.filter((product) => product.category === "Paketa")
const sets = bundles.filter((product) => product.includeVariants)
const threes = bundles.filter((product) => !product.includeVariants)
const singles = (product: Product, variant: string) =>
  (product.includeVariants ?? product.includes!.map(() => variant)).reduce(
    (total, size) => total + getPosterSize(size)!.price,
    0,
  )
const emptyWall: Wall = {
  width: 300,
  height: 260,
  color: "#f3f1ec",
  sofa: true,
  grid: false,
  items: [],
}

describe("bundle data", () => {
  it("never repeats the same posters in another bundle of the same kind", () => {
    const seen = new Map<string, string>()
    for (const bundle of bundles) {
      const key = `${[...bundle.includes!].sort().join(",")}|${bundle.includeVariants?.join(",") ?? "any"}`
      expect(
        seen.get(key),
        `${bundle.id} repeats ${seen.get(key)}`,
      ).toBeUndefined()
      seen.set(key, bundle.id)
    }
  })
  it("has unique ids and names, and builds every definition", () => {
    const ids = products.map((product) => product.id)
    expect(new Set(ids).size).toBe(ids.length)
    const names = bundles.map((bundle) => bundle.name)
    expect(new Set(names).size).toBe(names.length)
    expect(bundles.map((bundle) => bundle.id).sort()).toEqual(
      bundleDefinitions.map((bundle) => bundle.id).sort(),
    )
  })
  for (const bundle of bundles)
    it(`${bundle.id}: lists distinct posters that exist`, () => {
      const includes = bundle.includes!
      expect(new Set(includes).size).toBe(includes.length)
      for (const id of includes)
        expect(catalog.get(id)?.category, id).toBe("Postera")
      if (bundle.includeVariants)
        expect(bundle.includeVariants).toHaveLength(includes.length)
      expect(includes.length).toBeLessThanOrEqual(MAX_ITEMS)
      expect(bundle.quantityLabel).toContain(`${includes.length} postera`)
      expect(
        existsSync(`public${bundle.image}`),
        `missing image ${bundle.image}`,
      ).toBe(true)
    })
})

// Museum posters carry their artist; a bundle named after an artist holds
// only their work, and every artist a tagline promises is in the bundle.
const museumSource = readFileSync("src/data/museum-posters.ts", "utf8")
const artists = new Map<string, string>(
  JSON.parse(museumSource.slice(museumSource.indexOf("= [") + 2)).map(
    (poster: { slug: string; artist: string }) => [poster.slug, poster.artist],
  ),
)
const named = [
  "Monet",
  "Van Gogh",
  "Gauguin",
  "Hokusai",
  "Hiroshige",
  "Toulouse-Lautrec",
  "Mucha",
  "Seurat",
  "Renoir",
  "Utamaro",
]
describe("bundle artists", () => {
  for (const bundle of bundles) {
    const works = bundle.includes!.flatMap((id) => artists.get(id) ?? [])
    const inName = named.filter((artist) => bundle.name.includes(artist))
    const inTagline = named.filter((artist) =>
      bundle.description.includes(artist),
    )
    if (!inName.length && !inTagline.length) continue
    it(`${bundle.id}: holds the artists it names`, () => {
      for (const artist of inName)
        expect(
          works.length === bundle.includes!.length &&
            works.every((work) =>
              work.toLowerCase().includes(artist.toLowerCase()),
            ),
          `${bundle.name} should be all ${artist}`,
        ).toBe(true)
      for (const artist of inTagline)
        expect(
          works.some((work) =>
            work.includes(artist.replace("Van Gogh", "van Gogh")),
          ),
          `${bundle.id} promises ${artist}`,
        ).toBe(true)
    })
  }
})

describe("bundle prices", () => {
  for (const bundle of threes)
    it(`${bundle.id}: every size is cheaper than three singles`, () => {
      expect(bundle.variants!.length).toBeGreaterThan(0)
      expect(
        bundle.variants!.some(
          (variant) => variant.id === bundle.defaultVariantId,
        ),
      ).toBe(true)
      for (const variant of bundle.variants!) {
        expect(variant.id in BUNDLE_PRICES).toBe(true)
        expect(variant.price).toBe(BUNDLE_PRICES[variant.id])
        for (const id of bundle.includes!)
          expect(
            catalog
              .get(id)!
              .variants!.some((option) => option.id === variant.id),
            `${id} in ${variant.id}`,
          ).toBe(true)
        expect(variant.price!).toBeLessThan(singles(bundle, variant.id))
      }
      expect(bundle.price).toBe(
        bundle.variants!.find(
          (variant) => variant.id === bundle.defaultVariantId,
        )!.price,
      )
    })
  for (const set of sets)
    it(`${set.id}: priced at the set discount, ending in 9`, () => {
      const total = singles(set, "set")
      const discount = setDiscount(set.includes!.length)
      expect(set.variants).toEqual([
        expect.objectContaining({ id: "set", price: set.price }),
      ])
      expect(set.price % 10).toBe(9)
      expect(Math.abs(set.price - total * discount)).toBeLessThanOrEqual(6)
      expect(set.price).toBeLessThan(total)
      expect(set.series).toBe(
        set.includes!.length >= 20 ? "Mega set" : "Set galerie",
      )
      set.includeVariants!.forEach((size, slot) => {
        const poster = catalog.get(set.includes![slot])!
        expect(
          poster.variants!.some((variant) => variant.id === size),
          `${poster.id} in ${size}`,
        ).toBe(true)
      })
    })
  for (const bundle of bundles)
    it(`${bundle.id}: the saving in the description is the real one`, () => {
      const saving = /Kursen (\d+) €/.exec(bundle.description)?.[1]
      expect(saving).toBeDefined()
      expect(Number(saving)).toBe(
        singles(bundle, bundle.defaultVariantId!) - bundle.price,
      )
    })
})

describe("bundles in the cart and orders", () => {
  for (const bundle of bundles)
    it(`${bundle.id}: every option resolves, orders and prints`, () => {
      for (const variant of bundle.variants!) {
        const cart = addCartItem(
          addCartItem([], bundle, variant.id),
          bundle,
          variant.id,
        )
        expect(cart).toEqual([
          { productId: bundle.id, variantId: variant.id, quantity: 2 },
        ])
        const { lines, unavailable } = resolveCart(cart, products)
        expect(unavailable).toEqual([])
        expect(lines[0].selection.price).toBe(variant.price)
        const [line] = prepareOrderItems(cart, products)
        expect(line).toMatchObject({
          price: variant.price,
          lineTotal: variant.price! * 2,
          variantId: variant.id,
        })
        expect(line.includes!.map((item) => item.productId)).toEqual(
          bundle.includes,
        )
        const order = {
          reference: "CUBE-100000",
          items: [line],
        } as unknown as Order
        const expected = bundle.includeVariants
          ? bundle.includes!.map(
              (id, slot) => `${id}:${bundle.includeVariants![slot]}`,
            )
          : [`${bundle.id}:${variant.id}`]
        expect(printCommand(order)).toBe(
          `npm run print -- ${expected.join(" ")} --out CUBE-100000`,
        )
      }
    })
})

describe("bundles on the wall", () => {
  for (const bundle of bundles)
    it(`${bundle.id}: goes up whole, tidy, and adds back up to the bundle`, () => {
      const items = itemsFor(bundle, catalog)
      expect(items.map((item) => item.productId)).toEqual(bundle.includes)
      expect(items.map((item) => item.variant)).toEqual(
        bundle.includeVariants ??
          bundle.includes!.map(() => bundle.defaultVariantId),
      )
      // On an empty 300 × 260 cm wall: inside it, and never touching.
      const placed = addToWall(emptyWall, items).wall.items
      for (const item of placed) {
        const [width, height] = outerSize(item)
        expect(item.x - width / 2).toBeGreaterThanOrEqual(-0.01)
        expect(item.x + width / 2).toBeLessThanOrEqual(emptyWall.width + 0.01)
        expect(item.y - height / 2).toBeGreaterThanOrEqual(-0.01)
        expect(item.y + height / 2).toBeLessThanOrEqual(emptyWall.height + 0.01)
        expect(collides(item, placed), item.productId).toBe(false)
      }
      // The wall's summary prices the posters as this one bundle.
      const summary = summarizeWall(placed, catalog, bundles)
      expect(summary.lines).toHaveLength(1)
      expect(summary.lines[0]).toMatchObject({
        product: bundle,
        variant: bundle.defaultVariantId,
        count: 1,
      })
      expect(summary.total).toBe(bundle.price)
      // And the cart line goes back onto the wall as the same posters.
      const fromCart = cartItemsForWall(
        [
          {
            productId: bundle.id,
            variantId: bundle.defaultVariantId,
            quantity: 1,
          },
        ],
        catalog,
      )
      expect(
        fromCart.items.map((item) => [item.productId, item.variant]),
      ).toEqual(items.map((item) => [item.productId, item.variant]))
    })

  it("leaves out a cart line that would not fit whole on the wall", () => {
    const mega = sets.find((set) => set.includes!.length === MAX_ITEMS)!
    const { items, keys } = cartItemsForWall(
      [
        { productId: mega.id, variantId: "set", quantity: 1 },
        {
          productId: threes[0].id,
          variantId: threes[0].defaultVariantId,
          quantity: 1,
        },
      ],
      catalog,
    )
    expect(items).toHaveLength(MAX_ITEMS)
    expect(keys).toHaveLength(1)
  })

  it("prices extra posters next to a bundle on their own", () => {
    const bundle = threes[0]
    const items = [
      ...itemsFor(bundle, catalog),
      ...itemsFor(catalog.get(bundle.includes![0])!, catalog),
    ]
    const summary = summarizeWall(items, catalog, bundles)
    expect(summary.lines.map((line) => line.product.id).sort()).toEqual(
      [bundle.id, bundle.includes![0]].sort(),
    )
  })
})

describe("the scripts read the same bundles", () => {
  it("parses bundles.ts exactly as the shop defines it", () => {
    const parsed = parseBundles(readFileSync("src/data/bundles.ts", "utf8"))
    expect(parsed).toEqual(
      bundleDefinitions.map(({ id, includes, sizes }) => ({
        id,
        includes,
        ...(sizes ? { sizes } : {}),
      })),
    )
  })
})
