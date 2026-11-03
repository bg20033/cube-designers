import { describe, expect, it } from "vitest"
import { PHOTO_ROOM, photoRoomGeometry } from "./photo-room-scene"

describe("photographed room scale", () => {
  it.each([
    [720, 778],
    [390, 313.5],
    [320, 235],
    [512, 576],
  ])(
    "keeps the print and sofa in the same physical ratio at %s × %s",
    (width, height) => {
      const geometry = photoRoomGeometry(width, height)
      const sofaScreenWidth = PHOTO_ROOM.sofaPixels * geometry.imageScale
      expect(sofaScreenWidth / geometry.cmScale).toBeCloseTo(210)
      expect((50 * geometry.cmScale) / sofaScreenWidth).toBeCloseTo(50 / 210)
      // Even the largest framed portrait stays in the available preview.
      const printTop =
        geometry.top +
        PHOTO_ROOM.printCentre.y * geometry.imageScale -
        (74 * geometry.cmScale) / 2
      const printBottom = printTop + 74 * geometry.cmScale
      expect(printTop).toBeGreaterThanOrEqual(0)
      expect(printBottom).toBeLessThan(height)
    },
  )
})
