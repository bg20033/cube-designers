import { describe, expect, it } from "vitest"
import { products } from "@/data/products"
import {
  compositionsFor,
  rearrange,
  wallSignature,
  MAX_ITEMS,
  MIN_GAP,
  addToWall,
  arrange,
  collides,
  nearestFree,
  settle,
  compose,
  compositions,
  decodeWall,
  encodeWall,
  outerSize,
  refitPhoto,
  snapItem,
  type Wall,
} from "./wall-layout"

const catalog = new Map(products.map((product) => [product.id, product]))
const wall: Wall = {
  width: 300,
  height: 260,
  color: "#f3f1ec",
  sofa: true,
  grid: false,
  items: ["forma-blue", "diell", "orbit", "mesnate", "vera-e-fundit"].map(
    (productId, index) => ({
      uid: `t${index}`,
      productId,
      variant: index % 2 ? "a3-kornize-zeze" : "a3-pleksi",
      x: 0,
      y: 0,
    }),
  ),
}

const box = (item: Wall["items"][number]) => {
  const [width, height] = outerSize(item)
  return {
    left: item.x - width / 2,
    right: item.x + width / 2,
    top: item.y - height / 2,
    bottom: item.y + height / 2,
  }
}

const expectTidy = (items: Wall["items"]) => {
  const placed = items.map(box)
  for (const [index, a] of placed.entries()) {
    expect(a.left).toBeGreaterThanOrEqual(0)
    expect(a.right).toBeLessThanOrEqual(wall.width)
    expect(a.bottom).toBeLessThanOrEqual(wall.height - 85)
    for (const b of placed.slice(index + 1))
      expect(
        a.right <= b.left ||
          b.right <= a.left ||
          a.bottom <= b.top ||
          b.bottom <= a.top,
      ).toBe(true)
  }
}

describe("wall planner layout", () => {
  for (const composition of compositions)
    it(`"Provo ${composition.label}" fits every wall it is offered for, above the sofa`, () => {
      for (
        let count = composition.min ?? 1;
        count <= Math.min(MAX_ITEMS, composition.max ?? MAX_ITEMS);
        count++
      ) {
        const items = Array.from({ length: count }, (_, index) => ({
          ...wall.items[index % wall.items.length],
          uid: `c${index}`,
        }))
        for (const seed of [0, 1, 7]) {
          const composed = compose(
            { ...wall, items },
            composition,
            catalog,
            seed,
          )
          expect(composed).toHaveLength(count)
          expectTidy(composed)
        }
      }
    })
  it("puts the largest print in the middle of a centred layout", () => {
    const items = [
      { ...wall.items[0], variant: "a4" },
      { ...wall.items[1], variant: "a2" },
      { ...wall.items[2], variant: "a4" },
    ]
    const placed = arrange({ ...wall, items }, "centre")
    expect(placed[1].x).toBeCloseTo(wall.width / 2)
    expect(placed[0].y).toBeCloseTo(placed[1].y)
  })
  for (const mode of ["gallery", "centre", "row", "grid"] as const)
    it(`${mode} keeps posters on the wall, apart and above the sofa`, () => {
      const placed = arrange(wall, mode).map(box)
      for (const [index, a] of placed.entries()) {
        expect(a.left).toBeGreaterThanOrEqual(0)
        expect(a.right).toBeLessThanOrEqual(wall.width)
        expect(a.bottom).toBeLessThanOrEqual(wall.height - 85)
        for (const b of placed.slice(index + 1))
          expect(
            a.right <= b.left ||
              b.right <= a.left ||
              a.bottom <= b.top ||
              b.bottom <= a.top,
          ).toBe(true)
      }
    })
  it("snaps a poster to the wall centre within 2 cm", () => {
    const item = { ...wall.items[0], x: 151.5, y: 100 }
    const { item: snapped, guides } = snapItem(item, { ...wall, items: [item] })
    expect(snapped.x).toBe(150)
    expect(guides.x).toBe(150)
  })
  it("round-trips a shared wall and drops unknown products", () => {
    const placed = { ...wall, items: arrange(wall, "gallery") }
    const decoded = decodeWall(encodeWall(placed), catalog)!
    expect(decoded.items.map((item) => [item.productId, item.variant])).toEqual(
      placed.items.map((item) => [item.productId, item.variant]),
    )
    const broken = encodeWall({
      ...placed,
      items: [{ ...placed.items[0], productId: "missing" }],
    })
    expect(decodeWall(broken, catalog)!.items).toEqual([])
    expect(decodeWall("not-base64!", catalog)).toBeUndefined()
  })
})

describe("photos on the wall", () => {
  const photo = {
    image: "https://store1.public.blob.vercel-storage.com/foto/web/a.jpg",
    original:
      "https://store1.private.blob.vercel-storage.com/foto/original/a.jpg",
    // A 3:2 photo cropped to 30 × 40 portrait.
    crop: { x: 0.25, y: 0, w: 0.5, h: 1 },
  }
  it("frames add 2 cm a side and landscape photos turn", () => {
    expect(outerSize({ variant: "30x40" })).toEqual([30, 40])
    expect(outerSize({ variant: "30x40-kornize-lisi" })).toEqual([34, 44])
    expect(
      outerSize({ variant: "30x40", photo: { ...photo, landscape: true } }),
    ).toEqual([40, 30])
  })
  it("refits a crop to a new orientation around the same centre", () => {
    const turned = refitPhoto(photo, "30x40", "30x40", true)
    expect(turned.landscape).toBe(true)
    // 3:2 photo, 4:3 print: full height, 8/9 of the width, still centred.
    expect(turned.crop.w).toBeCloseTo(8 / 9)
    expect(turned.crop.h).toBeCloseTo(1)
    expect(turned.crop.x).toBeCloseTo(1 / 18)
  })
  it("keeps valid photos in shared walls and drops forged ones", () => {
    const item = {
      uid: "p",
      productId: "foto",
      variant: "50x70-kanavace",
      x: 150,
      y: 100,
      photo,
    }
    const decoded = decodeWall(encodeWall({ ...wall, items: [item] }), catalog)!
    expect(decoded.items[0].photo).toEqual(photo)
    const forged = encodeWall({
      ...wall,
      items: [
        {
          ...item,
          photo: { ...photo, original: "https://evil.example/a.jpg" },
        },
      ],
    })
    expect(decodeWall(forged, catalog)!.items).toEqual([])
  })
})

it("opens old saved walls while dropping the removed lighting setting", () => {
  const legacy = btoa(
    JSON.stringify({
      w: 300,
      h: 260,
      c: "#f3f1ec",
      s: 1,
      g: 0,
      l: "evening",
      i: wall.items.map((item) => [item.productId, item.variant, 100, 100]),
    }),
  )
  const decoded = decodeWall(legacy, catalog)!
  expect(decoded.width).toBe(300)
  expect(decoded.items).toHaveLength(wall.items.length)
  expect(decoded).not.toHaveProperty("lighting")
  const saved = JSON.parse(
    atob(encodeWall(decoded).replace(/-/g, "+").replace(/_/g, "/")),
  )
  expect(saved).not.toHaveProperty("l")
})

it("preserves a custom paint color and rejects injected SVG values", () => {
  expect(
    decodeWall(encodeWall({ ...wall, color: "#c9bba9" }), catalog)?.color,
  ).toBe("#c9bba9")
  expect(
    decodeWall(encodeWall({ ...wall, color: "url(javascript:bad)" }), catalog)
      ?.color,
  ).toBe("#f3f1ec")
})

describe("spacing between prints", () => {
  const placed = { ...wall, items: arrange(wall, "gallery") }
  const apart = (items: Wall["items"]) =>
    items.every((item) => !collides(item, items, MIN_GAP))

  it("adds a print without moving the others, a gap away from them", () => {
    const fresh = { ...placed.items[0], uid: "new", productId: "orbit" }
    const { wall: next, rearranged } = addToWall(placed, [fresh])
    expect(rearranged).toBe(false)
    expect(next.items.slice(0, -1)).toEqual(placed.items)
    expect(apart(next.items)).toBe(true)
    // Still above the sofa.
    const [, height] = outerSize(next.items.at(-1)!)
    expect(next.items.at(-1)!.y + height / 2).toBeLessThanOrEqual(
      wall.height - 85,
    )
  })
  it("slides a dragged print beside the one it would cover", () => {
    const [a, b] = placed.items
    const free = nearestFree({ ...a, x: b.x, y: b.y }, placed.items, wall)!
    expect(collides(free, placed.items)).toBe(false)
  })
  it("pushes neighbours aside when a print grows, keeping it in place", () => {
    const items = placed.items.map((item, index) =>
      index === 1 ? { ...item, variant: "50x70-kornize-lisi" } : item,
    )
    const settled = settle({ ...placed, items }, [items[1].uid])
    expect(settled[1]).toMatchObject({ x: items[1].x, y: items[1].y })
    expect(apart(settled)).toBe(true)
  })
})

describe("Provo and Ri-rregullo give variety", () => {
  const prints = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      ...wall.items[index % wall.items.length],
      uid: `v${index}`,
    }))
  for (const count of [3, 6, 12, 20, 30])
    it(`Provo with ${count} prints looks different almost every time`, () => {
      const options = compositionsFor(count)
      const seen = new Set<string>()
      const shapes = new Set<string>()
      for (let seed = 1; seed <= 12; seed++) {
        const composition = options[seed % options.length]
        const items = compose(
          { ...wall, items: prints(count) },
          composition,
          catalog,
          seed,
        )
        expectTidy(items)
        seen.add(wallSignature(items))
        shapes.add(
          items
            .map((item) => item.variant)
            .sort()
            .join(),
        )
      }
      expect(seen.size).toBeGreaterThanOrEqual(10)
      // Sizes change too, not only the positions.
      expect(shapes.size).toBeGreaterThanOrEqual(count > 20 ? 3 : 4)
    })
  for (const count of [3, 8, 20])
    it(`Ri-rregullo with ${count} prints keeps every size and stays tidy`, () => {
      const start = {
        ...wall,
        items: arrange({ ...wall, items: prints(count) }, "gallery"),
      }
      const seen = new Set<string>()
      for (let seed = 1; seed <= 8; seed++) {
        const result = rearrange(start, seed)
        expect(result).toBeDefined()
        const sizes = (items: Wall["items"]) =>
          Object.fromEntries(items.map((item) => [item.uid, item.variant]))
        expect(sizes(result!.items)).toEqual(sizes(start.items))
        for (const item of result!.items)
          expect(collides(item, result!.items)).toBe(false)
        seen.add(wallSignature(result!.items))
      }
      expect(seen.size).toBeGreaterThanOrEqual(4)
    })
  // Mixed sizes, as "Provo" leaves them.
  const mixed = (count: number) =>
    prints(count).map((item, index) => ({
      ...item,
      variant: ["50x70-pleksi", "a3-kornize-zeze", "a4", "a4", "a4", "a3"][
        index % 6
      ],
    }))
  for (const count of [4, 7, 12, 18])
    it(`Ri-rregullo with ${count} mixed prints changes shape every press`, () => {
      let current: Wall = {
        ...wall,
        items: arrange({ ...wall, items: mixed(count) }, "gallery"),
      }
      const shapes = new Set<string>()
      let last: string | undefined
      for (let seed = 1; seed <= 12; seed++) {
        const result = rearrange(current, seed, last)!
        expect(result).toBeDefined()
        // Never the same shape twice in a row, nor what is up now.
        expect(result.id).not.toBe(last)
        expect(wallSignature(result.items)).not.toBe(
          wallSignature(current.items),
        )
        expect(
          result.items.map((item) => [item.uid, item.variant]).sort(),
        ).toEqual(current.items.map((item) => [item.uid, item.variant]).sort())
        // Inside the wall's margins and clear of the sofa.
        expectTidy(result.items)
        for (const item of result.items) {
          expect(box(item).top).toBeGreaterThanOrEqual(3.99)
          expect(box(item).left).toBeGreaterThanOrEqual(7.99)
        }
        shapes.add(result.id)
        last = result.id
        current = { ...current, items: result.items }
      }
      expect(shapes.size).toBeGreaterThanOrEqual(count > 12 ? 3 : 5)
    })
  it("Ri-rregullo keeps the largest print away from the edges", () => {
    const start = {
      ...wall,
      items: arrange({ ...wall, items: mixed(6) }, "row"),
    }
    let checked = 0
    for (let seed = 1; seed <= 40; seed++) {
      const result = rearrange(start, seed)!
      if (!["gallery", "centre", "frame"].includes(result.id)) continue
      const largest = result.items.find(
        (item) => item.variant === "50x70-pleksi",
      )!
      const xs = result.items.map((item) => item.x)
      expect(largest.x).toBeGreaterThan(Math.min(...xs))
      expect(largest.x).toBeLessThan(Math.max(...xs))
      checked++
    }
    expect(checked).toBeGreaterThan(5)
  })
})
