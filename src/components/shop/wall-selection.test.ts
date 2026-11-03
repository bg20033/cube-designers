import { describe, expect, it } from "vitest"
import {
  itemsInSelection,
  selectionBounds,
  selectionRect,
  translateSelection,
} from "./wall-selection"
import { outerSize, type WallItem } from "./wall-layout"
const items: WallItem[] = [
  { uid: "a", productId: "diell", variant: "30x40", x: 60, y: 80 },
  {
    uid: "b",
    productId: "orbit",
    variant: "30x40-kornize-zeze",
    x: 120,
    y: 80,
  },
  { uid: "c", productId: "forma-blue", variant: "a3", x: 220, y: 130 },
]
describe("wall multi-selection", () => {
  it("selects the same intersecting prints in both drag directions", () => {
    const a = { x: 35, y: 50 },
      b = { x: 145, y: 105 }
    expect(itemsInSelection(items, selectionRect(a, b))).toEqual(["a", "b"])
    expect(itemsInSelection(items, selectionRect(b, a))).toEqual(["a", "b"])
  })
  it("includes the actual frame when checking an intersection", () => {
    expect(
      itemsInSelection(items, { left: 103, top: 58, width: 1, height: 1 }),
    ).toEqual(["b"])
  })
  it("preserves relative positions when a group reaches any wall edge", () => {
    for (const [dx, dy] of [
      [1000, 1000],
      [-1000, -1000],
    ]) {
      const moved = translateSelection(
        items,
        { width: 300, height: 260 },
        dx,
        dy,
      )
      expect(moved[1].x - moved[0].x).toBeCloseTo(items[1].x - items[0].x)
      expect(moved[2].y - moved[0].y).toBeCloseTo(items[2].y - items[0].y)
      for (const item of moved) {
        const [w, h] = outerSize(item)
        expect(item.x - w / 2).toBeGreaterThanOrEqual(0)
        expect(item.y - h / 2).toBeGreaterThanOrEqual(0)
        expect(item.x + w / 2).toBeLessThanOrEqual(300)
        expect(item.y + h / 2).toBeLessThanOrEqual(260)
      }
    }
  })
  it("uses an immutable starting point and handles an empty group", () => {
    const before = structuredClone(items)
    translateSelection(items, { width: 300, height: 260 }, 7, 12)
    expect(items).toEqual(before)
    expect(selectionBounds([])).toBeUndefined()
    expect(translateSelection([], { width: 300, height: 260 }, 7, 12)).toEqual(
      [],
    )
  })
})
