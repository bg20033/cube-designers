import { fireEvent, render, screen, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import PhotoPrintPage from "./PhotoPrintPage"
import { usePhotoUpload } from "@/components/store/usePhotoUpload"
import { cropFor } from "@/lib/photo-upload"
import type { ReactNode } from "react"

vi.mock("@/components/store/usePhotoUpload", () => ({
  usePhotoUpload: vi.fn(),
}))
vi.mock("@/components/store/StoreChrome", () => ({
  StoreShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock("./PhotoRoomPreview", () => ({ PhotoRoomPreview: () => null }))
const draft = {
  localSrc: "blob:local-preview",
  width: 3600,
  height: 4800,
  name: "kujtim.jpg",
  status: "done" as const,
  progress: 100,
  uploaded: {
    image: "https://store1.public.blob.vercel-storage.com/foto/web/a.jpg",
    original:
      "https://store1.private.blob.vercel-storage.com/foto/original/a.jpg",
    width: 3600,
    height: 4800,
    name: "kujtim.jpg",
  },
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(usePhotoUpload).mockReturnValue({
    enabled: true,
    draft,
    select: vi.fn(),
    reset: vi.fn(),
  })
  // jsdom has no scrolling surface; the component scrolls the new step to top.
  HTMLElement.prototype.scrollTo = vi.fn()
})
afterEach(cleanup)

describe("photo print checkout selection", () => {
  it("keeps the exact crop and chosen finish in the cart, then prevents duplicate additions", () => {
    render(<PhotoPrintPage />)
    fireEvent.click(screen.getByRole("tab", { name: /Formati/ }))
    fireEvent.click(screen.getByRole("button", { name: /^Madhësia A4/ }))
    fireEvent.click(screen.getByRole("button", { name: /^Kornizë lisi/ }))
    fireEvent.click(screen.getByRole("tab", { name: /Fotoja/ }))
    fireEvent.click(screen.getByRole("button", { name: "Përshtat prerjen" }))
    fireEvent.change(screen.getByRole("slider", { name: "Zmadhimi i fotos" }), {
      target: { value: "1.5" },
    })
    fireEvent.click(screen.getByRole("tab", { name: /Përmbledhja/ }))
    fireEvent.click(screen.getByRole("button", { name: "Shto në shportë" }))
    const cart = JSON.parse(localStorage.getItem("cube-shop-cart-v1")!)
    expect(cart).toHaveLength(1)
    expect(cart[0]).toMatchObject({
      productId: "foto",
      variantId: "a4-kornize-lisi",
      quantity: 1,
      photo: {
        image: draft.uploaded.image,
        original: draft.uploaded.original,
        crop: cropFor(draft, 21 / 29.7, 1.5, 0.5, 0.5),
      },
    })
    expect(screen.queryByRole("button", { name: "Shto në shportë" })).toBeNull()
    expect(
      screen.getByRole("link", { name: "Shiko shportën" }),
    ).toHaveAttribute("href", "/?cart=1")
  })
  it("reports blocked storage instead of displaying a false success", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new Error("blocked")
    })
    render(<PhotoPrintPage />)
    fireEvent.click(screen.getByRole("tab", { name: /Përmbledhja/ }))
    fireEvent.click(screen.getByRole("button", { name: "Shto në shportë" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Shporta nuk u ruajt")
    expect(screen.queryByRole("link", { name: "Shiko shportën" })).toBeNull()
    vi.restoreAllMocks()
  })
})

it("orders a custom size and blocks checkout while its dimensions are invalid", () => {
  render(<PhotoPrintPage />)
  fireEvent.click(screen.getByRole("tab", { name: /Formati/ }))
  fireEvent.click(screen.getByRole("button", { name: "Custom" }))
  fireEvent.change(screen.getByLabelText("Gjerësia e printit"), {
    target: { value: "32.5" },
  })
  fireEvent.change(screen.getByLabelText("Lartësia e printit"), {
    target: { value: "45" },
  })
  fireEvent.change(screen.getByLabelText("Gjerësia e printit"), {
    target: { value: "" },
  })
  expect(
    screen.getByRole("button", { name: "Kontrollo printin" }),
  ).toBeDisabled()
  expect(screen.getByRole("tab", { name: /Përmbledhja/ })).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: "Custom" }))
  expect(
    screen.getByRole("button", { name: "Kontrollo printin" }),
  ).toBeDisabled()
  fireEvent.change(screen.getByLabelText("Gjerësia e printit"), {
    target: { value: "32.5" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Kontrollo printin" }))
  fireEvent.click(screen.getByRole("button", { name: "Shto në shportë" }))
  const cart = JSON.parse(localStorage.getItem("cube-shop-cart-v1")!)
  expect(cart[0].variantId).toBe("custom325x450")
  expect(cart[0].photo.crop).toEqual(cropFor(draft, 32.5 / 45, 1, 0.5, 0.5))
})

it("matches and locks the original photo ratio, then returns to standard formats", () => {
  render(<PhotoPrintPage />)
  fireEvent.click(screen.getByRole("tab", { name: /Formati/ }))
  fireEvent.click(screen.getByRole("button", { name: "Sipas fotos" }))
  expect(screen.getByLabelText("Gjerësia e printit")).toHaveValue(30)
  expect(screen.getByLabelText("Lartësia e printit")).toHaveValue(40)
  fireEvent.change(screen.getByLabelText("Lartësia e printit"), {
    target: { value: "60" },
  })
  expect(screen.getByLabelText("Gjerësia e printit")).toHaveValue(45)
  fireEvent.click(
    screen.getByRole("button", {
      name: "Proporcioni i fotos i lidhur",
    }),
  )
  fireEvent.change(screen.getByLabelText("Gjerësia e printit"), {
    target: { value: "42" },
  })
  expect(screen.getByLabelText("Lartësia e printit")).toHaveValue(60)
  fireEvent.click(screen.getByRole("button", { name: "Standarde" }))
  fireEvent.click(screen.getByRole("button", { name: /^Madhësia A4/ }))
  expect(screen.queryByLabelText("Gjerësia e printit")).toBeNull()
})
