import { CUSTOM_PRINT_LIMITS, customSizeId } from "@/data/products"

// Use the photo's ratio with a familiar long edge, extending it only when
// needed to keep the shorter edge within the supported production limits.
export function sizeForPhoto(
  aspect: number,
  longest = 40,
): [number, number] | undefined {
  if (!Number.isFinite(aspect) || aspect <= 0) return undefined
  const ratio = Math.max(aspect, 1 / aspect)
  const minLong = CUSTOM_PRINT_LIMITS.min * ratio
  const maxLong = Math.min(
    CUSTOM_PRINT_LIMITS.max,
    CUSTOM_PRINT_LIMITS.maxShortSide * ratio,
  )
  if (minLong > maxLong) return undefined
  const long = Math.max(minLong, Math.min(longest, maxLong))
  const dims: [number, number] =
    aspect >= 1 ? [long, long / aspect] : [long / ratio, long]
  const rounded = dims.map((value) => Math.round(value * 10) / 10) as [
    number,
    number,
  ]
  return customSizeId(...rounded) ? rounded : undefined
}
