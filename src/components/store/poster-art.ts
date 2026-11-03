import { useEffect, useState } from "react"

// Shop images are framed mockups on a grey card. Previews need the poster
// itself: the dark frame is found and everything inside it is kept.
const artCache = new Map<string, Promise<string>>()
export function loadArt(src: string) {
  let pending = artCache.get(src)
  if (!pending) {
    pending = new Promise<string>((resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        const width = 1200
        const height = 1350
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext("2d", { willReadFrequently: true })
        if (!context) return resolve(src)
        context.drawImage(image, 0, 0, width, height)
        const { data } = context.getImageData(0, 0, width, height)
        const dark = (x: number, y: number) => {
          const i = (y * width + x) * 4
          return data[i] < 70 && data[i + 1] < 70 && data[i + 2] < 70
        }
        let top = height
        let left = width
        let right = 0
        let bottom = 0
        for (let y = 0; y < height; y += 2)
          for (let x = 0; x < width; x += 2)
            if (dark(x, y)) {
              top = Math.min(top, y)
              bottom = Math.max(bottom, y)
              left = Math.min(left, x)
              right = Math.max(right, x)
            }
        if (right <= left || bottom <= top) return resolve(src)
        const middle = Math.round((top + bottom) / 2)
        let edge = left
        while (edge < right && dark(edge, middle)) edge++
        const inset = edge - left + 1
        const crop = document.createElement("canvas")
        crop.width = right - left - inset * 2
        crop.height = bottom - top - inset * 2
        crop
          .getContext("2d")!
          .drawImage(
            canvas,
            left + inset,
            top + inset,
            crop.width,
            crop.height,
            0,
            0,
            crop.width,
            crop.height,
          )
        resolve(crop.toDataURL("image/jpeg", 0.9))
      }
      image.onerror = reject
      image.src = src
    })
    artCache.set(src, pending)
  }
  return pending
}

export function useArt(src?: string) {
  const [art, setArt] = useState<{ src: string; url: string }>()
  useEffect(() => {
    if (!src) return
    let active = true
    loadArt(src)
      .then((url) => active && setArt({ src, url }))
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [src])
  return art && art.src === src ? art.url : undefined
}
