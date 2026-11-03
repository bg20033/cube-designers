import { outerSize, type Wall, type WallItem } from "./wall-layout"

export type Point = { x: number; y: number }
export type SelectionRect = {
  left: number
  top: number
  width: number
  height: number
}
export function selectionRect(start: Point, end: Point): SelectionRect {
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}
export function selectionBounds(items: WallItem[]): SelectionRect | undefined {
  if (!items.length) return undefined
  const boxes = items.map((item) => {
    const [w, h] = outerSize(item)
    return {
      left: item.x - w / 2,
      right: item.x + w / 2,
      top: item.y - h / 2,
      bottom: item.y + h / 2,
    }
  })
  const left = Math.min(...boxes.map((box) => box.left)),
    top = Math.min(...boxes.map((box) => box.top))
  return {
    left,
    top,
    width: Math.max(...boxes.map((box) => box.right)) - left,
    height: Math.max(...boxes.map((box) => box.bottom)) - top,
  }
}
export function itemsInSelection(items: WallItem[], rect: SelectionRect) {
  return items
    .filter((item) => {
      const [w, h] = outerSize(item)
      return (
        item.x + w / 2 >= rect.left &&
        item.x - w / 2 <= rect.left + rect.width &&
        item.y + h / 2 >= rect.top &&
        item.y - h / 2 <= rect.top + rect.height
      )
    })
    .map((item) => item.uid)
}
// Clamp the common offset, rather than each poster, to preserve the spacing
// when a group reaches any edge of the wall.
export function translateSelection(
  items: WallItem[],
  wall: Pick<Wall, "width" | "height">,
  dx: number,
  dy: number,
): WallItem[] {
  const box = selectionBounds(items)
  if (!box) return []
  const x = Math.max(-box.left, Math.min(dx, wall.width - box.left - box.width))
  const y = Math.max(-box.top, Math.min(dy, wall.height - box.top - box.height))
  return items.map((item) => ({ ...item, x: item.x + x, y: item.y + y }))
}
