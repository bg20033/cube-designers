import { getProductVariant, sanitizePhoto } from "@/data/commerce"
import {
  getPosterSize,
  parseVariantId,
  variantIdFor,
  type PhotoSpec,
  type Product,
} from "@/data/products"
import { finishedSize } from "@/components/store/PrintSurface"

// Wall planner geometry. Everything is in centimetres on a wall whose origin
// is its top-left corner; a print's x/y is its centre.

export type WallItem = {
  uid: string
  productId: string
  // Variant id: size and finish, e.g. "30x40" or "50x70-pleksi".
  variant: string
  x: number
  y: number
  // Customer photos (the photo product) carry their upload and crop.
  photo?: PhotoSpec
}

export type Wall = {
  width: number
  height: number
  color: string
  sofa: boolean
  grid: boolean
  items: WallItem[]
}

export type LayoutMode =
  | "gallery"
  | "centre"
  | "row"
  | "grid"
  | "column"
  // Used by "Provo" only.
  | "row-top"
  | "row-bottom"
  | "brick"
  | "frame"
  | "stairs"

export const MAX_ITEMS = 30
// /shop/foto leaves a photo here for the planner to put on the wall.
export const WALL_INCOMING_KEY = "cube-wall-incoming"
export const EYE_LEVEL_CM = 150
export const WALL_LIMITS = {
  width: [150, 600],
  height: [220, 350],
} as const

// A three-seat sofa for scale, 210 × 85 cm, drawn from these blocks.
export const SOFA = {
  width: 210,
  height: 85,
  parts: [
    { x: 8, y: 0, w: 194, h: 50, r: 10, shade: 0 },
    { x: 0, y: 24, w: 24, h: 46, r: 9, shade: 1 },
    { x: 186, y: 24, w: 24, h: 46, r: 9, shade: 1 },
    { x: 18, y: 40, w: 174, h: 28, r: 7, shade: 2 },
    { x: 16, y: 68, w: 5, h: 17, r: 1, shade: 3 },
    { x: 189, y: 68, w: 5, h: 17, r: 1, shade: 3 },
  ],
}
export const SOFA_SHADES = ["#8b8275", "#81786b", "#958c7f", "#4a4239"]

export const wallColors = [
  { id: "bardhe", label: "E bardhë", value: "#f3f1ec" },
  { id: "krem", label: "Krem", value: "#efe6d6" },
  { id: "bezhe", label: "Bezhë", value: "#e2d6c2" },
  { id: "gri", label: "Gri e ngrohtë", value: "#d8d3ca" },
  { id: "guri", label: "Gri guri", value: "#b9b5ad" },
  { id: "gri-ftohte", label: "Gri e ftohtë", value: "#c9ccd0" },
  { id: "grafit", label: "Grafit", value: "#5b5e63" },
  { id: "antracit", label: "Antracit", value: "#33353a" },
  { id: "zeze", label: "E zezë", value: "#1f1f21" },
  { id: "mente", label: "Mente", value: "#d3ded2" },
  { id: "salvia", label: "Salvia", value: "#a7ae96" },
  { id: "ulliri", label: "Ulliri", value: "#7d7f5c" },
  { id: "pylli", label: "Gjelbër pylli", value: "#3f5446" },
  { id: "blu-pluhuri", label: "Blu pluhuri", value: "#a9b8c6" },
  { id: "blu-deti", label: "Blu deti", value: "#4f6d7a" },
  { id: "blu", label: "Blu nate", value: "#2e3b52" },
  { id: "lavande", label: "Lavandë", value: "#bdb5cc" },
  { id: "roze", label: "Rozë pluhuri", value: "#dcbcb2" },
  { id: "terrakote", label: "Terrakotë", value: "#b8735c" },
  { id: "oker", label: "Okër", value: "#c9a15a" },
  { id: "burgundi", label: "Burgundi", value: "#6e2f35" },
]

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max))

// A6 cards are sold four at a time, so the wall offers A5 and up, in every
// finish the product comes in.
export function wallVariants(product: Product) {
  return (product.variants ?? []).filter((variant) => {
    const parsed = parseVariantId(variant.id)
    return parsed && parsed.size !== "a6"
  })
}

// A photo crop matches its print's shape. When the size or orientation
// changes, the photo's own proportions are recovered from the old crop and a
// new crop of the new shape is centred on the same spot.
export function refitPhoto(
  photo: PhotoSpec,
  fromVariant: string,
  toVariant: string,
  landscape = false,
): PhotoSpec {
  const shape = (variant: string, turned?: boolean) => {
    const [width, height] = getPosterSize(parseVariantId(variant)?.size)
      ?.cm ?? [30, 40]
    return turned ? height / width : width / height
  }
  const { crop } = photo
  const photoAspect = (shape(fromVariant, photo.landscape) * crop.h) / crop.w
  const target = shape(toVariant, landscape)
  let w = 1
  let h = 1
  if (photoAspect > target) w = target / photoAspect
  else h = photoAspect / target
  const centre = (start: number, size: number, next: number) =>
    Math.min(Math.max(start + size / 2 - next / 2, 0), 1 - next)
  return {
    ...photo,
    crop: {
      x: centre(crop.x, crop.w, w),
      y: centre(crop.y, crop.h, h),
      w,
      h,
    },
    ...(landscape ? { landscape: true } : { landscape: undefined }),
  }
}

// Print size on the wall in cm, frame included; landscape photos turn.
export function outerSize(item: Pick<WallItem, "variant" | "photo">) {
  const parsed = parseVariantId(item.variant)
  const [width, height] = getPosterSize(parsed?.size)?.cm ?? [30, 40]
  return finishedSize(
    item.photo?.landscape ? [height, width] : [width, height],
    parsed?.finish ?? "leter",
  )
}

export function clampItem(item: WallItem, wall: Wall): WallItem {
  const [width, height] = outerSize(item)
  return {
    ...item,
    x: clamp(item.x, width / 2, wall.width - width / 2),
    y: clamp(item.y, height / 2, wall.height - height / 2),
  }
}

const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0)

// The first entry in the middle and the rest alternating out to both sides,
// so a list sorted largest first peaks in the middle.
function mirror<T>(list: T[]) {
  const left: T[] = []
  const right: T[] = []
  list.forEach((entry, index) => (index % 2 ? left : right).push(entry))
  return [...left.reverse(), ...right]
}

// Deals a list into `count` rows back and forth (1, 2, 3, 3, 2, 1…), so a
// list sorted largest first gives every row a similar mix.
function deal<T>(list: T[], count: number) {
  const rows: T[][] = Array.from({ length: count }, () => [])
  list.forEach((entry, index) => {
    const position = index % count
    rows[
      Math.floor(index / count) % 2 ? count - 1 - position : position
    ].push(entry)
  })
  return rows.filter((row) => row.length)
}

// Where a block of prints is centred: at eye level, or with the sofa shown,
// hung about 20 cm above its back as over any furniture.
function blockCentre(wall: Wall, blockHeight: number) {
  const centre = wall.sofa
    ? wall.height - SOFA.height - 20 - blockHeight / 2
    : wall.height - EYE_LEVEL_CM
  return clamp(centre, blockHeight / 2 + 4, wall.height - blockHeight / 2 - 4)
}

// Lays out columns of stacked prints side by side. Every column and row
// shares one centre line and the same gap, so mixed sizes still read as a
// tidy block. Columns wrap into balanced rows no wider than `limit`.
function layoutColumns(
  items: WallItem[],
  columns: number[][],
  gap: number,
  limit: number,
  // Where columns sit in a row: on its centre line, its top or its bottom.
  align: "centre" | "top" | "bottom" = "centre",
) {
  const { width: columnWidth } = measure(items, gap)
  const widths = columns.map(columnWidth)
  const total = sum(widths) + gap * (columns.length - 1)
  const target = total / Math.max(1, Math.ceil(total / limit))
  const rows: number[][][] = [[]]
  let width = 0
  columns.forEach((column, index) => {
    const row = rows[rows.length - 1]
    const next = width + (row.length ? gap : 0) + widths[index]
    if (row.length && next > target * 1.08) {
      rows.push([column])
      width = widths[index]
    } else {
      row.push(column)
      width = next
    }
  })
  return stackRows(items, rows, gap, align)
}

// Width and height of a column of stacked prints (indices into `items`).
function measure(items: WallItem[], gap: number) {
  const sizes = items.map((item) => outerSize(item))
  return {
    sizes,
    width: (column: number[]) =>
      Math.max(...column.map((index) => sizes[index][0])),
    height: (column: number[]) =>
      sum(column.map((index) => sizes[index][1])) + gap * (column.length - 1),
  }
}

// Rows of columns, one under the other, each row centred. Columns in a row
// share its centre line (or its top or bottom).
function stackRows(
  items: WallItem[],
  rows: number[][][],
  gap: number,
  align: "centre" | "top" | "bottom" = "centre",
) {
  const { sizes, width, height } = measure(items, gap)
  const rowWidths = rows.map(
    (row) => sum(row.map(width)) + gap * (row.length - 1),
  )
  const rowHeights = rows.map((row) => Math.max(...row.map(height)))
  const block = {
    width: Math.max(...rowWidths),
    height: sum(rowHeights) + gap * (rows.length - 1),
  }
  // Positions relative to the block's centre.
  const placed = [...items]
  let top = -block.height / 2
  rows.forEach((row, rowIndex) => {
    let left = -rowWidths[rowIndex] / 2
    for (const column of row) {
      const spare = rowHeights[rowIndex] - height(column)
      let y =
        top + (align === "top" ? 0 : align === "bottom" ? spare : spare / 2)
      for (const index of column) {
        placed[index] = {
          ...items[index],
          x: left + width(column) / 2,
          y: y + sizes[index][1] / 2,
        }
        y += sizes[index][1] + gap
      }
      left += width(column) + gap
    }
    top += rowHeights[rowIndex] + gap
  })
  return { placed, block }
}

function centreOnWall(
  wall: Wall,
  { placed, block }: ReturnType<typeof layoutColumns>,
) {
  const centre = blockCentre(wall, block.height)
  return placed.map((item) =>
    clampItem(
      { ...item, x: item.x + wall.width / 2, y: item.y + centre },
      wall,
    ),
  )
}

// Stacks small prints in pairs so they line up with a taller neighbour.
function pairSmall(items: WallItem[], order: number[], gap: number) {
  const heights = items.map((item) => outerSize(item)[1])
  const tallest = Math.max(...heights)
  const columns: number[][] = []
  for (let index = 0; index < order.length; index++) {
    const a = order[index]
    const b = order[index + 1]
    if (
      b !== undefined &&
      heights[a] + heights[b] + gap <= tallest * 1.15 &&
      Math.abs(heights[a] - heights[b]) <= tallest * 0.2
    ) {
      columns.push([a, b])
      index++
    } else columns.push([a])
  }
  return columns
}

// Puts the largest print in the middle with the rest mirrored around it,
// inner columns first.
function centreColumns(items: WallItem[], gap: number) {
  const area = (index: number) => {
    const [width, height] = outerSize(items[index])
    return width * height
  }
  const [hero, ...rest] = items
    .map((_, index) => index)
    .sort((a, b) => area(b) - area(a))
  const heroHeight = outerSize(items[hero])[1]
  const sides = pairSmall(items, rest, gap)
  // An even number of side columns keeps the two sides balanced.
  const pair = sides.findLastIndex((column) => column.length === 2)
  if (sides.length % 2 && pair >= 0)
    sides.splice(pair, 1, [sides[pair][0]], [sides[pair][1]])
  else if (
    sides.length % 2 &&
    sides.length > 1 &&
    sides
      .slice(-2)
      .every(([index]) => outerSize(items[index])[1] <= heroHeight * 0.65)
  )
    sides.splice(-2, 2, [
      sides[sides.length - 2][0],
      sides[sides.length - 1][0],
    ])
  const left: number[][] = []
  const right: number[][] = []
  sides.forEach((column, index) => (index % 2 ? left : right).push(column))
  return [...left.reverse(), [hero], ...right]
}

function evenGrid(items: WallItem[], gap: number, brick = false) {
  const count = items.length
  const root = Math.sqrt(count)
  let columns = Math.ceil(root)
  for (let candidate = columns; candidate <= Math.ceil(root * 1.7); candidate++)
    if (count % candidate === 0) {
      columns = candidate
      break
    }
  const sizes = items.map((item) => outerSize(item))
  const cell = [
    Math.max(...sizes.map((size) => size[0])),
    Math.max(...sizes.map((size) => size[1])),
  ]
  const rows = Math.ceil(count / columns)
  const block = {
    width: columns * cell[0] + gap * (columns - 1),
    height: rows * cell[1] + gap * (rows - 1),
  }
  // Brick: every other row shifted by half a cell, like a brick wall.
  const shift = brick && rows > 1 ? (cell[0] + gap) / 4 : 0
  if (shift) block.width += shift * 2
  const placed = items.map((item, index) => {
    const row = Math.floor(index / columns)
    const inRow = Math.min(columns, count - row * columns)
    const rowWidth = inRow * cell[0] + gap * (inRow - 1)
    return {
      ...item,
      x:
        -rowWidth / 2 +
        (index % columns) * (cell[0] + gap) +
        cell[0] / 2 +
        (row % 2 ? shift : -shift),
      y: -block.height / 2 + row * (cell[1] + gap) + cell[1] / 2,
    }
  })
  return { placed, block }
}

// Moves placed prints so their bounds are centred on (0, 0).
function recentre(placed: WallItem[]) {
  const boxes = placed.map((item) => {
    const [width, height] = outerSize(item)
    return [
      item.x - width / 2,
      item.y - height / 2,
      item.x + width / 2,
      item.y + height / 2,
    ]
  })
  const left = Math.min(...boxes.map((box) => box[0]))
  const top = Math.min(...boxes.map((box) => box[1]))
  const right = Math.max(...boxes.map((box) => box[2]))
  const bottom = Math.max(...boxes.map((box) => box[3]))
  const dx = (left + right) / 2
  const dy = (top + bottom) / 2
  return {
    placed: placed.map((item) => ({ ...item, x: item.x - dx, y: item.y - dy })),
    block: { width: right - left, height: bottom - top },
  }
}

// One row climbing from left to right.
function stairs(items: WallItem[], gap: number) {
  const { placed } = layoutColumns(
    items,
    items.map((_, index) => [index]),
    gap,
    Infinity,
  )
  const step = Math.max(...items.map((item) => outerSize(item)[1])) * 0.22
  return recentre(
    placed.map((item, index) => ({
      ...item,
      y: item.y - (index - (items.length - 1) / 2) * step,
    })),
  )
}

// The largest print in the middle, framed by the others: a stack on each
// side about as tall as it, and the rest in rows above and below.
function frame(items: WallItem[], gap: number) {
  const sizes = items.map((item) => outerSize(item))
  const hero = sizes.reduce(
    (best, size, index) =>
      size[0] * size[1] > sizes[best][0] * sizes[best][1] ? index : best,
    0,
  )
  // Tallest first, so the side stacks get the larger prints.
  const rest = items
    .map((_, index) => index)
    .filter((index) => index !== hero)
    .sort((a, b) => sizes[b][1] - sizes[a][1])
  const [heroWidth, heroHeight] = sizes[hero]
  // The sides take prints two at a time, one each, so they mirror.
  const sides: number[][] = [[], []]
  const sideHeights = [0, 0]
  const others: number[] = []
  for (let order = 0; order < rest.length; order += 2) {
    const pair = rest.slice(order, order + 2)
    const heights = pair.map(
      (index, side) =>
        sideHeights[side] + (sides[side].length ? gap : 0) + sizes[index][1],
    )
    if (
      pair.length === 2 &&
      (!sides[0].length || Math.max(...heights) <= heroHeight * 1.05)
    )
      pair.forEach((index, side) => {
        sides[side].push(index)
        sideHeights[side] = heights[side]
      })
    else others.push(...pair)
  }
  // The rest in a row above and one below, each peaking in the middle.
  const rows = [0, 1].map((row) =>
    mirror(others.filter((_, order) => order % 2 === row)),
  )
  const placed = [...items]
  placed[hero] = { ...items[hero], x: 0, y: 0 }
  const stack = (column: number[], direction: number) => {
    if (!column.length) return 0
    const width = Math.max(...column.map((index) => sizes[index][0]))
    const height =
      sum(column.map((index) => sizes[index][1])) + gap * (column.length - 1)
    const x = direction * (heroWidth / 2 + gap + width / 2)
    let y = -height / 2
    for (const index of column) {
      placed[index] = { ...items[index], x, y: y + sizes[index][1] / 2 }
      y += sizes[index][1] + gap
    }
    return height
  }
  const middle = Math.max(heroHeight, stack(sides[0], -1), stack(sides[1], 1))
  rows.forEach((row, side) => {
    if (!row.length) return
    const width =
      sum(row.map((index) => sizes[index][0])) + gap * (row.length - 1)
    const height = Math.max(...row.map((index) => sizes[index][1]))
    const y = (side ? 1 : -1) * (middle / 2 + gap + height / 2)
    let x = -width / 2
    for (const index of row) {
      placed[index] = { ...items[index], x: x + sizes[index][0] / 2, y }
      x += sizes[index][0] + gap
    }
  })
  return recentre(placed)
}

function layout(wall: Wall, items: WallItem[], mode: LayoutMode) {
  const gap = mode === "row" ? 8 : 6
  const order = items.map((_, index) => index)
  if (mode === "grid" || mode === "brick")
    return evenGrid(items, gap, mode === "brick")
  if (mode === "stairs") return stairs(items, gap)
  if (mode === "frame") return frame(items, gap)
  if (mode === "row-top" || mode === "row-bottom")
    return layoutColumns(
      items,
      order.map((index) => [index]),
      gap,
      wall.width - 12,
      mode === "row-top" ? "top" : "bottom",
    )
  if (mode === "row")
    return layoutColumns(
      items,
      order.map((index) => [index]),
      gap,
      wall.width - 12,
    )
  if (mode === "column") {
    // Stacks of up to three, side by side.
    const columns = Math.ceil(items.length / 3)
    const perColumn = Math.ceil(items.length / columns)
    return layoutColumns(
      items,
      Array.from({ length: columns }, (_, column) =>
        order.slice(column * perColumn, (column + 1) * perColumn),
      ),
      gap,
      wall.width - 12,
    )
  }
  if (mode === "centre")
    return layoutColumns(items, centreColumns(items, gap), gap, wall.width - 12)
  // Gallery: small prints stacked in pairs, wrapped into about as many rows
  // as a balanced block needs.
  const columns = pairSmall(items, order, gap)
  const sizes = items.map((item) => outerSize(item))
  const total =
    sum(columns.map((column) => sizes[column[0]][0])) +
    gap * (columns.length - 1)
  const rows = Math.max(1, Math.round(Math.sqrt(columns.length / 2.5)))
  return layoutColumns(
    items,
    columns,
    gap,
    Math.min(
      wall.width * 0.88,
      Math.max(total / rows, ...sizes.map((size) => size[0])),
    ),
  )
}

export const layoutModes: { id: LayoutMode; label: string }[] = [
  { id: "gallery", label: "Galeri" },
  { id: "centre", label: "Qendër" },
  { id: "row", label: "Rresht" },
  { id: "grid", label: "Rrjetë" },
]

// Arranges the prints in their current sizes as a gallery, a centrepiece
// with the rest mirrored around it, one row or an even grid.
export function arrange(wall: Wall, mode: LayoutMode): WallItem[] {
  if (!wall.items.length) return wall.items
  return centreOnWall(wall, layout(wall, wall.items, mode))
}

// Sizes the "Provo" compositions pick from, small to large.
const COMPOSE_SIZES = ["a5", "a4", "a3", "a2"]

// A small seeded random generator, so a "Provo" result can be repeated.
function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
type Random = () => number
function shuffle<T>(list: T[], rnd: Random) {
  const out = [...list]
  for (let index = out.length - 1; index > 0; index--) {
    const other = Math.floor(rnd() * (index + 1))
    ;[out[index], out[other]] = [out[other], out[index]]
  }
  return out
}
const pickOne = <T>(options: T[], rnd: Random) =>
  options[Math.floor(rnd() * options.length)]
const repeat = (count: number, pattern: number[]) =>
  Array.from({ length: count }, (_, index) => pattern[index % pattern.length])

// "Provo" picks one of these at random. Each sets the shape (`mode`), the
// print sizes (target heights as fractions of the largest; 0.5 is half of it
// less a gap, so two stack to the same height) and how large the largest
// print may be (cm, a range the pick falls in). `min` / `max` limit it to
// walls with that many prints.
export const compositions: {
  id: string
  label: string
  mode: LayoutMode
  largest: [number, number]
  heights: (count: number, rnd: Random) => number[]
  min?: number
  max?: number
}[] = [
  {
    id: "centre",
    label: "Qendër",
    mode: "centre",
    largest: [45, 75],
    heights: (count, rnd) => {
      const hero = Math.floor(rnd() * count)
      return Array.from({ length: count }, (_, index) =>
        index === hero ? 1 : 0.5,
      )
    },
  },
  {
    id: "frame",
    label: "Kornizë rreth një posteri",
    mode: "frame",
    largest: [40, 75],
    min: 5,
    heights: (count, rnd) => {
      const hero = Math.floor(rnd() * count)
      const small = pickOne([0.3, 0.38, 0.47], rnd)
      return Array.from({ length: count }, (_, index) =>
        index === hero ? 1 : small,
      )
    },
  },
  {
    id: "grid",
    label: "Rrjetë e njëjtë",
    mode: "grid",
    largest: [24, 70],
    heights: (count) => Array(count).fill(1),
  },
  {
    id: "brick",
    label: "Tulla",
    mode: "brick",
    largest: [24, 60],
    min: 4,
    heights: (count) => Array(count).fill(1),
  },
  {
    id: "skyline",
    label: "Vija e sipërme",
    mode: "row-top",
    largest: [35, 70],
    heights: (count, rnd) =>
      Array.from({ length: count }, () => pickOne([1, 0.75, 0.55], rnd)),
  },
  {
    id: "floor",
    label: "Vija e poshtme",
    mode: "row-bottom",
    largest: [35, 70],
    heights: (count, rnd) =>
      Array.from({ length: count }, () => pickOne([1, 0.7, 0.5], rnd)),
  },
  {
    id: "salon",
    label: "Salon",
    mode: "gallery",
    largest: [40, 75],
    heights: (count, rnd) =>
      repeat(
        count,
        pickOne(
          [
            [1, 0.5, 0.5],
            [0.5, 0.5, 1],
            [1, 0.5, 0.5, 0.5, 0.5],
            [0.75, 0.5, 0.5, 1],
          ],
          rnd,
        ),
      ),
  },
  {
    id: "duo",
    label: "Dy në qendër",
    mode: "gallery",
    largest: [45, 75],
    min: 3,
    heights: (count) =>
      count < 3
        ? Array(count).fill(1)
        : repeat(count, [0.5, 0.5, 1, 1, 0.5, 0.5]),
  },
  {
    id: "rhythm",
    label: "Ritëm",
    mode: "row",
    largest: [35, 65],
    heights: (count, rnd) => repeat(count, rnd() < 0.5 ? [0.62, 1] : [1, 0.62]),
  },
  {
    id: "column",
    label: "Kolona",
    mode: "column",
    largest: [30, 50],
    heights: (count) => Array(count).fill(1),
  },
  {
    id: "stairs",
    label: "Shkallë",
    mode: "stairs",
    largest: [28, 50],
    min: 3,
    max: 7,
    heights: (count) => Array(count).fill(1),
  },
]

export const compositionsFor = (count: number) =>
  compositions.filter(
    (composition) =>
      count >= (composition.min ?? 1) && count <= (composition.max ?? Infinity),
  )

// The standard sizes a print can take on the wall, small to large, each in
// the print's finish where that size is made in it (otherwise paper).
export function sizeOptions(item: WallItem, product: Product) {
  const variants = wallVariants(product)
  const finish = parseVariantId(item.variant)?.finish ?? "leter"
  return COMPOSE_SIZES.flatMap((size) => {
    const variant = [variantIdFor(size, finish), size].find((id) =>
      variants.some((option) => option.id === id),
    )
    return variant
      ? [{ size, variant, outer: outerSize({ ...item, variant }) }]
      : []
  })
}

// The print in another variant; a customer photo is re-cropped to its shape.
export function withVariant(item: WallItem, variant: string): WallItem {
  if (variant === item.variant) return item
  return {
    ...item,
    variant,
    ...(item.photo
      ? {
          photo: refitPhoto(
            item.photo,
            item.variant,
            variant,
            item.photo.landscape,
          ),
        }
      : {}),
  }
}

// Gives a print the available size whose height comes closest to `target`.
function resizeTo(item: WallItem, product: Product, target: number) {
  let best: { variant: string; miss: number } | undefined
  for (const option of sizeOptions(item, product)) {
    const miss = Math.abs(option.outer[1] - target)
    if (!best || miss < best.miss - 0.01)
      best = { variant: option.variant, miss }
  }
  return best ? withVariant(item, best.variant) : item
}

// Resizing with a corner handle: the opposite corner (`anchor`, in cm) stays
// put and the print snaps to the standard size closest to the dragged box.
export function resizeFromCorner(
  item: WallItem,
  product: Product,
  anchor: { x: number; y: number },
  pointer: { x: number; y: number },
  wall: Wall,
) {
  const width = Math.abs(pointer.x - anchor.x)
  const height = Math.abs(pointer.y - anchor.y)
  let best:
    | { variant: string; outer: readonly [number, number]; miss: number }
    | undefined
  for (const option of sizeOptions(item, product)) {
    const miss =
      Math.abs(option.outer[0] - width) + Math.abs(option.outer[1] - height)
    if (!best || miss < best.miss)
      best = { variant: option.variant, outer: option.outer, miss }
  }
  if (!best) return item
  const sx = pointer.x >= anchor.x ? 1 : -1
  const sy = pointer.y >= anchor.y ? 1 : -1
  return clampItem(
    {
      ...withVariant(item, best.variant),
      x: anchor.x + (sx * best.outer[0]) / 2,
      y: anchor.y + (sy * best.outer[1]) / 2,
    },
    wall,
  )
}

// One standard size up or down (keyboard + / −), keeping the centre.
export function stepSize(
  item: WallItem,
  product: Product,
  step: 1 | -1,
  wall: Wall,
) {
  const options = sizeOptions(item, product)
  if (!options.length) return item
  const height = outerSize(item)[1]
  // The current size, or for a custom photo size the standard one nearest it.
  const current = options.reduce(
    (best, option, index) =>
      Math.abs(option.outer[1] - height) <
      Math.abs(options[best].outer[1] - height)
        ? index
        : best,
    0,
  )
  const next =
    options[Math.min(options.length - 1, Math.max(0, current + step))]
  return clampItem(withVariant(item, next.variant), wall)
}

// "Provo": new sizes and an arrangement for the same prints, as large as
// still fits the wall (above the sofa when it is shown). The seed decides the
// random choices: which print leads, the order and how large they start.
export function compose(
  wall: Wall,
  composition: (typeof compositions)[number],
  catalog: Map<string, Product>,
  seed = 0,
): WallItem[] {
  if (!wall.items.length) return wall.items
  const rnd = random(seed)
  // A different order each time, so different prints change places.
  const order = shuffle(wall.items, rnd)
  const ratios = composition.heights(order.length, rnd)
  // Few prints stay about as wide as the sofa; many may use more of the wall
  // so they do not all end up tiny.
  const many = order.length > 8
  const room = {
    width: Math.min(
      wall.width - 16,
      wall.sofa && !many ? SOFA.width : wall.width,
    ),
    height: Math.min(
      wall.height - (wall.sofa ? SOFA.height + 28 : 50),
      wall.sofa && !many ? 115 : 170,
    ),
  }
  const sized = (item: WallItem, target: number) => {
    const product = catalog.get(item.productId)
    return product ? resizeTo(item, product, target) : item
  }
  const [low, high] = composition.largest
  const start = Math.round(low + rnd() * (high - low))
  let fallback: WallItem[] | undefined
  for (let largest = start; largest >= 14; largest -= 3) {
    const big = order.map((item, index) =>
      ratios[index] === 1 ? sized(item, largest) : item,
    )
    const leads = big.filter((_, index) => ratios[index] === 1)
    const tallest = leads.length
      ? Math.max(...leads.map((item) => outerSize(item)[1]))
      : largest
    const items = big.map((item, index) =>
      ratios[index] === 1
        ? item
        : sized(
            item,
            ratios[index] === 0.5 ? (tallest - 6) / 2 : ratios[index] * tallest,
          ),
    )
    const result = layout(wall, items, composition.mode)
    const placed = centreOnWall(wall, result)
    fallback ??= placed
    if (
      result.block.width <= room.width &&
      result.block.height <= room.height &&
      placed.every((item) => !collides(item, placed))
    )
      return placed
    fallback = placed
  }
  return fallback!
}

type Block = ReturnType<typeof stackRows>

// Indices of the prints, tallest first; equal sizes keep their (shuffled)
// order, so they swap places from one press to the next.
function tallestFirst(items: WallItem[]) {
  const heights = items.map((item) => outerSize(item)[1])
  return items.map((_, index) => index).sort((a, b) => heights[b] - heights[a])
}

// Every print about the same size (within 15 %), so an even grid has no
// gaping cells.
function uniform(items: WallItem[]) {
  const sizes = items.map((item) => outerSize(item))
  return [0, 1].every(
    (axis) =>
      Math.max(...sizes.map((size) => size[axis])) <=
      Math.min(...sizes.map((size) => size[axis])) * 1.15,
  )
}

// One row per run of prints (or several, dealt so each has a similar mix),
// each peaking in the middle; `valley` puts the largest at the ends.
function rowsOf(
  items: WallItem[],
  rows: (width: number) => number,
  gap: number,
  valley: boolean,
  order = tallestFirst(items),
) {
  const { width } = measure(items, gap)
  const total = sum(order.map((index) => width([index]))) + gap * order.length
  return deal(order, rows(total)).map((row) =>
    mirror(valley ? row.reverse() : row),
  )
}

// Shapes "Ri-rregullo" moves the prints into, keeping every size. Each one
// orders the prints by size: similar ones pair up, rows get an even mix and
// the largest sit in the middle. `rows(width)` is how many rows a run of
// prints that wide takes on this wall.
const rearrangePlans: {
  id: string
  label: string
  min?: number
  max?: number
  build: (
    items: WallItem[],
    rows: (width: number) => number,
    rnd: Random,
    room: { width: number; height: number },
  ) => Block | undefined
}[] = [
  ...(
    [
      ["gallery", "Galeri", false],
      ["gallery-ends", "Galeri, të mëdhenjtë anash", true],
    ] as const
  ).map(([id, label, ends]) => ({
    id,
    label,
    min: ends ? 4 : 2,
    build: (items: WallItem[], rows: (width: number) => number) => {
      const gap = 6
      const { width, height } = measure(items, gap)
      // Small prints stacked in pairs beside the large ones.
      const columns = pairSmall(items, tallestFirst(items), gap).sort(
        (a, b) => height(b) - height(a),
      )
      const total = sum(columns.map(width)) + gap * columns.length
      const count = Math.max(
        rows(total),
        Math.round(Math.sqrt(columns.length / 2.5)),
      )
      return stackRows(
        items,
        deal(columns, count).map((row) => mirror(ends ? row.reverse() : row)),
        gap,
      )
    },
  })),
  {
    id: "centre",
    label: "Qendër",
    min: 3,
    build: (items) => stackRows(items, [centreColumns(items, 6)], 6),
  },
  {
    id: "frame",
    label: "Kornizë",
    min: 5,
    max: 12,
    build: (items) => frame(items, 6),
  },
  ...(
    [
      ["row", "Rresht", "centre"],
      ["row-top", "Vija e sipërme", "top"],
      ["row-bottom", "Vija e poshtme", "bottom"],
    ] as const
  ).map(([id, label, align]) => ({
    id,
    label,
    build: (
      items: WallItem[],
      rows: (width: number) => number,
      rnd: Random,
    ) => {
      const gap = align === "centre" ? 8 : 6
      return stackRows(
        items,
        rowsOf(items, rows, gap, rnd() < 0.35).map((row) =>
          row.map((index) => [index]),
        ),
        gap,
        align,
      )
    },
  })),
  {
    id: "rhythm",
    label: "Ritëm",
    min: 4,
    // Large and small taking turns, starting and ending large.
    build: (items, rows) => {
      if (uniform(items)) return undefined
      const order = tallestFirst(items)
      const half = Math.ceil(order.length / 2)
      const turns = order
        .slice(0, half)
        .flatMap((large, index) =>
          index + half < order.length ? [large, order[index + half]] : [large],
        )
      const { width } = measure(items, 8)
      const count = rows(sum(turns.map((index) => width([index]))))
      const per = Math.ceil(turns.length / count)
      return stackRows(
        items,
        Array.from({ length: count }, (_, row) =>
          turns.slice(row * per, (row + 1) * per).map((index) => [index]),
        ).filter((row) => row.length),
        8,
      )
    },
  },
  {
    id: "grid",
    label: "Rrjetë",
    min: 4,
    build: (items) => (uniform(items) ? evenGrid(items, 6) : undefined),
  },
  {
    id: "brick",
    label: "Tulla",
    min: 5,
    build: (items) => (uniform(items) ? evenGrid(items, 6, true) : undefined),
  },
  {
    id: "column",
    label: "Kolona",
    min: 4,
    // One row of stacks about even in height, the tallest stack in the
    // middle and the largest print at the foot of each; as many stacks as
    // fit the wall, picked at random.
    build: (items, _, rnd, room) => {
      const gap = 6
      const { width, height } = measure(items, gap)
      const fitting: number[][][] = []
      for (let count = 2; count <= Math.ceil(items.length / 2); count++) {
        const columns: number[][] = Array.from({ length: count }, () => [])
        for (const index of tallestFirst(items))
          columns
            .reduce((low, column) =>
              height(column) < height(low) ? column : low,
            )
            .push(index)
        const stacks = columns
          .map((column) => column.reverse())
          .sort((a, b) => height(b) - height(a))
        if (
          Math.max(...stacks.map(height)) <= room.height &&
          sum(stacks.map(width)) + gap * (count - 1) <= room.width
        )
          fitting.push(stacks)
      }
      return fitting.length
        ? stackRows(items, [mirror(pickOne(fitting, rnd))], gap)
        : undefined
    },
  },
  {
    id: "stairs",
    label: "Shkallë",
    min: 3,
    max: 7,
    // Growing from one side to the other.
    build: (items, _, rnd) => {
      const order = tallestFirst(items)
      if (rnd() < 0.5) order.reverse()
      return stairs(
        order.map((index) => items[index]),
        6,
      )
    },
  },
]

// "Ri-rregullo": the same prints in the same sizes, in another shape. Only
// tidy results count: inside the wall's margins, nothing touching, above the
// sofa when it is shown, and not what is up now; otherwise the next shape is
// tried. `avoid` is the shape used last.
export function rearrange(wall: Wall, seed: number, avoid?: string) {
  const count = wall.items.length
  if (count < 2) return undefined
  const rnd = random(seed)
  const room = {
    width: wall.width - 16,
    height: wall.height - 12 - (wall.sofa ? SOFA.height : 0),
  }
  const current = wallSignature(wall.items)
  const sofaTop = wall.height - SOFA.height - 4
  const plans = shuffle(
    rearrangePlans.filter(
      (plan) =>
        plan.id !== avoid &&
        count >= (plan.min ?? 2) &&
        count <= (plan.max ?? Infinity),
    ),
    rnd,
  )
  // Rows wrap at about a sofa and a bit (many prints sometimes get a row
  // more, for a squarer block), or failing that, at the wall's full width.
  for (const wrap of new Set([Math.min(room.width, 260), room.width])) {
    const rows = (width: number) =>
      Math.min(
        count,
        Math.ceil(width / wrap) +
          (wrap < room.width && count >= 8 && rnd() < 0.5 ? 1 : 0),
      )
    for (const { id, label, build } of plans) {
      const result = build(shuffle(wall.items, rnd), rows, rnd, room)
      if (
        !result ||
        result.block.width > room.width ||
        result.block.height > room.height
      )
        continue
      const items = centreOnWall(wall, result)
      const tidy = items.every(
        (item) =>
          !collides(item, items) &&
          (!wall.sofa || item.y + outerSize(item)[1] / 2 <= sofaTop),
      )
      if (tidy && wallSignature(items) !== current)
        return { items, id, label }
    }
  }
  return undefined
}

// A short fingerprint of a wall's sizes and positions, to tell whether a
// "Provo" result looks different from what is up now.
export function wallSignature(items: WallItem[]) {
  return items
    .map(
      (item) =>
        `${item.uid}:${item.variant}:${Math.round(item.x)}:${Math.round(item.y)}`,
    )
    .sort()
    .join("|")
}

// Prints never touch: at least MIN_GAP cm between any two. New prints are
// placed a gallery gap (PLACE_GAP) from their neighbours.
export const MIN_GAP = 4
export const PLACE_GAP = 6

function tooClose(a: WallItem, b: WallItem, gap: number) {
  const [aw, ah] = outerSize(a)
  const [bw, bh] = outerSize(b)
  return (
    Math.abs(a.x - b.x) < (aw + bw) / 2 + gap - 0.01 &&
    Math.abs(a.y - b.y) < (ah + bh) / 2 + gap - 0.01
  )
}

export function collides(item: WallItem, others: WallItem[], gap = MIN_GAP) {
  return others.some(
    (other) => other.uid !== item.uid && tooClose(item, other, gap),
  )
}

// The free position nearest to `item` (which may overlap others): beside one
// of the prints in the way, or beside that and the next one. With `scan`,
// the whole wall is searched as a last resort. `aboveSofa` keeps the print
// clear of a shown sofa.
export function nearestFree(
  item: WallItem,
  others: WallItem[],
  wall: Wall,
  {
    gap = MIN_GAP,
    scan = false,
    aboveSofa = false,
  }: { gap?: number; scan?: boolean; aboveSofa?: boolean } = {},
): WallItem | undefined {
  const [width, height] = outerSize(item)
  const rest = others.filter((other) => other.uid !== item.uid)
  const sofaTop = wall.height - SOFA.height - 8
  const boxes = rest.map((other) => {
    const [w, h] = outerSize(other)
    return {
      x: other.x,
      y: other.y,
      w: (width + w) / 2 + gap - 0.01,
      h: (height + h) / 2 + gap - 0.01,
    }
  })
  const fits = (candidate: WallItem) =>
    candidate.x - width / 2 >= -0.01 &&
    candidate.x + width / 2 <= wall.width + 0.01 &&
    candidate.y - height / 2 >= -0.01 &&
    candidate.y + height / 2 <= wall.height + 0.01 &&
    !(aboveSofa && wall.sofa && candidate.y + height / 2 > sofaTop) &&
    !boxes.some(
      (box) =>
        Math.abs(candidate.x - box.x) < box.w &&
        Math.abs(candidate.y - box.y) < box.h,
    )
  const start = clampItem(item, wall)
  if (fits(start)) return start
  const beside = (from: WallItem) =>
    rest.flatMap((other) => {
      if (!tooClose(from, other, gap)) return []
      const [w, h] = outerSize(other)
      const dx = (width + w) / 2 + gap
      const dy = (height + h) / 2 + gap
      return [
        { ...from, x: other.x - dx },
        { ...from, x: other.x + dx },
        { ...from, y: other.y - dy },
        { ...from, y: other.y + dy },
      ].map((candidate) => clampItem(candidate, wall))
    })
  const distance = (candidate: WallItem) =>
    Math.hypot(candidate.x - item.x, candidate.y - item.y)
  const nearest = (candidates: WallItem[]) => {
    let best: WallItem | undefined
    for (const candidate of candidates)
      if (fits(candidate) && (!best || distance(candidate) < distance(best)))
        best = candidate
    return best
  }
  const first = beside(start)
  let best = nearest([...first, ...first.flatMap(beside)])
  if (!best && scan) {
    const grid: WallItem[] = []
    for (let y = height / 2; y <= wall.height - height / 2; y += 2)
      for (let x = width / 2; x <= wall.width - width / 2; x += 2)
        grid.push({ ...item, x, y })
    best = nearest(grid)
  }
  return best
}

// A spot for a new print that leaves the others where they are: as close to
// the middle of the existing prints as it can be, above the sofa if there is
// room there.
export function placeNew(wall: Wall, item: WallItem): WallItem | undefined {
  const bounds = wall.items.length
    ? wall.items.reduce(
        (box, other) => {
          const [w, h] = outerSize(other)
          return {
            left: Math.min(box.left, other.x - w / 2),
            right: Math.max(box.right, other.x + w / 2),
            top: Math.min(box.top, other.y - h / 2),
            bottom: Math.max(box.bottom, other.y + h / 2),
          }
        },
        { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity },
      )
    : undefined
  const [, height] = outerSize(item)
  const target = {
    ...item,
    x: bounds ? (bounds.left + bounds.right) / 2 : wall.width / 2,
    y: bounds ? (bounds.top + bounds.bottom) / 2 : blockCentre(wall, height),
  }
  const options = { gap: PLACE_GAP, scan: true }
  return (
    nearestFree(target, wall.items, wall, { ...options, aboveSofa: true }) ??
    nearestFree(target, wall.items, wall, options)
  )
}

// Adds prints without moving the ones already up. An empty wall gets a
// gallery; a wall with no room left is rearranged as one.
export function addToWall(wall: Wall, fresh: WallItem[]) {
  const gallery = () => {
    const all = { ...wall, items: [...wall.items, ...fresh] }
    // The first tidy layout: a grid when every print is the same size,
    // otherwise the largest in the middle; nothing touching or on the sofa.
    const same = all.items.every(
      (item) => item.variant === all.items[0].variant,
    )
    const modes: LayoutMode[] = same
      ? ["grid", "row", "gallery", "centre"]
      : ["centre", "row", "gallery", "grid"]
    const sofaTop = all.height - SOFA.height - 4
    for (const mode of modes) {
      const items = arrange(all, mode)
      const tidy = items.every(
        (item) =>
          !collides(item, items) &&
          (!all.sofa || item.y + outerSize(item)[1] / 2 <= sofaTop),
      )
      if (tidy) return { ...all, items }
    }
    return { ...all, items: arrange(all, "gallery") }
  }
  if (!wall.items.length) return { wall: gallery(), rearranged: false }
  let next = wall
  for (const item of fresh) {
    const spot = placeNew(next, item)
    if (!spot) return { wall: gallery(), rearranged: true }
    next = { ...next, items: [...next.items, spot] }
  }
  return { wall: next, rearranged: false }
}

// Pushes prints apart until every pair keeps MIN_GAP. Prints in `fixed` (the
// one being resized or changed) stay put; the others make room, each along
// the axis that needs the shorter move.
export function settle(wall: Wall, fixed: Iterable<string> = []): WallItem[] {
  const pinned = new Set(fixed)
  const items = wall.items.map((item) => ({ ...item }))
  for (let pass = 0; pass < 40; pass++) {
    let moved = false
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]
        const b = items[j]
        if (!tooClose(a, b, MIN_GAP)) continue
        const [aw, ah] = outerSize(a)
        const [bw, bh] = outerSize(b)
        const overlapX = (aw + bw) / 2 + MIN_GAP - Math.abs(a.x - b.x)
        const overlapY = (ah + bh) / 2 + MIN_GAP - Math.abs(a.y - b.y)
        const alongX = overlapX <= overlapY
        const push = alongX ? overlapX : overlapY
        const direction = alongX
          ? Math.sign(b.x - a.x) || 1
          : Math.sign(b.y - a.y) || 1
        const share =
          pinned.has(a.uid) && pinned.has(b.uid)
            ? [0, 0]
            : pinned.has(a.uid)
              ? [0, 1]
              : pinned.has(b.uid)
                ? [1, 0]
                : [0.5, 0.5]
        if (!share[0] && !share[1]) continue
        const axis = alongX ? "x" : "y"
        a[axis] -= direction * push * share[0]
        b[axis] += direction * push * share[1]
        Object.assign(a, clampItem(a, wall))
        Object.assign(b, clampItem(b, wall))
        moved = true
      }
    if (!moved) break
  }
  return items
}

export type Guides = { x?: number; y?: number }

// Snaps a dragged poster to the wall centre and to the edges and centres of
// the other posters (within 2 cm), then to the 5 cm grid when it is on.
export function snapItem(
  item: WallItem,
  wall: Wall,
): { item: WallItem; guides: Guides } {
  const [width, height] = outerSize(item)
  const others = wall.items.filter((other) => other.uid !== item.uid)
  const xs = [wall.width / 2]
  const ys: number[] = []
  for (const other of others) {
    const [w, h] = outerSize(other)
    // Centres and edges, and one gallery gap beside each edge.
    xs.push(
      other.x,
      other.x - w / 2,
      other.x + w / 2,
      other.x - w / 2 - PLACE_GAP,
      other.x + w / 2 + PLACE_GAP,
    )
    ys.push(
      other.y,
      other.y - h / 2,
      other.y + h / 2,
      other.y - h / 2 - PLACE_GAP,
      other.y + h / 2 + PLACE_GAP,
    )
  }
  const guides: Guides = {}
  let { x, y } = item
  const match = (value: number, offsets: number[], targets: number[]) => {
    let best: { shift: number; line: number } | undefined
    for (const offset of offsets)
      for (const target of targets) {
        const shift = target - (value + offset)
        if (
          Math.abs(shift) <= 2 &&
          (!best || Math.abs(shift) < Math.abs(best.shift))
        )
          best = { shift, line: target }
      }
    return best
  }
  const snapX = match(x, [0, -width / 2, width / 2], xs)
  const snapY = match(y, [0, -height / 2, height / 2], ys)
  if (snapX) {
    x += snapX.shift
    guides.x = snapX.line
  } else if (wall.grid) x = Math.round(x / 5) * 5
  if (snapY) {
    y += snapY.shift
    guides.y = snapY.line
  } else if (wall.grid) y = Math.round(y / 5) * 5
  return { item: clampItem({ ...item, x, y }, wall), guides }
}

// Compact, URL-safe form of a wall for share links and local storage.
export function encodeWall(wall: Wall) {
  const data = {
    w: wall.width,
    h: wall.height,
    c: wall.color,
    s: wall.sofa ? 1 : 0,
    g: wall.grid ? 1 : 0,
    i: wall.items.map((item) => [
      item.productId,
      item.variant,
      Math.round(item.x * 10) / 10,
      Math.round(item.y * 10) / 10,
      ...(item.photo ? [item.photo] : []),
    ]),
  }
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

// Reads a shared or stored wall, dropping anything that is not in the
// catalog any more or whose photo is not a valid upload.
export function decodeWall(
  value: string,
  catalog: Map<string, Product>,
): Wall | undefined {
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"))
    const data = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(binary, (character) => character.charCodeAt(0)),
      ),
    )
    const number = (
      input: unknown,
      min: number,
      max: number,
      fallback: number,
    ) =>
      typeof input === "number" && Number.isFinite(input)
        ? clamp(input, min, max)
        : fallback
    const wall: Wall = {
      width: number(data.w, ...WALL_LIMITS.width, 300),
      height: number(data.h, ...WALL_LIMITS.height, 260),
      color:
        typeof data.c === "string" && /^#[0-9a-f]{6}$/i.test(data.c)
          ? data.c
          : wallColors[0].value,
      sofa: data.s !== 0,
      grid: data.g === 1,
      items: [],
    }
    if (Array.isArray(data.i))
      for (const [index, raw] of data.i.slice(0, MAX_ITEMS).entries()) {
        if (!Array.isArray(raw)) continue
        const [productId, variant, x, y, rawPhoto] = raw
        const product = catalog.get(String(productId))
        const photo =
          rawPhoto === undefined ? undefined : sanitizePhoto(rawPhoto)
        if (
          !product ||
          !(
            wallVariants(product).some((option) => option.id === variant) ||
            (product.customImage &&
              typeof variant === "string" &&
              getProductVariant(product, variant))
          ) ||
          !product.customImage !== !photo
        )
          continue
        wall.items.push(
          clampItem(
            {
              uid: `w${index}`,
              productId: product.id,
              variant,
              x: number(x, 0, wall.width, wall.width / 2),
              y: number(y, 0, wall.height, wall.height / 2),
              ...(photo ? { photo } : {}),
            },
            wall,
          ),
        )
      }
    return wall
  } catch {
    return undefined
  }
}
