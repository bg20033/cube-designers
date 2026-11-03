import { useMemo } from "react"
import "./room.css"
import { SOFA, type Wall } from "./wall-layout"
import {
  FLOOR_CM,
  SOFA_ASSET,
  SOFA_FLOOR_OFFSET,
  roomSceneSrc,
} from "./wall-scene"

export function WallRoom({ wall, scale }: { wall: Wall; scale: number }) {
  const { crop } = SOFA_ASSET
  const background = useMemo(
    () => roomSceneSrc(wall.width, wall.height, wall.color, wall.sofa),
    [wall.width, wall.height, wall.color, wall.sofa],
  )
  return (
    <div className="wall-room" aria-hidden="true">
      <img
        className="wall-room-material"
        src={background}
        width={wall.width * 4}
        height={(wall.height + FLOOR_CM) * 4}
        alt=""
        draggable={false}
      />
      {wall.sofa && (
        <>
          <span
            className="wall-sofa-shadow"
            style={{
              width: (SOFA.width + 12) * scale,
              height: 15 * scale,
              top: (wall.height - 2) * scale,
            }}
          />
          <svg
            className="wall-sofa"
            viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`}
            preserveAspectRatio="xMidYMax meet"
            style={{
              width: SOFA.width * scale,
              height: SOFA.height * scale,
              top: (wall.height - SOFA.height + SOFA_FLOOR_OFFSET) * scale,
            }}
          >
            <image
              href={SOFA_ASSET.src}
              width={SOFA_ASSET.width}
              height={SOFA_ASSET.height}
            />
          </svg>
        </>
      )}
    </div>
  )
}
