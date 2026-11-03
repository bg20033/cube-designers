import type { CSSProperties, HTMLAttributes, ReactNode } from "react"
import { getFinish, type PhotoCrop } from "@/data/products"

// Frame depth used everywhere a framed print is drawn, in cm.
export const FRAME_CM = 2

const frameFill = {
  black: "#1d1d1f",
  white: "#f7f7f5",
  oak: "linear-gradient(135deg, #c49a6c, #a77c50 55%, #c9a273)",
}

// Outer size in cm of a print of `size` cm in `finish`, frame included.
export function finishedSize(
  [width, height]: readonly [number, number],
  finish: string,
) {
  const border = getFinish(finish)?.frame ? FRAME_CM * 2 : 0
  return [width + border, height + border] as const
}

// Background placement that shows `crop` of an image filling its box.
export function cropStyle(src: string, crop: PhotoCrop): CSSProperties {
  const position = (start: number, size: number) =>
    size >= 1 ? "0%" : `${(start / (1 - size)) * 100}%`
  return {
    backgroundImage: `url("${src}")`,
    backgroundSize: `${100 / crop.w}% ${100 / crop.h}%`,
    backgroundPosition: `${position(crop.x, crop.w)} ${position(crop.y, crop.h)}`,
    backgroundRepeat: "no-repeat",
  }
}

// One print as it looks on a wall: paper with the artwork contained, edge to
// edge on acrylic or canvas, or inside a frame. Posters pass `art`; photos
// pass `photo` with the crop to fill the print.
export function PrintSurface({
  finish,
  scale,
  art,
  photo,
  className = "",
  style,
  children,
  ...rest
}: {
  finish: string
  // px per cm, for the frame depth.
  scale: number
  art?: string
  photo?: { src: string; crop: PhotoCrop }
  className?: string
  style?: CSSProperties
  children?: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, "style" | "className">) {
  const frame = getFinish(finish)?.frame
  const kind = frame ? "frame" : finish
  return (
    <div
      className={`print-surface is-${kind}${frame ? ` frame-${frame}` : ""} ${className}`.trim()}
      style={{
        ...style,
        ...(frame
          ? { padding: FRAME_CM * scale, background: frameFill[frame] }
          : {}),
      }}
      {...rest}
    >
      <div className="print-surface-face">
        {photo ? (
          <div
            className="print-surface-photo"
            style={cropStyle(photo.src, photo.crop)}
          />
        ) : art ? (
          <img src={art} alt="" draggable={false} />
        ) : (
          <span className="print-surface-loading" />
        )}
      </div>
      {children}
    </div>
  )
}
