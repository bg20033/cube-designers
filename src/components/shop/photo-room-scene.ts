// The sofa in the generated photograph spans x=65..1160 of its 1254 px
// image. Calibrating it to 210 cm keeps print sizes honest in every viewport.
export const PHOTO_ROOM = {
  pixels: 1254,
  sofaPixels: 1095,
  sofaCm: 210,
  printCentre: { x: 627, y: 420 },
  focus: { top: 0.18, bottom: 0.94 },
  day: "/media/collections/photo/living-room-day-v1.webp",
}
export const EXAMPLE_PHOTO = {
  src: "/media/collections/photo/alpine-example-v1.webp",
  width: 1536,
  height: 1024,
}

export function photoRoomGeometry(width: number, height: number) {
  const { pixels, sofaPixels, sofaCm, focus } = PHOTO_ROOM
  const top = height < 450 ? 45 : 68
  const bottom = height < 450 ? 33 : 48
  const available = Math.max(30, height - top - bottom)
  const cover = Math.max(width / pixels, height / pixels)
  const fitSubject = available / ((focus.bottom - focus.top) * pixels)
  const imageScale = Math.max(0.01, Math.min(cover, fitSubject))
  const side = pixels * imageScale
  const idealTop = top + available / 2 - ((focus.top + focus.bottom) / 2) * side
  return {
    side,
    left: (width - side) / 2,
    top:
      side >= height
        ? Math.max(height - side, Math.min(0, idealTop))
        : idealTop,
    cmScale: (imageScale * sofaPixels) / sofaCm,
    imageScale,
  }
}
