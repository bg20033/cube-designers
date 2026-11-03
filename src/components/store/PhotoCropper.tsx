import { useRef, type CSSProperties, type PointerEvent } from "react"
import { Minus, Plus } from "lucide-react"
import type { PhotoCrop } from "@/data/products"
import { cropStyle } from "./PrintSurface"

export type CropView = { zoom: number; cx: number; cy: number }

// Shows the part of a photo that will be printed in a frame of the print's
// shape. Drag to move the photo; zoom with the slider or the − / + buttons.
export function PhotoCropper({
  src,
  aspect,
  crop,
  view,
  onView,
}: {
  src: string
  // Print width / height.
  aspect: number
  crop: PhotoCrop
  view: CropView
  onView: (view: CropView) => void
}) {
  const frame = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(
    null,
  )
  const clampCentre = (value: number, size: number) =>
    Math.min(Math.max(value, size / 2), 1 - size / 2)

  function start(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      cx: crop.x + crop.w / 2,
      cy: crop.y + crop.h / 2,
    }
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current
    const box = frame.current?.getBoundingClientRect()
    if (!active || !box) return
    onView({
      ...view,
      cx: clampCentre(
        active.cx - ((event.clientX - active.x) / box.width) * crop.w,
        crop.w,
      ),
      cy: clampCentre(
        active.cy - ((event.clientY - active.y) / box.height) * crop.h,
        crop.h,
      ),
    })
  }
  function zoomTo(zoom: number) {
    onView({ ...view, zoom: Math.min(4, Math.max(1, zoom)) })
  }

  return (
    <div className="photo-cropper">
      <div className="photo-cropper-stage">
        <div
          ref={frame}
          className="photo-cropper-frame"
          style={
            {
              aspectRatio: String(aspect),
              "--frame-aspect": aspect,
              ...cropStyle(src, crop),
            } as CSSProperties
          }
          role="group"
          tabIndex={0}
          aria-label="Pjesa e fotos që printohet. Tërhiqe ose përdor shigjetat për ta lëvizur."
          onKeyDown={(event) => {
            if (
              !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                event.key,
              )
            )
              return
            event.preventDefault()
            const distance = event.shiftKey ? 0.1 : 0.02
            onView({
              ...view,
              cx: clampCentre(
                crop.x +
                  crop.w / 2 +
                  (event.key === "ArrowLeft"
                    ? -distance
                    : event.key === "ArrowRight"
                      ? distance
                      : 0),
                crop.w,
              ),
              cy: clampCentre(
                crop.y +
                  crop.h / 2 +
                  (event.key === "ArrowUp"
                    ? -distance
                    : event.key === "ArrowDown"
                      ? distance
                      : 0),
                crop.h,
              ),
            })
          }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          <span className="photo-cropper-thirds" aria-hidden="true" />
        </div>
      </div>
      <div className="photo-cropper-zoom">
        <button
          type="button"
          aria-label="Zvogëlo"
          disabled={view.zoom <= 1}
          onClick={() => zoomTo(view.zoom / 1.15)}
        >
          <Minus />
        </button>
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={view.zoom}
          aria-label="Zmadhimi i fotos"
          onChange={(event) => zoomTo(Number(event.target.value))}
        />
        <button
          type="button"
          aria-label="Zmadho"
          disabled={view.zoom >= 4}
          onClick={() => zoomTo(view.zoom * 1.15)}
        >
          <Plus />
        </button>
        <output aria-label="Zmadhimi">{Math.round(view.zoom * 100)}%</output>
      </div>
    </div>
  )
}
