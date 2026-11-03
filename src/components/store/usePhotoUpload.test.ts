import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { usePhotoUpload } from "./usePhotoUpload"
import {
  uploadPhoto,
  uploadsEnabled,
  type UploadedPhoto,
} from "@/lib/photo-upload"
vi.mock("@/lib/photo-upload", () => ({
  uploadPhoto: vi.fn(),
  uploadsEnabled: vi.fn(),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const bitmap = () =>
  ({ width: 1200, height: 800, close: vi.fn() }) as unknown as ImageBitmap
const file = (name = "photo.jpg") =>
  new File(["photo"], name, { type: "image/jpeg" })
const uploaded: UploadedPhoto = {
  image: "public-working-copy",
  original: "private-original",
  width: 1200,
  height: 800,
  name: "photo.jpg",
}
const createUrl = vi.fn()
const revokeUrl = vi.fn()

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(uploadsEnabled).mockResolvedValue(false)
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockImplementation(async () => bitmap()),
  )
  let count = 0
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = createUrl.mockImplementation(
        () => `blob:photo-${++count}`,
      )
      static revokeObjectURL = revokeUrl
    },
  )
})
afterEach(() => vi.unstubAllGlobals())

describe("photo preview lifecycle", () => {
  it("shows the photo while the availability check is still pending", async () => {
    const availability = deferred<boolean>()
    vi.mocked(uploadsEnabled).mockReturnValue(availability.promise)
    const { result } = renderHook(() => usePhotoUpload())
    await act(async () => {
      await result.current.select(file(), { waitForUpload: false })
    })
    expect(result.current.draft).toMatchObject({
      localSrc: "blob:photo-1",
      status: "reading",
      width: 1200,
    })
    await act(async () => availability.resolve(false))
    expect(result.current.draft?.status).toBe("local")
    expect(uploadPhoto).not.toHaveBeenCalled()
  })
  it("keeps the last selected file when image decoding finishes out of order", async () => {
    const first = deferred<ImageBitmap>()
    vi.mocked(createImageBitmap).mockReturnValueOnce(first.promise)
    const { result } = renderHook(() => usePhotoUpload())
    let old!: ReturnType<typeof result.current.select>
    act(() => {
      old = result.current.select(file("old.jpg"))
    })
    await act(async () => {
      await result.current.select(file("new.jpg"))
    })
    await act(async () => {
      first.resolve(bitmap())
      await old
    })
    expect(result.current.draft?.name).toBe("new.jpg")
    expect(createUrl).toHaveBeenCalledTimes(1)
  })
  it("does not restore a reset photo when its upload completes", async () => {
    vi.mocked(uploadsEnabled).mockResolvedValue(true)
    const pending = deferred<UploadedPhoto>()
    vi.mocked(uploadPhoto).mockReturnValue(pending.promise)
    const { result } = renderHook(() => usePhotoUpload())
    await act(async () => {
      await result.current.select(file(), { waitForUpload: false })
    })
    await waitFor(() => expect(uploadPhoto).toHaveBeenCalledOnce())
    act(() => result.current.reset())
    await act(async () => pending.resolve(uploaded))
    expect(result.current.draft).toBeUndefined()
    expect(revokeUrl).toHaveBeenCalledWith("blob:photo-1")
  })
  it("preserves a valid upload when an invalid replacement is rejected", async () => {
    vi.mocked(uploadsEnabled).mockResolvedValue(true)
    const pending = deferred<UploadedPhoto>()
    vi.mocked(uploadPhoto).mockReturnValue(pending.promise)
    const { result } = renderHook(() => usePhotoUpload())
    await act(async () => {
      await result.current.select(file(), { waitForUpload: false })
    })
    await act(async () => {
      await expect(
        result.current.select(
          new File(["bad"], "bad.txt", { type: "text/plain" }),
        ),
      ).rejects.toThrow("JPG")
    })
    await act(async () => pending.resolve(uploaded))
    expect(result.current.draft).toMatchObject({ status: "done", uploaded })
  })
  it("releases previews on replacement and unmount", async () => {
    const { result, unmount } = renderHook(() => usePhotoUpload())
    await act(async () => {
      await result.current.select(file(), { waitForUpload: false })
    })
    await act(async () => {
      await result.current.select(file("second.jpg"))
    })
    expect(revokeUrl).toHaveBeenCalledWith("blob:photo-1")
    unmount()
    expect(revokeUrl).toHaveBeenCalledWith("blob:photo-2")
  })
  it("returns the finished upload to callers placing a photo directly on the wall", async () => {
    vi.mocked(uploadsEnabled).mockResolvedValue(true)
    vi.mocked(uploadPhoto).mockResolvedValue(uploaded)
    const { result } = renderHook(() => usePhotoUpload())
    let picked
    await act(async () => {
      picked = await result.current.select(file())
    })
    expect(picked).toMatchObject({ uploaded, status: "done" })
  })
  it("validates size and resolution even when uploads are disabled", async () => {
    const { result } = renderHook(() => usePhotoUpload())
    const huge = file()
    Object.defineProperty(huge, "size", { value: 41 * 1024 * 1024 })
    await expect(result.current.select(huge)).rejects.toThrow("40 MB")
    vi.mocked(createImageBitmap).mockResolvedValueOnce({
      width: 300,
      height: 200,
      close: vi.fn(),
    } as unknown as ImageBitmap)
    await expect(
      result.current.select(file(), { waitForUpload: false }),
    ).rejects.toThrow("400 px")
    expect(createUrl).not.toHaveBeenCalled()
  })
})
