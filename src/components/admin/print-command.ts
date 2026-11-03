import { parseVariantId } from "@/data/products"
import type { Order } from "@/components/admin/types"

// The terminal command that builds the print files for an order's posters,
// bundles and customer photos (scripts/print-files.mjs). Photos travel as
// 'foto@<variant>@<crop>@<p|l>@<original url>'.
export function printCommand(order: Order) {
  const items = order.items.flatMap((line) => {
    // Gallery sets list every poster with its own size.
    if (line.includes?.some((poster) => poster.variantId))
      return line.includes.flatMap((poster) =>
        poster.variantId ? [`${poster.productId}:${poster.variantId}`] : [],
      )
    if (!line.variantId || !parseVariantId(line.variantId)) return []
    if (!line.photo) return [`${line.productId}:${line.variantId}`]
    const { crop, landscape, original } = line.photo
    const box = [crop.x, crop.y, crop.w, crop.h]
      .map((value) => value.toFixed(5))
      .join(",")
    return [
      `'foto@${line.variantId}@${box}@${landscape ? "l" : "p"}@${original}'`,
    ]
  })
  return items.length
    ? `npm run print -- ${items.join(" ")} --out ${order.reference}`
    : ""
}
