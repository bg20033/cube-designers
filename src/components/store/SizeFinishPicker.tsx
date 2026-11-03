import {
  getFinish,
  getPosterSize,
  parseVariantId,
  printSizes,
  printFinishes,
  variantIdFor,
  type PhotoCrop,
  type Product,
} from "@/data/products"
import { getProductVariant } from "@/data/commerce"
import { SOFA } from "@/components/shop/wall-layout"
import {
  FLOOR_CM,
  SOFA_ASSET,
  SOFA_FLOOR_OFFSET,
  roomSceneSrc,
} from "@/components/shop/wall-scene"
import { PrintSurface, finishedSize } from "./PrintSurface"

// The scene is a 260 cm wide slice of the wall planner's room, with the same
// 210 cm sofa, so the chosen print is seen at its real size.
const SCENE_WIDTH = 260
const rooms = new Map<number, string>()
const roomFor = (wall: number) => {
  if (!rooms.has(wall))
    rooms.set(wall, roomSceneSrc(SCENE_WIDTH, wall, "#f3f1ec", true))
  return rooms.get(wall)!
}

type Quality = (sizeId: string) => "great" | "good" | "ok" | "low"

export function isPrintProduct(product: Product) {
  return (
    !!product.variants?.length &&
    product.variants.every((variant) => parseVariantId(variant.id))
  )
}

// The chosen print hung over a 210 cm sofa at its real size. Works for
// posters (`art`) and customer photos (`photo`, with `landscape`).
export function PrintScene({
  variant,
  art,
  photo,
  landscape = false,
  className = "",
  height = 210,
}: {
  variant: string
  art?: string
  photo?: { src: string; crop: PhotoCrop }
  landscape?: boolean
  className?: string
  // Scene height in cm (floor included), for the box it has to fill.
  height?: number
}) {
  const parsed = parseVariantId(variant)
  const size = getPosterSize(parsed?.size)
  if (!parsed || !size) return null
  const dims = landscape ? ([size.cm[1], size.cm[0]] as const) : size.cm
  const [outerWidth, outerHeight] = finishedSize(dims, parsed.finish)
  return (
    <div
      className={`size-scene ${className}`.trim()}
      style={{ aspectRatio: `${SCENE_WIDTH} / ${height}` }}
      aria-hidden="true"
    >
      <img
        className="size-scene-room"
        src={roomFor(height - FLOOR_CM)}
        alt=""
      />
      <div
        className="size-scene-print"
        style={{
          width: `${(outerWidth / SCENE_WIDTH) * 100}%`,
          height: `${(outerHeight / height) * 100}%`,
          // Hung 12 cm above the sofa back.
          bottom: `${((FLOOR_CM + SOFA.height + 12) / height) * 100}%`,
        }}
      >
        <PrintSurface
          finish={parsed.finish}
          scale={1.6}
          art={art}
          photo={photo}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <svg
        className="size-scene-sofa"
        viewBox={`${SOFA_ASSET.crop.x} ${SOFA_ASSET.crop.y} ${SOFA_ASSET.crop.width} ${SOFA_ASSET.crop.height}`}
        preserveAspectRatio="xMidYMax meet"
        style={{
          width: `${(SOFA.width / SCENE_WIDTH) * 100}%`,
          height: `${(SOFA.height / height) * 100}%`,
          bottom: `${((FLOOR_CM - SOFA_FLOOR_OFFSET) / height) * 100}%`,
        }}
      >
        <image
          href={SOFA_ASSET.src}
          width={SOFA_ASSET.width}
          height={SOFA_ASSET.height}
        />
      </svg>
      <span className="size-scene-label">
        {String(dims[0]).replace(".", ",")} ×{" "}
        {String(dims[1]).replace(".", ",")} cm · divani 210 cm
      </span>
    </div>
  )
}

// Size and finish choices. The product page gets chips with the price of
// each choice and the frames grouped under one option; the wall planner and
// photo page use the compact cards.
export function SizeFinishPicker({
  product,
  value,
  onChange,
  landscape = false,
  quality,
  compact = false,
  hideSizes = false,
}: {
  product: Product
  value?: string
  onChange: (variantId: string) => void
  landscape?: boolean
  quality?: Quality
  compact?: boolean
  hideSizes?: boolean
}) {
  const variants = product.variants ?? []
  const current =
    parseVariantId(value ?? product.defaultVariantId) ??
    parseVariantId(variants[0]?.id)!
  const has = (size: string, finish: string) =>
    getProductVariant(product, variantIdFor(size, finish))
  const sizes = printSizes.filter((size) =>
    printFinishes.some((finish) => has(size.id, finish.id)),
  )
  const pickSize = (size: string) =>
    onChange(
      variantIdFor(size, has(size, current.finish) ? current.finish : "leter"),
    )
  const pickFinish = (finish: string) => {
    if (has(current.size, finish))
      return onChange(variantIdFor(current.size, finish))
    // A finish not made in this size moves to its nearest size.
    const fallback =
      sizes.find(
        (size) =>
          has(size.id, finish) &&
          size.cm[0] >= getPosterSize(current.size)!.cm[0],
      ) ?? [...sizes].reverse().find((size) => has(size.id, finish))
    if (fallback) onChange(variantIdFor(fallback.id, finish))
  }
  const size = getPosterSize(current.size)!
  const finish = getFinish(current.finish)!
  const largest = Math.max(...sizes.map((item) => item.cm[1]))
  const priceOf = (sizeId: string, finishId: string) =>
    has(sizeId, finishId)?.price ?? product.price
  const shortName = (label: string) =>
    label.includes(" · ") ? label.split(" · ")[0] : label.replace(" cm", "")

  if (!compact) {
    const frames = printFinishes.filter(
      (option) => option.frame && sizes.some((item) => has(item.id, option.id)),
    )
    const framed = !!finish.frame
    const plain = printFinishes.filter(
      (option) =>
        !option.frame && sizes.some((item) => has(item.id, option.id)),
    )
    const frameChoice = framed ? finish.id : frames[0]?.id
    const optionPrice = (finishId: string) =>
      has(current.size, finishId)
        ? `${priceOf(current.size, finishId)} €`
        : `nga ${shortName(sizes.find((item) => has(item.id, finishId))!.label)}`
    return (
      <div className="size-picker is-chips">
        {!hideSizes && (
          <fieldset className="size-picker-group">
            <legend>
              Madhësia <span>{size.label.split(" · ").pop()}</span>
            </legend>
            <div className="option-chips">
              {sizes.map((item) => {
                const level = quality?.(item.id)
                const price = priceOf(
                  item.id,
                  has(item.id, current.finish) ? current.finish : "leter",
                )
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={item.id === current.size}
                    aria-label={`Madhësia ${item.label}, ${price} €${level === "low" ? ", cilësi e dobët" : ""}`}
                    className={level ? `quality-${level}` : undefined}
                    onClick={() => pickSize(item.id)}
                  >
                    <strong>{shortName(item.label)}</strong>
                    <small>
                      {price} €
                      {item.minQuantity ? ` · min. ${item.minQuantity}` : ""}
                    </small>
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}
        <fieldset className="size-picker-group">
          <legend>
            Materiali <span>{finish.label}</span>
          </legend>
          <div className="finish-options">
            {plain.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === finish.id}
                aria-label={`${option.label}, ${optionPrice(option.id)}`}
                className={has(current.size, option.id) ? "" : "is-elsewhere"}
                onClick={() => pickFinish(option.id)}
              >
                <span className={`finish-swatch swatch-${option.id}`} />
                <strong>{option.label}</strong>
                <small>{optionPrice(option.id)}</small>
              </button>
            ))}
            {frameChoice && (
              <div
                className={`finish-frame${framed ? " is-active" : ""}`}
                role="group"
                aria-label="Kornizë"
              >
                <button
                  type="button"
                  className="finish-frame-main"
                  aria-pressed={framed}
                  aria-label={`Kornizë, ${optionPrice(frameChoice)}`}
                  onClick={() => pickFinish(frameChoice)}
                >
                  <span
                    className={`finish-swatch swatch-${getFinish(frameChoice)!.frame}`}
                  />
                  <strong>Kornizë</strong>
                  <small>{optionPrice(frameChoice)}</small>
                </button>
                <span className="finish-frame-colours">
                  {frames.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      title={option.label}
                      aria-label={option.label}
                      aria-pressed={option.id === finish.id}
                      className={`frame-dot frame-dot-${option.frame}`}
                      onClick={() => pickFinish(option.id)}
                    />
                  ))}
                </span>
              </div>
            )}
          </div>
          <p className="finish-note">{finish.description}</p>
        </fieldset>
      </div>
    )
  }

  return (
    <div className="size-picker is-compact">
      {!hideSizes && (
        <fieldset className="size-picker-group">
          <legend>
            Madhësia <span>{size.label}</span>
          </legend>
          <div className="size-cards">
            {sizes.map((item) => {
              const from = Math.min(
                ...printFinishes.flatMap((option) =>
                  has(item.id, option.id) ? [option.prices[item.id]] : [],
                ),
              )
              const level = quality?.(item.id)
              const [w, h] = landscape ? [item.cm[1], item.cm[0]] : item.cm
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === current.size}
                  aria-label={`Madhësia ${item.label}, nga ${from} €${level === "low" ? ", cilësi e dobët" : ""}`}
                  className={level ? `quality-${level}` : undefined}
                  onClick={() => pickSize(item.id)}
                >
                  <span className="size-card-shape">
                    <span
                      style={{
                        width: `${(w / largest) * 100}%`,
                        height: `${(h / largest) * 100}%`,
                      }}
                    />
                  </span>
                  <strong>
                    {item.label.includes(" · ")
                      ? item.label.split(" · ")[0]
                      : item.label.replace(" cm", "")}
                  </strong>
                  <small>{item.label.split(" · ").pop()}</small>
                  <em>nga {from} €</em>
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      <fieldset className="size-picker-group">
        <legend>
          Materiali <span>{finish.label}</span>
        </legend>
        <div className="finish-cards">
          {printFinishes.map((option) => {
            const available = has(current.size, option.id)
            const smallest = sizes.find((item) => has(item.id, option.id))
            if (!smallest) return null
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === finish.id}
                className={available ? undefined : "is-elsewhere"}
                onClick={() => pickFinish(option.id)}
              >
                <span
                  className={`finish-swatch swatch-${option.frame ?? option.id}`}
                />
                <strong>{option.label}</strong>
                <small>
                  {available
                    ? `${getProductVariant(product, variantIdFor(current.size, option.id))?.price ?? product.price} €`
                    : `nga ${smallest.label.split(" · ")[0]}`}
                </small>
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
