import type { ImgHTMLAttributes } from "react"

import manifest from "@/data/portfolio-media.json"

export type PortfolioImageVariant = {
  src: string
  width: number
  height: number
}

export type PortfolioImage = {
  key: string
  source: string
  group: string
  alt: string
  focal: string
  width: number
  height: number
  variants: PortfolioImageVariant[]
}

const portfolioImages = manifest as PortfolioImage[]
const portfolioImageMap = new Map(
  portfolioImages.map((image) => [image.key, image]),
)

export function getPortfolioImage(key: string) {
  const image = portfolioImageMap.get(key)
  if (!image) throw new Error(`Unknown portfolio image: ${key}`)
  return image
}

type ResponsiveImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "height" | "src" | "srcSet" | "width"
> & {
  image: PortfolioImage | string
  alt?: string
  sizes?: string
}

export function ResponsiveImage({
  image: imageOrKey,
  alt,
  sizes = "100vw",
  className,
  loading = "lazy",
  decoding = "async",
  style,
  ...props
}: ResponsiveImageProps) {
  // Dashboard-managed products may point at a plain image URL instead of a
  // key from the portfolio manifest.
  if (typeof imageOrKey === "string" && !portfolioImageMap.has(imageOrKey)) {
    if (!/^(https?:\/\/|\/)/.test(imageOrKey)) return null
    return (
      <img
        {...props}
        alt={alt ?? ""}
        className={className}
        decoding={decoding}
        loading={loading}
        sizes={sizes}
        src={imageOrKey}
        style={{ objectFit: "cover", ...style }}
      />
    )
  }

  const image =
    typeof imageOrKey === "string"
      ? getPortfolioImage(imageOrKey)
      : imageOrKey
  const largest = image.variants.at(-1)

  if (!largest) return null

  return (
    <img
      {...props}
      alt={alt ?? image.alt}
      className={className}
      decoding={decoding}
      height={largest.height}
      loading={loading}
      sizes={sizes}
      src={largest.src}
      srcSet={image.variants
        .map((variant) => `${variant.src} ${variant.width}w`)
        .join(", ")}
      style={{ objectPosition: image.focal, ...style }}
      width={largest.width}
    />
  )
}

export { portfolioImages }
