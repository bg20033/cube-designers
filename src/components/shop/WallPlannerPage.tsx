import { shopHref } from "@/lib/site-links"
import { posterThumb } from "@/components/ResponsiveImage"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react"
import {
  ArrowUpRight,
  Copy,
  Download,
  Grid3x3,
  ImageUp,
  Link2,
  Plus,
  RectangleHorizontal,
  Search,
  ShoppingBag,
  Shuffle,
  Sofa,
  Sparkles,
  Trash2,
  Undo2,
  Redo2,
  ArrowRight,
  ArrowLeft,
  Check,
  AlignCenterHorizontal,
  MousePointer2,
  X,
} from "lucide-react"
import {
  addCartItem,
  cartLineKey,
  getProductVariant,
  sanitizePhoto,
  sanitizeCart,
} from "@/data/commerce"
import {
  PHOTO_PRODUCT_ID,
  getFinish,
  getPosterSize,
  parseVariantId,
  printFinishes,
  variantIdFor,
  type Product,
} from "@/data/products"
import {
  FRAME_CM,
  PrintSurface,
  cropStyle,
} from "@/components/store/PrintSurface"
import { SizeFinishPicker } from "@/components/store/SizeFinishPicker"
import { loadArt, useArt } from "@/components/store/poster-art"
import { usePhotoUpload } from "@/components/store/usePhotoUpload"
import { cropFor } from "@/lib/photo-upload"
import { useShopProducts } from "@/components/shop/useShopProducts"
import { readStoredJson, writeStoredJson } from "@/components/shop/persistence"
import { StoreShell } from "@/components/store/StoreChrome"
import {
  MAX_ITEMS,
  WALL_INCOMING_KEY,
  SOFA,
  WALL_LIMITS,
  arrange,
  clampItem,
  compose,
  compositionsFor,
  rearrange,
  wallSignature,
  decodeWall,
  layoutModes,
  encodeWall,
  outerSize,
  refitPhoto,
  addToWall,
  collides,
  nearestFree,
  PLACE_GAP,
  settle,
  resizeFromCorner,
  snapItem,
  stepSize,
  wallColors,
  wallVariants,
  type Guides,
  type LayoutMode,
  type Wall,
  type WallItem,
} from "./wall-layout"
import { WallRoom } from "./WallRoom"
import { cartItemsForWall, itemsFor, newUid, summarizeWall } from "./wall-cart"
import { WallSelectionPanel } from "./WallSelectionPanel"
import {
  itemsInSelection,
  selectionBounds,
  selectionRect,
  translateSelection,
  type Point,
  type SelectionRect,
} from "./wall-selection"
import { WallSizeControl } from "./WallSizeControl"
import { useWallHistory } from "./useWallHistory"
import { FilterMenu } from "@/components/store/FilterMenu"
import {
  facetGroups,
  matchesFilters,
  type FilterValue,
} from "@/components/store/poster-filters"
import {
  FLOOR_CM,
  SOFA_ASSET,
  SOFA_FLOOR_OFFSET,
  roomSceneSrc,
} from "./wall-scene"
import "@/components/store/compact-controls.css"
import "./wall.css"

const STORAGE_KEY = "cube-wall-v1"
const CART_KEY = "cube-shop-cart-v1"
// Cart lines the wall was opened with (/shop/muri?shporta=1). Saving the wall
// replaces them, so the cart and the wall stay one selection.
const CART_LINK_KEY = "cube-wall-cart-v1"
const PICKER_PAGE = 18
const STARTER = [
  "kinema-gilda",
  "kinema-king-kong",
  "kinema-the-maltese-falcon",
]
const frameColors = { black: "#1d1d1f", white: "#f7f7f5", oak: "#b48a5a" }
const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

function PosterOnWall({
  item,
  product,
  scale,
  selected,
  onPointerDown,
  onKeyDown,
  onResizeStart,
}: {
  item: WallItem
  product: Product
  scale: number
  selected: boolean
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  // Shown on a single selected print: corner handles that step through sizes.
  onResizeStart?: (event: PointerEvent<HTMLSpanElement>, corner: Corner) => void
}) {
  const art = useArt(item.photo ? undefined : product.image)
  const [width, height] = outerSize(item)
  const label = getProductVariant(product, item.variant)?.label
  return (
    <PrintSurface
      finish={parseVariantId(item.variant)?.finish ?? "leter"}
      scale={scale}
      art={art}
      photo={
        item.photo
          ? { src: item.photo.image, crop: item.photo.crop }
          : undefined
      }
      className={`wall-poster${selected ? " is-selected" : ""}`}
      style={{
        left: (item.x - width / 2) * scale,
        top: (item.y - height / 2) * scale,
        width: width * scale,
        height: height * scale,
      }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${item.photo ? "Foto jote" : product.name}, ${label}. Tërhiqe ose përdor shigjetat për ta lëvizur, + dhe − për madhësinë.`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      {selected && (
        <span className="wall-print-measure">
          {sizeName(item.variant) && `${sizeName(item.variant)} · `}
          {Math.round(width * 10) / 10} × {Math.round(height * 10) / 10} cm
        </span>
      )}
      {selected &&
        onResizeStart &&
        corners.map((corner) => (
          <span
            key={corner}
            className={`wall-resize is-${corner}`}
            aria-hidden="true"
            onPointerDown={(event) => onResizeStart(event, corner)}
          />
        ))}
    </PrintSurface>
  )
}

type Corner = "nw" | "ne" | "sw" | "se"
const corners: Corner[] = ["nw", "ne", "sw", "se"]

// "A3" or "Custom"; the poster formats are named by their size alone.
function sizeName(variant: string) {
  const size = getPosterSize(parseVariantId(variant)?.size)
  if (size?.id.startsWith("custom")) return "Custom"
  return size?.label.includes(" · ") ? size.label.split(" · ")[0] : ""
}

function starterWall(catalog: Map<string, Product>, example = false): Wall {
  const wall: Wall = {
    width: 300,
    height: 260,
    color: wallColors[0].value,
    sofa: true,
    grid: false,
    items: !example
      ? []
      : STARTER.flatMap((id, index) => {
          const product = catalog.get(id)
          const variants = product ? wallVariants(product) : []
          const preferred =
            variants.find((variant) => variant.id === "a2-kornize-zeze") ??
            variants.find((variant) => variant.id === "a3-kornize-zeze") ??
            variants[0]
          if (!product || !preferred) return []
          return [
            {
              uid: `s${index}`,
              productId: id,
              variant: preferred.id,
              x: 0,
              y: 0,
            },
          ]
        }),
  }
  return { ...wall, items: arrange(wall, "gallery") }
}

export default function WallPlannerPage() {
  const catalog = useShopProducts()
  const byId = useMemo(
    () => new Map(catalog.map((product) => [product.id, product])),
    [catalog],
  )
  const posters = useMemo(
    () =>
      catalog.filter(
        (product) =>
          product.category === "Postera" &&
          product.image &&
          wallVariants(product).length,
      ),
    [catalog],
  )
  const bundles = useMemo(
    () => catalog.filter((product) => product.category === "Paketa"),
    [catalog],
  )
  const { wall, setWall, checkpoint, undo, redo, canUndo, canRedo } =
    useWallHistory(() => starterWall(byId))
  const [widthValid, setWidthValid] = useState(true)
  const [heightValid, setHeightValid] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [marquee, setMarquee] = useState<SelectionRect>()
  const [guides, setGuides] = useState<Guides>({})
  const [tab, setTab] = useState<"add" | "wall" | "summary">("wall")
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<FilterValue>({})
  const [shown, setShown] = useState(PICKER_PAGE)
  const [notice, setNotice] = useState("")
  const [layoutMode, setLayoutMode] = useState<LayoutMode>()
  const [cartLink, setCartLink] = useState<string[]>([])
  const [cartReady, setCartReady] = useState(0)
  const lastTry = useRef<string>(undefined)
  const lastShape = useRef<string>(undefined)
  const [exporting, setExporting] = useState(false)
  const [space, setSpace] = useState({
    width: 600,
    height: 720,
    compact: false,
  })
  const { enabled: uploadsOn, draft: uploading, select } = usePhotoUpload()
  const photoInput = useRef<HTMLInputElement>(null)
  const columnRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const boxGesture = useRef<{
    start: Point
    pointerX: number
    pointerY: number
    base: string[]
    ids: string[]
    moved: boolean
  } | null>(null)
  const loaded = useRef(false)
  const addingCart = useRef(false)
  const resize = useRef<{
    uid: string
    anchor: Point
    moved: boolean
  } | null>(null)
  const drag = useRef<{
    items: WallItem[]
    pointerX: number
    pointerY: number
    moved: boolean
  } | null>(null)

  // The whole wall stays in view: as wide as the column allows, and no taller
  // than the window minus the shop bars and toolbar.
  const stageWidth = Math.min(
    Math.max(space.compact ? 80 : 120, space.width - 32),
    Math.max(
      space.compact ? 80 : 120,
      ((space.height - (space.compact ? 60 : 100)) * wall.width) /
        (wall.height + FLOOR_CM),
    ),
  )
  const scale = stageWidth / wall.width
  const stepIndex = tab === "wall" ? 0 : tab === "add" ? 1 : 2
  const selectedItems = wall.items.filter((item) =>
    selectedIds.includes(item.uid),
  )
  const selected = selectedItems.length === 1 ? selectedItems[0] : undefined
  const groupBounds =
    selectedItems.length > 1 ? selectionBounds(selectedItems) : undefined
  const selectedProduct = selected && byId.get(selected.productId)

  // The saved wall (or a shared link) replaces the starter after hydration,
  // and ?add= puts a poster or a bundle's posters on it.
  useEffect(() => {
    // Runs once: a later catalog update must not reset the wall being edited.
    if (loaded.current) return
    loaded.current = true
    const params = new URLSearchParams(window.location.search)
    const shared = params.get("muri")
    let next =
      (shared && decodeWall(shared, byId)) ||
      decodeWall(readStoredJson(STORAGE_KEY, ""), byId) ||
      starterWall(byId)
    // From the cart drawer: the wall shows exactly what is in the cart.
    const fromCart =
      params.get("shporta") === "1" &&
      cartItemsForWall(sanitizeCart(readStoredJson(CART_KEY, [])), byId)
    if (fromCart && fromCart.items.length) {
      const preview = { ...next, items: fromCart.items }
      next = { ...preview, items: arrange(preview, "gallery") }
      setCartLink(fromCart.keys)
      writeStoredJson(CART_LINK_KEY, fromCart.keys)
      setTab("summary")
    } else if (shared) writeStoredJson(CART_LINK_KEY, [])
    else setCartLink(readStoredJson<string[]>(CART_LINK_KEY, []))
    setCartReady(
      cartItemsForWall(sanitizeCart(readStoredJson(CART_KEY, [])), byId).items
        .length,
    )
    const add = params.get("add")
    const product = add ? byId.get(add) : undefined
    // A photo sent over from /shop/foto.
    const incoming = readStoredJson<{
      variant?: string
      photo?: unknown
    } | null>(WALL_INCOMING_KEY, null)
    writeStoredJson(WALL_INCOMING_KEY, null)
    const incomingPhoto = incoming?.photo
      ? sanitizePhoto(incoming.photo)
      : undefined
    const photoItem =
      incomingPhoto &&
      byId.get(PHOTO_PRODUCT_ID) &&
      getProductVariant(byId.get(PHOTO_PRODUCT_ID)!, incoming?.variant)
        ? [
            {
              uid: newUid(),
              productId: PHOTO_PRODUCT_ID,
              variant: incoming!.variant!,
              x: 0,
              y: 0,
              photo: incomingPhoto,
            },
          ]
        : []
    if (product?.includes) {
      // Trying a bundle starts from a clear wall (same size and paint) with
      // just its posters; "Kthe" brings the previous wall back. The wall no
      // longer stands for the cart, so saving it adds rather than replaces.
      setWall(next, false)
      if (next.items.length)
        setNotice("U vendos vetëm paketa. “Kthe” e sjell murin e mëparshëm.")
      next = addToWall({ ...next, items: [] }, itemsFor(product, byId)).wall
      setCartLink([])
      writeStoredJson(CART_LINK_KEY, [])
      setWall(next)
    } else {
      if (product || photoItem.length) {
        const fresh = [
          ...(product ? itemsFor(product, byId) : []),
          ...photoItem,
        ]
        const keep = next.items.slice(0, Math.max(0, MAX_ITEMS - fresh.length))
        // The saved wall keeps its layout; the new prints go into free space.
        next = addToWall({ ...next, items: keep }, fresh).wall
        if (fresh[fresh.length - 1]) openSelection(fresh[fresh.length - 1].uid)
      }
      setWall(next, false)
    }
    if (add || shared || incomingPhoto) setTab("add")
    setHydrated(true)
  }, [byId, setWall])

  useEffect(() => {
    if (hydrated) writeStoredJson(STORAGE_KEY, encodeWall(wall))
  }, [wall, hydrated])

  useEffect(() => {
    const column = columnRef.current
    if (!column) return
    const measure = () => {
      const style = getComputedStyle(column)
      setSpace({
        compact: window.matchMedia("(max-width: 820px)").matches,
        width:
          column.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight),
        height:
          column.clientHeight -
          parseFloat(style.paddingTop) -
          parseFloat(style.paddingBottom),
      })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(column)
    measure()
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(""), 3200)
    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    const keydown = (event: globalThis.KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "z" ||
        (event.target instanceof HTMLElement &&
          (event.target.matches("input,textarea,select") ||
            event.target.isContentEditable))
      )
        return
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
    }
    window.addEventListener("keydown", keydown)
    return () => window.removeEventListener("keydown", keydown)
  }, [undo, redo])

  function update(change: (current: Wall) => Wall) {
    setWall((current) => change(current))
  }

  function setItems(items: WallItem[], record = true) {
    setWall((current) => ({ ...current, items }), record)
  }

  function openSelection(uid: string) {
    setSelectedIds([uid])
    setTab("add")
    requestAnimationFrame(() =>
      panelRef.current?.scrollTo({ top: 0, behavior: "instant" }),
    )
  }

  function resizeWall(axis: "width" | "height", value: number, record = true) {
    setWall((current) => {
      const next = { ...current, [axis]: value }
      const clamped = {
        ...next,
        items: next.items.map((item) => clampItem(item, next)),
      }
      return { ...clamped, items: settle(clamped) }
    }, record)
  }

  function loadExample() {
    const sample = starterWall(byId, true)
    update((current) => {
      const next = { ...current, items: sample.items }
      return { ...next, items: arrange(next, "gallery") }
    })
    setTab("add")
    setNotice("Galeria shembull u vendos. Mund ta ndryshosh si të duash.")
  }

  function placeItems(fresh: WallItem[]) {
    if (wall.items.length + fresh.length > MAX_ITEMS) {
      setNotice(`Muri merr deri në ${MAX_ITEMS} postera.`)
      return false
    }
    const placed = addToWall(wall, fresh)
    setWall(placed.wall)
    if (placed.rearranged)
      setNotice("S’kishte vend të lirë, prandaj muri u rirregullua.")
    if (fresh[fresh.length - 1]) openSelection(fresh[fresh.length - 1].uid)
    return true
  }

  function addPoster(product: Product) {
    if (product.includes) return tryBundle(product)
    if (!placeItems(itemsFor(product, byId))) return
    setNotice(`${product.name} u shtua.`)
  }

  // A bundle is tried on its own: the wall is cleared for it (one undo step
  // brings the previous posters back).
  function tryBundle(product: Product) {
    const cleared = { ...wall, items: [] }
    setWall(addToWall(cleared, itemsFor(product, byId)).wall)
    setSelectedIds([])
    setCartLink([])
    writeStoredJson(CART_LINK_KEY, [])
    setNotice(
      wall.items.length
        ? `${product.name} në mur të pastër. “Kthe” e sjell murin e mëparshëm.`
        : `${product.name} u vendos në mur.`,
    )
  }

  async function addPhoto(file?: File) {
    if (!file) return
    try {
      const picked = await select(file)
      if (!picked?.uploaded) {
        setNotice(
          picked
            ? "Ngarkimi i fotove ende s’është aktivizuar."
            : "Ngarkimi dështoi. Provo përsëri.",
        )
        return
      }
      const landscape = picked.width > picked.height
      const variant = "30x40"
      placeItems([
        {
          uid: newUid(),
          productId: PHOTO_PRODUCT_ID,
          variant,
          x: 0,
          y: 0,
          photo: {
            image: picked.uploaded.image,
            original: picked.uploaded.original,
            crop: cropFor(picked, landscape ? 40 / 30 : 30 / 40, 1, 0.5, 0.5),
            ...(landscape ? { landscape: true } : {}),
            name: picked.name.slice(0, 80),
          },
        },
      ])
      setNotice("Fotoja jote u vendos në mur.")
    } catch {
      setNotice("Kjo foto nuk mund të lexohet. Provo JPG ose PNG.")
    }
  }

  function changeItem(uid: string, change: Partial<WallItem>) {
    update((current) => ({
      ...current,
      items: settle(
        {
          ...current,
          items: current.items.map((item) =>
            item.uid === uid
              ? clampItem({ ...item, ...change }, current)
              : item,
          ),
        },
        [uid],
      ),
    }))
  }

  function removeItem(uid: string) {
    setItems(wall.items.filter((item) => item.uid !== uid))
    setSelectedIds([])
  }

  function duplicateItem(item: WallItem) {
    if (wall.items.length >= MAX_ITEMS) return
    const [width] = outerSize(item)
    const copy = nearestFree(
      { ...item, uid: newUid(), x: item.x + width + PLACE_GAP },
      wall.items,
      wall,
      { gap: PLACE_GAP, scan: true },
    )
    if (!copy) {
      setNotice("S’ka vend të lirë për një kopje.")
      return
    }
    setItems([...wall.items, copy])
    openSelection(copy.uid)
  }

  function chooseItems(ids: string[]) {
    setSelectedIds(ids)
    if (ids.length) {
      setTab("add")
      requestAnimationFrame(() =>
        panelRef.current?.scrollTo({ top: 0, behavior: "instant" }),
      )
    }
  }

  function moveSelection(
    items: WallItem[],
    dx: number,
    dy: number,
    record = true,
  ) {
    const shifted = translateSelection(items, wall, dx, dy)
    const ids = new Set(items.map((item) => item.uid))
    const rest = wall.items.filter((item) => !ids.has(item.uid))
    // Stops at the last position that keeps its distance from the others.
    if (shifted.some((item) => collides(item, rest))) return
    const moved = new Map(shifted.map((item) => [item.uid, item]))
    setItems(
      wall.items.map((item) => moved.get(item.uid) ?? item),
      record,
    )
  }

  function startDrag(event: PointerEvent<HTMLDivElement>, item: WallItem) {
    if (event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      chooseItems(
        selectedIds.includes(item.uid)
          ? selectedIds.filter((id) => id !== item.uid)
          : [...selectedIds, item.uid],
      )
      return
    }
    const items = selectedIds.includes(item.uid) ? selectedItems : [item]
    if (!selectedIds.includes(item.uid)) chooseItems([item.uid])
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      items,
      pointerX: event.clientX,
      pointerY: event.clientY,
      moved: false,
    }
  }

  function wallPoint(event: PointerEvent<HTMLDivElement>): Point {
    const box = surfaceRef.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(wall.width, (event.clientX - box.left) / scale)),
      y: Math.max(0, Math.min(wall.height, (event.clientY - box.top) / scale)),
    }
  }

  function startBox(event: PointerEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest(".wall-poster"))
    )
      return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    const base =
      event.shiftKey || event.metaKey || event.ctrlKey
        ? selectedItems.map((item) => item.uid)
        : []
    setSelectedIds(base)
    boxGesture.current = {
      start: wallPoint(event),
      pointerX: event.clientX,
      pointerY: event.clientY,
      base,
      ids: base,
      moved: false,
    }
  }

  // Corner handles keep the opposite corner in place and snap to sizes.
  function startResize(
    event: PointerEvent<HTMLSpanElement>,
    item: WallItem,
    corner: Corner,
  ) {
    if (event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const [width, height] = outerSize(item)
    resize.current = {
      uid: item.uid,
      anchor: {
        x: item.x + (corner.includes("w") ? width / 2 : -width / 2),
        y: item.y + (corner.includes("n") ? height / 2 : -height / 2),
      },
      moved: false,
    }
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const sizing = resize.current
    if (sizing) {
      const item = wall.items.find((entry) => entry.uid === sizing.uid)
      const product = item && byId.get(item.productId)
      if (!item || !product) return
      const next = resizeFromCorner(
        item,
        product,
        sizing.anchor,
        wallPoint(event),
        wall,
      )
      if (next.variant === item.variant && sizing.moved) return
      if (
        next.variant === item.variant &&
        next.x === item.x &&
        next.y === item.y
      )
        return
      if (!sizing.moved) {
        checkpoint()
        setLayoutMode(undefined)
        sizing.moved = true
      }
      setItems(
        settle(
          {
            ...wall,
            items: wall.items.map((entry) =>
              entry.uid === item.uid ? next : entry,
            ),
          },
          [item.uid],
        ),
        false,
      )
      return
    }
    const box = boxGesture.current
    if (box) {
      if (
        !box.moved &&
        Math.hypot(event.clientX - box.pointerX, event.clientY - box.pointerY) <
          3
      )
        return
      box.moved = true
      const rect = selectionRect(box.start, wallPoint(event))
      const ids = [
        ...new Set([...box.base, ...itemsInSelection(wall.items, rect)]),
      ]
      box.ids = ids
      setMarquee(rect)
      setSelectedIds(ids)
      return
    }
    const active = drag.current
    if (!active) return
    if (!active.moved) {
      if (
        Math.hypot(
          event.clientX - active.pointerX,
          event.clientY - active.pointerY,
        ) < 2
      )
        return
      checkpoint()
      setLayoutMode(undefined)
      active.moved = true
    }
    let dx = (event.clientX - active.pointerX) / scale
    let dy = (event.clientY - active.pointerY) / scale
    if (active.items.length === 1) {
      const item = active.items[0]
      const snapped = snapItem(
        { ...item, x: item.x + dx, y: item.y + dy },
        wall,
      )
      // Slides along a neighbour instead of covering it.
      const free = nearestFree(snapped.item, wall.items, wall)
      if (!free) return
      setGuides(
        free.x === snapped.item.x && free.y === snapped.item.y
          ? snapped.guides
          : {},
      )
      setItems(
        wall.items.map((entry) => (entry.uid === item.uid ? free : entry)),
        false,
      )
    } else {
      if (wall.grid) {
        dx = Math.round(dx / 5) * 5
        dy = Math.round(dy / 5) * 5
      }
      moveSelection(active.items, dx, dy, false)
    }
  }

  function endDrag() {
    resize.current = null
    const box = boxGesture.current
    if (box?.moved) chooseItems(box.ids)
    drag.current = null
    boxGesture.current = null
    setMarquee(undefined)
    setGuides({})
  }

  function removeSelection(items = selectedItems) {
    const ids = new Set(items.map((item) => item.uid))
    setItems(wall.items.filter((item) => !ids.has(item.uid)))
    setSelectedIds([])
  }

  function duplicateSelection() {
    if (
      !selectedItems.length ||
      wall.items.length + selectedItems.length > MAX_ITEMS
    )
      return
    const copies = selectedItems.map((item) => ({ ...item, uid: newUid() }))
    // Beside the group, below it, or wherever the copies fit.
    const bounds = selectionBounds(copies)!
    const shifted =
      [
        [bounds.width + PLACE_GAP, 0],
        [0, bounds.height + PLACE_GAP],
        [-bounds.width - PLACE_GAP, 0],
        [0, -bounds.height - PLACE_GAP],
      ]
        .map(([dx, dy]) => translateSelection(copies, wall, dx, dy))
        .find((moved) =>
          moved.every((item) => !collides(item, wall.items, PLACE_GAP)),
        ) ?? addToWall(wall, copies).wall.items.slice(wall.items.length)
    setItems([...wall.items, ...shifted])
    chooseItems(shifted.map((item) => item.uid))
  }

  function changeSelection(change: { size?: string; finish?: string }) {
    update((current) => {
      const next = {
        ...current,
        items: current.items.map((item) => {
          if (!selectedIds.includes(item.uid)) return item
          const old = parseVariantId(item.variant)!
          const product = byId.get(item.productId)!
          const size = change.size ?? old.size
          const desired = variantIdFor(size, change.finish ?? old.finish)
          const variant =
            getProductVariant(product, desired)?.id ??
            (change.size
              ? getProductVariant(product, variantIdFor(size, "leter"))?.id
              : undefined)
          if (!variant) return item
          return clampItem(
            {
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
            },
            current,
          )
        }),
      }
      // Grown prints push the rest aside, keeping the layout's shape.
      return {
        ...next,
        items: settle(next, selectedIds.length === 1 ? selectedIds : []),
      }
    })
  }

  function nudge(event: KeyboardEvent<HTMLDivElement>, item?: WallItem) {
    if (event.defaultPrevented) return
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      event.preventDefault()
      chooseItems(wall.items.map((item) => item.uid))
      return
    }
    const items =
      item && !selectedIds.includes(item.uid) ? [item] : selectedItems
    const product = item && byId.get(item.productId)
    if (item && product && ["+", "=", "-", "−"].includes(event.key)) {
      event.preventDefault()
      const next = stepSize(
        item,
        product,
        event.key === "-" || event.key === "−" ? -1 : 1,
        wall,
      )
      changeItem(item.uid, next)
      return
    }
    const step = event.shiftKey ? 5 : 1
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    if (moves[event.key] && items.length) {
      event.preventDefault()
      setSelectedIds(items.map((item) => item.uid))
      moveSelection(items, ...moves[event.key])
    } else if (
      (event.key === "Delete" || event.key === "Backspace") &&
      items.length
    ) {
      event.preventDefault()
      removeSelection(items)
    } else if (event.key === "Escape") {
      event.preventDefault()
      setSelectedIds([])
      boxGesture.current = null
      drag.current = null
      setMarquee(undefined)
      setGuides({})
    } else if (item && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault()
      if (event.shiftKey || event.metaKey || event.ctrlKey)
        chooseItems(
          selectedIds.includes(item.uid)
            ? selectedIds.filter((id) => id !== item.uid)
            : [...selectedIds, item.uid],
        )
      else openSelection(item.uid)
    }
  }

  // Puts every print in one finish, in its current size where that finish is
  // made in it.
  function applyFinish(finish: string) {
    update((current) => {
      const next = {
        ...current,
        items: current.items.map((item) => {
          const parsed = parseVariantId(item.variant)
          const variant = parsed && variantIdFor(parsed.size, finish)
          const product = byId.get(item.productId)
          return variant && product && getProductVariant(product, variant)
            ? { ...item, variant }
            : item
        }),
      }
      const clamped = {
        ...next,
        items: next.items.map((item) => clampItem(item, next)),
      }
      return { ...clamped, items: settle(clamped) }
    })
  }

  function applyLayout(mode: LayoutMode) {
    setItems(arrange(wall, mode))
    setLayoutMode(mode)
  }

  // Each press tries the next composition: new sizes and a tidy arrangement
  // for the same prints.
  // "Provo": a random composition with new sizes, never the one just shown.
  function tryComposition() {
    const options = compositionsFor(wall.items.length).filter(
      (composition) => composition.id !== lastTry.current,
    )
    const current = wallSignature(wall.items)
    for (let attempt = 0; attempt < 8; attempt++) {
      const composition = options[Math.floor(Math.random() * options.length)]
      const items = compose(
        wall,
        composition,
        byId,
        Math.floor(Math.random() * 2 ** 31),
      )
      if (wallSignature(items) === current && attempt < 7) continue
      lastTry.current = composition.id
      setItems(items)
      setLayoutMode(undefined)
      setSelectedIds([])
      setNotice(`${composition.label} · shtyp “Provo” për një tjetër`)
      return
    }
  }

  // "Ri-rregullo": the same sizes, moved into another shape.
  function shuffleLayout() {
    const result = rearrange(
      wall,
      Math.floor(Math.random() * 2 ** 31),
      lastShape.current,
    )
    if (!result) {
      setNotice("S’ka vend për një rregullim tjetër pa i ndryshuar madhësitë.")
      return
    }
    lastShape.current = result.id
    setItems(result.items)
    setLayoutMode(undefined)
    setNotice(`${result.label} · madhësitë nuk ndryshuan`)
  }

  function loadCart() {
    const fromCart = cartItemsForWall(
      sanitizeCart(readStoredJson(CART_KEY, [])),
      byId,
    )
    if (!fromCart.items.length) return
    const preview = { ...wall, items: fromCart.items }
    setWall({ ...preview, items: arrange(preview, "gallery") })
    setCartLink(fromCart.keys)
    writeStoredJson(CART_LINK_KEY, fromCart.keys)
    setSelectedIds([])
    setNotice("Posterat e shportës janë në mur.")
  }

  function clearWall() {
    setItems([])
    setSelectedIds([])
  }

  const summary = useMemo(
    () => summarizeWall(wall.items, byId, bundles),
    [wall.items, byId, bundles],
  )

  function addAllToCart() {
    if (addingCart.current || !summary.lines.length) return
    addingCart.current = true
    const linked = new Set(cartLink)
    let cart = sanitizeCart(readStoredJson(CART_KEY, [])).filter(
      (item) => !linked.has(cartLineKey(item)),
    )
    const before = cart.reduce((sum, item) => sum + item.quantity, 0)
    const requested = summary.lines.reduce((sum, line) => sum + line.count, 0)
    for (const line of summary.lines)
      for (let count = 0; count < line.count; count++)
        cart = addCartItem(cart, line.product, line.variant, line.photo)
    if (
      cart.reduce((sum, item) => sum + item.quantity, 0) !==
      before + requested
    ) {
      addingCart.current = false
      setNotice(
        "Shporta ka arritur kufirin. Largo disa produkte dhe provo përsëri.",
      )
      return
    }
    writeStoredJson(CART_KEY, cart)
    if (
      JSON.stringify(readStoredJson(CART_KEY, null)) !== JSON.stringify(cart)
    ) {
      addingCart.current = false
      setNotice(
        "Shfletuesi nuk po e ruan shportën. Aktivizo ruajtjen lokale dhe provo përsëri.",
      )
      return
    }
    // The cart now holds this wall; later edits update the same lines.
    writeStoredJson(
      CART_LINK_KEY,
      summary.lines.map((line) =>
        cartLineKey({
          productId: line.product.id,
          variantId: line.variant,
          photo: line.photo,
        }),
      ),
    )
    window.location.href = shopHref("/shop?cart=1")
  }

  async function shareWall() {
    const url = `${window.location.origin}${shopHref("/shop/muri")}?muri=${encodeWall(wall)}`
    try {
      await navigator.clipboard.writeText(url)
      setNotice("Linku i murit u kopjua.")
    } catch {
      window.prompt("Kopjo linkun e murit:", url)
    }
  }

  async function exportImage() {
    if (exporting) return
    setExporting(true)
    try {
      await downloadImage()
    } catch {
      setNotice("Fotoja nuk u krijua. Kontrollo lidhjen dhe provo përsëri.")
    } finally {
      setExporting(false)
    }
  }

  async function downloadImage() {
    const unit = Math.min(8, 2400 / wall.width)
    const floor = FLOOR_CM * unit
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(wall.width * unit)
    canvas.height = Math.round(wall.height * unit + floor)
    const context = canvas.getContext("2d")
    if (!context) return
    const room = new Image()
    room.src = roomSceneSrc(wall.width, wall.height, wall.color, wall.sofa)
    await room.decode()
    context.drawImage(room, 0, 0, canvas.width, canvas.height)
    if (wall.sofa) {
      const left = (wall.width - SOFA.width) / 2
      const top = wall.height - SOFA.height + SOFA_FLOOR_OFFSET
      context.save()
      context.fillStyle = "rgba(0,0,0,.26)"
      context.filter = `blur(${2.5 * unit}px)`
      context.beginPath()
      context.ellipse(
        (wall.width * unit) / 2,
        (wall.height + 5) * unit,
        SOFA.width * 0.52 * unit,
        5 * unit,
        0,
        0,
        Math.PI * 2,
      )
      context.fill()
      context.restore()
      const sofa = new Image()
      sofa.src = SOFA_ASSET.src
      await sofa.decode()
      const { crop } = SOFA_ASSET
      const sofaHeight = (SOFA.width * crop.height) / crop.width
      context.save()
      context.filter = "saturate(.7)"
      context.drawImage(
        sofa,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        left * unit,
        (top + SOFA.height - sofaHeight) * unit,
        SOFA.width * unit,
        sofaHeight * unit,
      )
      context.restore()
    }
    for (const item of wall.items) {
      const product = byId.get(item.productId)
      if (!product?.image) continue
      context.save()
      const [width, height] = outerSize(item)
      const finish = getFinish(parseVariantId(item.variant)?.finish)
      const x = (item.x - width / 2) * unit
      const y = (item.y - height / 2) * unit
      context.save()
      context.shadowColor = "rgba(0,0,0,0.26)"
      context.shadowBlur = 1.8 * unit
      context.shadowOffsetX = 0
      context.shadowOffsetY = 0.9 * unit
      context.fillStyle = finish?.frame ? frameColors[finish.frame] : "#ffffff"
      context.fillRect(x, y, width * unit, height * unit)
      context.restore()
      const border = finish?.frame ? FRAME_CM * unit : 0
      const face = {
        x: x + border,
        y: y + border,
        w: width * unit - border * 2,
        h: height * unit - border * 2,
      }
      context.fillStyle = "#ffffff"
      context.fillRect(face.x, face.y, face.w, face.h)
      const image = new Image()
      image.crossOrigin = "anonymous"
      image.src = item.photo ? item.photo.image : await loadArt(product.image)
      try {
        await image.decode()
      } catch {
        context.restore()
        continue
      }
      if (item.photo) {
        const { crop } = item.photo
        context.drawImage(
          image,
          crop.x * image.width,
          crop.y * image.height,
          crop.w * image.width,
          crop.h * image.height,
          face.x,
          face.y,
          face.w,
          face.h,
        )
      } else {
        const fit = Math.min(face.w / image.width, face.h / image.height)
        context.drawImage(
          image,
          face.x + (face.w - image.width * fit) / 2,
          face.y + (face.h - image.height * fit) / 2,
          image.width * fit,
          image.height * fit,
        )
      }
      if (finish?.frame) {
        context.strokeStyle = "rgba(255,255,255,.3)"
        context.lineWidth = 0.18 * unit
        context.strokeRect(
          x + 0.15 * unit,
          y + 0.15 * unit,
          width * unit - 0.3 * unit,
          height * unit - 0.3 * unit,
        )
        context.save()
        context.strokeStyle = "rgba(0,0,0,.18)"
        context.lineWidth = 0.22 * unit
        context.strokeRect(face.x, face.y, face.w, face.h)
        context.restore()
      }
      if (finish?.id === "pleksi" || finish?.frame) {
        const gloss = context.createLinearGradient(
          face.x,
          face.y,
          face.x + face.w,
          face.y + face.h,
        )
        gloss.addColorStop(
          0,
          finish?.frame ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.35)",
        )
        gloss.addColorStop(0.4, "rgba(255,255,255,0)")
        context.fillStyle = gloss
        context.fillRect(face.x, face.y, face.w, face.h)
      }
      context.restore()
    }
    const link = document.createElement("a")
    link.download = "muri-cube.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  const pickable = useMemo(() => [...posters, ...bundles], [posters, bundles])
  const filterGroups = useMemo(() => facetGroups(pickable), [pickable])
  const term = query.trim().toLowerCase()
  const pickerItems = pickable.filter(
    (product) =>
      matchesFilters(product, filters) &&
      (!term || product.name.toLowerCase().includes(term)),
  )

  return (
    <StoreShell className="wall-page">
      <main id="main-content" className="wall-main">
        <h1 className="sr-only">Konfiguro murin</h1>

        <div className="wall-workspace">
          <section
            className="wall-stage-column"
            aria-label="Muri"
            ref={columnRef}
          >
            <div className="wall-toolbar">
              <div
                className="wall-layouts"
                role="group"
                aria-label="Rregullo posterat"
              >
                {layoutModes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    aria-pressed={layoutMode === mode.id}
                    disabled={!wall.items.length}
                    onClick={() => applyLayout(mode.id)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="wall-shuffle"
                disabled={wall.items.length < 2}
                title="Vende të tjera për të njëjtat postera, pa i ndryshuar madhësitë"
                onClick={shuffleLayout}
              >
                <Shuffle /> Ri-rregullo
              </button>
              <button
                type="button"
                className="wall-try"
                disabled={!wall.items.length}
                title="Madhësi dhe forma të reja për të njëjtat postera"
                onClick={tryComposition}
              >
                <Sparkles /> Provo
              </button>
              <div className="wall-toolbar-group">
                <button
                  type="button"
                  aria-label="Kthe veprimin"
                  title="Kthe (⌘/Ctrl Z)"
                  disabled={!canUndo}
                  onClick={undo}
                >
                  <Undo2 />
                </button>
                <button
                  type="button"
                  aria-label="Përsërit veprimin"
                  title="Përsërit (⌘/Ctrl Shift Z)"
                  disabled={!canRedo}
                  onClick={redo}
                >
                  <Redo2 />
                </button>
                <button
                  type="button"
                  aria-label="Zgjidh krejt posterat"
                  title="Zgjidh krejt (⌘/Ctrl A)"
                  disabled={!wall.items.length}
                  onClick={() =>
                    chooseItems(wall.items.map((item) => item.uid))
                  }
                >
                  <MousePointer2 />
                </button>
                <button
                  type="button"
                  aria-label="Kopjo linkun e murit"
                  title="Ndaj murin"
                  onClick={() => void shareWall()}
                >
                  <Link2 />
                </button>
                <button
                  type="button"
                  aria-label="Shkarko foton e murit"
                  title="Shkarko foton"
                  disabled={exporting}
                  onClick={() => void exportImage()}
                >
                  <Download />
                </button>
                <button
                  type="button"
                  aria-label="Pastro murin"
                  title="Pastro murin"
                  disabled={!wall.items.length}
                  onClick={clearWall}
                >
                  <Trash2 />
                </button>
              </div>
            </div>

            <div
              className="wall-scene-frame"
              style={{ width: stageWidth + 28 }}
            >
              <div className="wall-ruler-x" aria-hidden="true">
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <span key={ratio} style={{ left: `${ratio * 100}%` }}>
                    {Math.round(wall.width * ratio)}
                  </span>
                ))}
              </div>
              <div
                className="wall-ruler-y"
                style={{ height: wall.height * scale }}
                aria-hidden="true"
              >
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <span key={ratio} style={{ top: `${ratio * 100}%` }}>
                    {Math.round(wall.height * (1 - ratio))}
                  </span>
                ))}
              </div>
              <div
                className="wall-stage"
                style={
                  { width: stageWidth, "--scene-scale": scale } as CSSProperties
                }
              >
                <WallRoom wall={wall} scale={scale} />
                <div
                  className={`wall-surface${wall.grid ? " has-grid" : ""}${selectedItems.length > 1 ? " has-multiple" : ""}`}
                  style={
                    {
                      height: wall.height * scale,

                      "--grid": `${10 * scale}px`,
                    } as CSSProperties
                  }
                  ref={surfaceRef}
                  role="group"
                  tabIndex={0}
                  aria-label="Muri: tërhiq në hapësirë për të zgjedhur disa postera"
                  onPointerDown={startBox}
                  onKeyDown={(event) => nudge(event)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onLostPointerCapture={endDrag}
                >
                  <span className="wall-dimensions">
                    {wall.width} × {wall.height} cm
                  </span>
                  {guides.x !== undefined && (
                    <span
                      className="wall-guide is-vertical"
                      style={{ left: guides.x * scale }}
                    />
                  )}
                  {guides.y !== undefined && (
                    <span
                      className="wall-guide is-horizontal"
                      style={{ top: guides.y * scale }}
                    />
                  )}
                  {wall.items.map((item) => {
                    const product = byId.get(item.productId)
                    return product ? (
                      <PosterOnWall
                        key={item.uid}
                        item={item}
                        product={product}
                        scale={scale}
                        selected={selectedIds.includes(item.uid)}
                        onPointerDown={(event) => startDrag(event, item)}
                        onResizeStart={
                          selected?.uid === item.uid
                            ? (event, corner) =>
                                startResize(event, item, corner)
                            : undefined
                        }
                        onKeyDown={(event) => nudge(event, item)}
                      />
                    ) : null
                  })}
                  {groupBounds && (
                    <div
                      className="wall-selection-outline"
                      aria-hidden="true"
                      style={{
                        left: groupBounds.left * scale - 5,
                        top: groupBounds.top * scale - 5,
                        width: groupBounds.width * scale + 10,
                        height: groupBounds.height * scale + 10,
                      }}
                    >
                      <span>{selectedItems.length} të zgjedhur</span>
                    </div>
                  )}
                  {marquee && (
                    <div
                      className="wall-marquee"
                      aria-hidden="true"
                      style={{
                        left: marquee.left * scale,
                        top: marquee.top * scale,
                        width: marquee.width * scale,
                        height: marquee.height * scale,
                      }}
                    />
                  )}
                </div>
                <div
                  className="wall-floor"
                  style={{ height: FLOOR_CM * scale }}
                  aria-hidden="true"
                />
              </div>
            </div>
            <p className="wall-hint">
              Tërhiq posterat · Shift+klik për disa njëherësh
            </p>
          </section>

          <aside className="wall-panel" aria-label="Konfigurimi i murit">
            <div
              className="wall-tabs"
              role="tablist"
              aria-label="Hapat e konfigurimit"
            >
              {(
                [
                  ["wall", "Muri"],
                  ["add", "Posterat"],
                  ["summary", `Shporta (${wall.items.length})`],
                ] as const
              ).map(([id, label], index) => (
                <button
                  key={id}
                  id={`wall-tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  aria-controls={`wall-panel-${id}`}
                  tabIndex={tab === id ? 0 : -1}
                  onKeyDown={(event) => {
                    if (
                      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        event.key,
                      )
                    )
                      return
                    event.preventDefault()
                    const keys = ["wall", "add", "summary"] as const
                    const index =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? 2
                          : (stepIndex + (event.key === "ArrowRight" ? 1 : 2)) %
                            3
                    if (index !== 0 && (!widthValid || !heightValid)) return
                    setTab(keys[index])
                    document.getElementById(`wall-tab-${keys[index]}`)?.focus()
                  }}
                  disabled={id !== "wall" && (!widthValid || !heightValid)}
                  onClick={() => {
                    setTab(id)
                    panelRef.current?.scrollTo({ top: 0 })
                  }}
                >
                  <span aria-hidden="true">
                    {index < stepIndex ? <Check size={12} /> : index + 1}
                  </span>
                  {label}
                </button>
              ))}
            </div>
            <div className="wall-panel-scroll" ref={panelRef}>
              {tab === "wall" && (
                <section
                  className="wall-settings"
                  role="tabpanel"
                  id="wall-panel-wall"
                  aria-labelledby="wall-tab-wall"
                >
                  <div className="wall-size-fields">
                    <WallSizeControl
                      label="Gjerësia e murit"
                      value={wall.width}
                      limits={WALL_LIMITS.width}
                      onChange={(value, record) =>
                        resizeWall("width", value, record)
                      }
                      onGestureStart={checkpoint}
                      onValidity={setWidthValid}
                    />
                    <WallSizeControl
                      label="Lartësia e murit"
                      value={wall.height}
                      limits={WALL_LIMITS.height}
                      onChange={(value, record) =>
                        resizeWall("height", value, record)
                      }
                      onGestureStart={checkpoint}
                      onValidity={setHeightValid}
                    />
                  </div>
                  <fieldset>
                    <legend>
                      Ngjyra e murit{" "}
                      <span className="wall-color-name">
                        {wallColors.find((color) => color.value === wall.color)
                          ?.label ?? wall.color}
                      </span>
                    </legend>
                    <div className="wall-swatches">
                      {wallColors.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          style={{ background: color.value }}
                          aria-label={color.label}
                          aria-pressed={wall.color === color.value}
                          title={color.label}
                          onClick={() =>
                            update((current) => ({
                              ...current,
                              color: color.value,
                            }))
                          }
                        />
                      ))}
                      <label
                        className={`wall-color-custom${wallColors.some((color) => color.value === wall.color) ? "" : " is-active"}`}
                        title="Ngjyrë tjetër"
                      >
                        <input
                          type="color"
                          aria-label="Zgjidh një ngjyrë tjetër për murin"
                          value={wall.color}
                          onFocus={checkpoint}
                          onChange={(event) => {
                            const color = event.target.value
                            setWall((current) => ({ ...current, color }), false)
                          }}
                        />
                      </label>
                    </div>
                  </fieldset>
                  <div className="wall-toggles">
                    <label>
                      <input
                        type="checkbox"
                        checked={wall.sofa}
                        onChange={(event) =>
                          update((current) => ({
                            ...current,
                            sofa: event.target.checked,
                          }))
                        }
                      />
                      <Sofa /> Divani për shkallë (210 cm)
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={wall.grid}
                        onChange={(event) =>
                          update((current) => ({
                            ...current,
                            grid: event.target.checked,
                          }))
                        }
                      />
                      <Grid3x3 /> Rrjetë 10 cm, kapje çdo 5 cm
                    </label>
                  </div>
                </section>
              )}

              {tab === "add" && selectedItems.length > 1 && (
                <WallSelectionPanel
                  items={selectedItems}
                  catalog={byId}
                  canDuplicate={
                    wall.items.length + selectedItems.length <= MAX_ITEMS
                  }
                  onVariant={changeSelection}
                  onCentre={() => {
                    const bounds = selectionBounds(selectedItems)!
                    moveSelection(
                      selectedItems,
                      wall.width / 2 - bounds.left - bounds.width / 2,
                      0,
                    )
                  }}
                  onDuplicate={duplicateSelection}
                  onRemove={() => removeSelection()}
                  onClear={() => setSelectedIds([])}
                />
              )}
              {tab === "add" && selected && selectedProduct && (
                <section
                  className="wall-selected"
                  aria-label="Posteri i zgjedhur"
                >
                  <div className="wall-selected-head">
                    <div>
                      <small>
                        {selected.photo
                          ? "Foto jote"
                          : (selectedProduct.series ?? "Poster")}
                      </small>
                      <strong>
                        {selected.photo?.name ?? selectedProduct.name}
                      </strong>
                    </div>
                    <button
                      type="button"
                      aria-label="Mbyll zgjedhjen"
                      onClick={() => setSelectedIds([])}
                    >
                      <X />
                    </button>
                  </div>
                  <SizeFinishPicker
                    compact
                    product={{
                      ...selectedProduct,
                      variants: wallVariants(selectedProduct),
                    }}
                    value={selected.variant}
                    landscape={selected.photo?.landscape}
                    onChange={(variant) =>
                      changeItem(selected.uid, {
                        variant,
                        ...(selected.photo
                          ? {
                              photo: refitPhoto(
                                selected.photo,
                                selected.variant,
                                variant,
                                selected.photo.landscape,
                              ),
                            }
                          : {}),
                      })
                    }
                  />
                  <div className="wall-position-fields">
                    <label>
                      Qendra nga e majta
                      <div>
                        <input
                          type="number"
                          min={0}
                          max={wall.width}
                          step="1"
                          aria-label="Pozicioni horizontal"
                          value={Math.round(selected.x)}
                          onChange={(event) => {
                            if (
                              event.target.value !== "" &&
                              Number.isFinite(event.target.valueAsNumber)
                            )
                              changeItem(selected.uid, {
                                x: event.target.valueAsNumber,
                              })
                          }}
                        />
                        <span>cm</span>
                      </div>
                    </label>
                    <label>
                      Qendra nga dyshemeja
                      <div>
                        <input
                          type="number"
                          min={0}
                          max={wall.height}
                          step="1"
                          aria-label="Pozicioni nga dyshemeja"
                          value={Math.round(wall.height - selected.y)}
                          onChange={(event) => {
                            if (
                              event.target.value !== "" &&
                              Number.isFinite(event.target.valueAsNumber)
                            )
                              changeItem(selected.uid, {
                                y: wall.height - event.target.valueAsNumber,
                              })
                          }}
                        />
                        <span>cm</span>
                      </div>
                    </label>
                  </div>
                  <div className="wall-selected-actions">
                    <button
                      type="button"
                      onClick={() =>
                        changeItem(selected.uid, { x: wall.width / 2 })
                      }
                    >
                      <AlignCenterHorizontal /> Qendroje
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateItem(selected)}
                    >
                      <Copy /> Dupliko
                    </button>
                    {selected.photo && (
                      <button
                        type="button"
                        onClick={() =>
                          changeItem(selected.uid, {
                            photo: refitPhoto(
                              selected.photo!,
                              selected.variant,
                              selected.variant,
                              !selected.photo!.landscape,
                            ),
                          })
                        }
                      >
                        <RectangleHorizontal /> Rrotullo
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(selected.uid)}
                    >
                      <Trash2 /> Hiqe
                    </button>
                    {!selected.photo && (
                      <a href={shopHref(`/shop/${selectedProduct.id}`)}>
                        Produkti <ArrowUpRight />
                      </a>
                    )}
                  </div>
                </section>
              )}

              {tab === "add" && (
                <section
                  className="wall-picker"
                  role="tabpanel"
                  id="wall-panel-add"
                  aria-labelledby="wall-tab-add"
                >
                  {!wall.items.length && (
                    <div className="wall-starter-note">
                      <button
                        className="cube-text-link"
                        type="button"
                        onClick={loadExample}
                      >
                        Provo një galeri shembull <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className="wall-upload"
                    disabled={uploading?.status === "uploading"}
                    onClick={() => photoInput.current?.click()}
                  >
                    <ImageUp />
                    <span>
                      <strong>
                        {uploading?.status === "uploading"
                          ? `Po ngarkohet… ${uploading.progress}%`
                          : "Ngarko foton tënde"}
                      </strong>
                      {uploadsOn === false && (
                        <small>Ngarkimi online joaktiv.</small>
                      )}
                    </span>
                  </button>
                  <input
                    ref={photoInput}
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Ngarko foton tënde"
                    onChange={(event) => {
                      void addPhoto(event.target.files?.[0])
                      event.target.value = ""
                    }}
                  />
                  {cartReady > 0 && !cartLink.length && (
                    <button
                      type="button"
                      className="wall-from-cart"
                      onClick={loadCart}
                    >
                      <ShoppingBag />
                      <span>
                        <strong>Shiko shportën në mur</strong>
                        <small>{cartReady} postera nga shporta</small>
                      </span>
                      <ArrowRight />
                    </button>
                  )}
                  {wall.items.length > 0 && !selectedItems.length && (
                    <label className="wall-finish-all">
                      Materiali për krejt murin
                      <select
                        value=""
                        onChange={(event) => applyFinish(event.target.value)}
                      >
                        <option value="" disabled>
                          Zgjidh…
                        </option>
                        {printFinishes.map((finish) => (
                          <option key={finish.id} value={finish.id}>
                            {finish.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="wall-find">
                    <label className="wall-search">
                      <Search />
                      <input
                        type="search"
                        value={query}
                        placeholder="Kërko poster…"
                        aria-label="Kërko poster"
                        onChange={(event) => {
                          setQuery(event.target.value)
                          setShown(PICKER_PAGE)
                        }}
                      />
                    </label>
                    <FilterMenu
                      groups={filterGroups}
                      value={filters}
                      onChange={(next) => {
                        setFilters(next)
                        setShown(PICKER_PAGE)
                      }}
                    />
                  </div>
                  <div className="wall-picker-grid">
                    {pickerItems.slice(0, shown).map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addPoster(product)}
                        aria-label={`Shto ${product.name} në mur`}
                      >
                        <img
                          src={posterThumb(product.image, 480)}
                          alt=""
                          loading="lazy"
                          width="1200"
                          height="1350"
                        />
                        <span>{product.name}</span>
                        <small>
                          <Plus /> nga {product.price} €
                        </small>
                      </button>
                    ))}
                  </div>
                  {!pickerItems.length && (
                    <p className="wall-panel-note">S’gjetëm asnjë poster.</p>
                  )}
                  {shown < pickerItems.length && (
                    <button
                      className="wall-more"
                      type="button"
                      onClick={() => setShown(shown + PICKER_PAGE)}
                    >
                      Shfaq më shumë ({pickerItems.length - shown})
                    </button>
                  )}
                </section>
              )}

              {tab === "summary" && (
                <section
                  className="wall-summary"
                  role="tabpanel"
                  id="wall-panel-summary"
                  aria-labelledby="wall-tab-summary"
                >
                  <p className="wall-summary-caption">
                    {wall.width} × {wall.height} cm · {wall.items.length}{" "}
                    postera
                  </p>
                  {summary.lines.length ? (
                    <>
                      <ul>
                        {summary.lines.map((line) => (
                          <li key={line.key}>
                            {line.photo ? (
                              <span
                                className="wall-summary-photo"
                                style={cropStyle(
                                  line.photo.image,
                                  line.photo.crop,
                                )}
                              />
                            ) : (
                              <img
                                src={posterThumb(line.product.image, 480)}
                                alt=""
                                width="1200"
                                height="1350"
                              />
                            )}
                            <div>
                              <strong>
                                {line.photo ? "Foto jote" : line.product.name}
                              </strong>
                              <small>{line.label}</small>
                              <button
                                className="wall-summary-edit"
                                type="button"
                                aria-label={`Ndrysho ${line.product.name}`}
                                onClick={() =>
                                  line.uids.length === 1
                                    ? openSelection(line.uids[0])
                                    : chooseItems(line.uids)
                                }
                              >
                                Ndrysho <ArrowUpRight size={11} />
                              </button>
                            </div>
                            <span>
                              {line.count > 1 && `${line.count} × `}
                              {currency.format(line.price)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="wall-panel-note">Muri është bosh.</p>
                  )}
                </section>
              )}
            </div>
            <div className="wall-panel-footer">
              <div className="wall-footer-total">
                <span>{wall.items.length} postera në mur</span>
                <strong>{currency.format(summary.total)}</strong>
              </div>
              <div className="wall-step-actions">
                {tab !== "wall" && (
                  <button
                    type="button"
                    className="wall-step-back"
                    aria-label="Hapi i mëparshëm"
                    onClick={() => {
                      setTab(tab === "summary" ? "add" : "wall")
                      panelRef.current?.scrollTo({ top: 0 })
                    }}
                  >
                    <ArrowLeft size={17} />
                  </button>
                )}
                {tab === "wall" ? (
                  <button
                    className="cube-button cube-button-dark wall-next"
                    aria-label="Vazhdo te posterat"
                    type="button"
                    disabled={!widthValid || !heightValid}
                    onClick={() => {
                      setTab("add")
                      panelRef.current?.scrollTo({ top: 0 })
                    }}
                  >
                    Posterat <ArrowRight size={17} />
                  </button>
                ) : tab === "add" ? (
                  <button
                    className="cube-button cube-button-dark wall-next"
                    aria-label="Shiko përmbledhjen"
                    type="button"
                    disabled={!summary.lines.length}
                    onClick={() => {
                      setTab("summary")
                      panelRef.current?.scrollTo({ top: 0 })
                    }}
                  >
                    Përmbledhja <ArrowRight size={17} />
                  </button>
                ) : (
                  <button
                    className="cube-button cube-button-dark wall-cart"
                    aria-label={
                      cartLink.length
                        ? "Përditëso shportën me murin"
                        : "Shto krejt në shportë"
                    }
                    type="button"
                    disabled={!summary.lines.length}
                    onClick={addAllToCart}
                  >
                    <ShoppingBag />{" "}
                    {cartLink.length ? "Përditëso shportën" : "Shto në shportë"}
                  </button>
                )}
              </div>
              {tab === "summary" && (
                <p>
                  {cartLink.length
                    ? "Muri zëvendëson posterat që i solle nga shporta."
                    : "Dërgesa dhe çmimi final konfirmohen para prodhimit."}
                </p>
              )}
            </div>
          </aside>
        </div>
        <p className="wall-notice" role="status" aria-live="polite">
          {notice}
        </p>
      </main>
    </StoreShell>
  )
}
