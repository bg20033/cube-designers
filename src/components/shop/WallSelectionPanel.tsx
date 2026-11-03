import { AlignCenterHorizontal, Copy, Trash2, X } from "lucide-react"
import {
  parseVariantId,
  printSizes,
  printFinishes,
  variantIdFor,
  type Product,
} from "@/data/products"
import { getProductVariant } from "@/data/commerce"
import { wallVariants, type WallItem } from "./wall-layout"

export function WallSelectionPanel({
  items,
  catalog,
  canDuplicate,
  onVariant,
  onCentre,
  onDuplicate,
  onRemove,
  onClear,
}: {
  items: WallItem[]
  catalog: Map<string, Product>
  canDuplicate: boolean
  onVariant: (change: { size?: string; finish?: string }) => void
  onCentre: () => void
  onDuplicate: () => void
  onRemove: () => void
  onClear: () => void
}) {
  const options = items.map((item) =>
    wallVariants(catalog.get(item.productId)!),
  )
  const parsed = items.map((item) => parseVariantId(item.variant)!)
  return (
    <section
      className="wall-selected wall-group-selected"
      aria-label="Posterat e zgjedhur"
    >
      <div className="wall-selected-head">
        <div>
          <strong>{items.length} postera të zgjedhur</strong>
        </div>
        <button type="button" aria-label="Mbyll zgjedhjen" onClick={onClear}>
          <X />
        </button>
      </div>
      <fieldset className="wall-group-options">
        <legend>Madhësia</legend>
        <div className="wall-chips">
          {printSizes
            .filter(
              (size) =>
                size.id !== "a6" &&
                options.every((variants) =>
                  variants.some(
                    (variant) => parseVariantId(variant.id)?.size === size.id,
                  ),
                ),
            )
            .map((size) => (
              <button
                key={size.id}
                type="button"
                aria-label={`Madhësia ${size.label} për të zgjedhurit`}
                aria-pressed={parsed.every((item) => item.size === size.id)}
                onClick={() => onVariant({ size: size.id })}
              >
                {size.label.split(" · ")[0]}
              </button>
            ))}
        </div>
      </fieldset>
      <fieldset className="wall-group-options">
        <legend>Materiali</legend>
        <div className="wall-chips">
          {printFinishes.map((finish) => (
            <button
              key={finish.id}
              type="button"
              aria-pressed={parsed.every((item) => item.finish === finish.id)}
              disabled={
                !items.every((item, index) =>
                  getProductVariant(
                    catalog.get(item.productId)!,
                    variantIdFor(parsed[index].size, finish.id),
                  ),
                )
              }
              onClick={() => onVariant({ finish: finish.id })}
            >
              {finish.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="wall-selected-actions">
        <button type="button" onClick={onCentre}>
          <AlignCenterHorizontal /> Qendro grupin
        </button>
        <button type="button" disabled={!canDuplicate} onClick={onDuplicate}>
          <Copy /> Dupliko grupin
        </button>
        <button type="button" onClick={onRemove}>
          <Trash2 /> Hiqi të zgjedhurit
        </button>
      </div>
    </section>
  )
}
