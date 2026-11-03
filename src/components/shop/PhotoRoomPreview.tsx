import { useEffect, useRef, useState, type CSSProperties } from "react"
import { Maximize2 } from "lucide-react"
import type { PhotoCrop } from "@/data/products"
import { finishedSize, PrintSurface } from "@/components/store/PrintSurface"
import { cropFor } from "@/lib/photo-upload"
import {
  EXAMPLE_PHOTO,
  PHOTO_ROOM,
  photoRoomGeometry,
} from "./photo-room-scene"

export function PhotoRoomPreview({
  dims,
  finish,
  photo,
  detail = false,
}: {
  dims: readonly [number, number]
  finish: string
  photo?: { src: string; crop: PhotoCrop }
  detail?: boolean
}) {
  const container = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ width: 600, height: 650 })
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setBox({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    )
    if (container.current) observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  const [width, height] = finishedSize(dims, finish)
  const room = photoRoomGeometry(box.width, box.height)
  const horizontalPadding = box.height < 450 ? 88 : 170
  const verticalPadding = box.height < 450 ? 142 : 250
  const scale = Math.max(
    0.1,
    detail
      ? Math.min(
          (box.width - horizontalPadding) / width,
          (box.height - verticalPadding) / height,
        )
      : room.cmScale,
  )
  const displayedPhoto = photo ?? {
    src: EXAMPLE_PHOTO.src,
    crop: cropFor(EXAMPLE_PHOTO, dims[0] / dims[1], 1, 0.5, 0.5),
  }
  const surface = (
    <PrintSurface
      finish={finish}
      scale={scale}
      photo={displayedPhoto}
      className="photo-room-print"
      style={
        {
          width: width * scale,
          height: height * scale,
          "--scene-scale": scale,
        } as CSSProperties
      }
    />
  )
  const background = PHOTO_ROOM.day
  return (
    <div
      ref={container}
      className={`photo-room-preview${detail ? " is-detail" : ""}`}
      style={{ "--room-photo": `url("${background}")` } as CSSProperties}
      role="img"
      aria-label={`${detail ? "Detaji i printit" : "Printi në ambient me divan 210 cm"}, ${dims[0]} me ${dims[1]} centimetra${photo ? "" : ", foto shembull"}`}
    >
      {detail ? (
        <div className="photo-detail-object">
          {surface}
          <span className="photo-detail-size">
            <Maximize2 />
            {width} × {height} cm
            {finish.startsWith("kornize") && " · me kornizë"}
          </span>
        </div>
      ) : (
        <>
          <div className="photo-room-backdrop" aria-hidden="true" />
          <div
            className="photo-room-stage"
            style={{
              width: room.side,
              height: room.side,
              left: room.left,
              top: room.top,
            }}
          >
            <img
              className="photo-room-image"
              src={background}
              width={PHOTO_ROOM.pixels}
              height={PHOTO_ROOM.pixels}
              alt=""
              draggable={false}
              fetchPriority="high"
            />
            <div
              className="photo-room-placement"
              style={{
                left: PHOTO_ROOM.printCentre.x * room.imageScale,
                top: PHOTO_ROOM.printCentre.y * room.imageScale,
              }}
            >
              {surface}
            </div>
          </div>
        </>
      )}
      {(!photo || !detail) && (
        <div className="photo-scene-note">
          <span>{!photo ? "Foto shembull" : "Divan 210 cm"}</span>
        </div>
      )}
    </div>
  )
}
