import { useCallback, useEffect, useRef, useState } from "react"
import {
  uploadPhoto,
  uploadsEnabled,
  type UploadedPhoto,
} from "@/lib/photo-upload"

export type PhotoDraft = {
  localSrc: string
  width: number
  height: number
  name: string
  status: "reading" | "uploading" | "done" | "local" | "error"
  progress: number
  uploaded?: UploadedPhoto
  error?: string
}

// A request token stops old file reads/uploads from replacing a newer choice.
// Object URLs stay alive for precisely the lifetime of the selected preview.
export function usePhotoUpload() {
  const [enabled, setEnabled] = useState<boolean>()
  const [draft, setDraft] = useState<PhotoDraft>()
  const request = useRef(0)
  const generation = useRef(0)
  const source = useRef<string | undefined>(undefined)

  const release = useCallback(() => {
    request.current++
    generation.current++
    if (source.current) URL.revokeObjectURL(source.current)
    source.current = undefined
  }, [])

  useEffect(() => {
    let active = true
    const initialGeneration = generation.current
    void uploadsEnabled().then((value) => {
      if (active && generation.current === initialGeneration) setEnabled(value)
    })
    return () => {
      active = false
      release()
    }
  }, [release])

  const select = useCallback(
    async (file: File, { waitForUpload = true } = {}) => {
      const token = ++request.current
      if (!/^image\/(jpeg|png|webp)$/.test(file.type))
        throw new Error("Lejohen vetëm foto JPG, PNG ose WebP.")
      if (file.size > 40 * 1024 * 1024)
        throw new Error(
          "Fotoja është më e madhe se 40 MB. Zgjidh një foto më të vogël.",
        )
      let bitmap: ImageBitmap
      try {
        bitmap = await createImageBitmap(file, {
          imageOrientation: "from-image",
        })
      } catch {
        throw new Error(
          "Kjo foto nuk mund të lexohet. Provo JPG, PNG ose WebP.",
        )
      }
      const { width, height } = bitmap
      bitmap.close()
      if (token !== request.current) return undefined
      if (Math.min(width, height) < 400)
        throw new Error(
          "Fotoja është shumë e vogël për print. Zgjidh një foto me të paktën 400 px në çdo anë.",
        )
      const uploadToken = ++generation.current
      const localSrc = URL.createObjectURL(file)
      if (source.current) URL.revokeObjectURL(source.current)
      source.current = localSrc
      const next: PhotoDraft = {
        localSrc,
        width,
        height,
        name: file.name,
        status: "reading",
        progress: 0,
      }
      setDraft(next)

      // The photo editor opts into an immediate result for cropping. The wall
      // planner keeps awaiting the completed upload before placing a print.
      const completion = (async () => {
        const canUpload = await uploadsEnabled()
        if (uploadToken !== generation.current) return
        setEnabled(canUpload)
        setDraft({ ...next, status: canUpload ? "uploading" : "local" })
        if (!canUpload) return { ...next, status: "local" as const }
        try {
          const uploaded = await uploadPhoto(file, (progress) => {
            if (uploadToken === generation.current)
              setDraft((current) =>
                current ? { ...current, progress } : current,
              )
          })
          if (uploadToken !== generation.current) return
          const done: PhotoDraft = {
            ...next,
            uploaded,
            status: "done",
            progress: 100,
          }
          setDraft(done)
          return done
        } catch (error) {
          if (uploadToken === generation.current)
            setDraft({
              ...next,
              status: "error",
              error:
                error instanceof Error ? error.message : "Ngarkimi dështoi.",
              progress: 0,
            })
        }
      })()
      return waitForUpload ? completion : next
    },
    [],
  )

  const reset = useCallback(() => {
    release()
    setDraft(undefined)
  }, [release])
  return { enabled, draft, select, reset }
}
