import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import GeneralInvitationPage from "./GeneralInvitationPage"
import GuestInvitation from "./GuestInvitation"
import { createDemoWedding, makeInvitation, type Invitation } from "./model"

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never
  Element.prototype.scrollIntoView ??= () => {}
})
afterEach(cleanup)

describe("rsvp in place", () => {
  it("personal: shows success panel, then edits again", async () => {
    const w = createDemoWedding()
    const inv = makeInvitation(w, w.guests[1])
    const onRespond = vi.fn(async (_responses: Invitation["guest"]["responses"], _invitation: Invitation) => true)
    const { container } = render(<GuestInvitation invitation={inv} onRespond={onRespond} />)
    const root = container.firstChild
    fireEvent.click(screen.getByRole("button", { name: "Do të vijmë" }))
    fireEvent.click(screen.getByRole("button", { name: "Konfirmo pjesëmarrjen" }))
    await screen.findByRole("status")
    expect(screen.getByRole("status")).toHaveTextContent("Faleminderit! Përgjigjja juaj u ruajt.")
    expect(screen.getByRole("status")).toHaveTextContent("Do të vijmë · 4 persona")
    expect(document.activeElement).toBe(screen.getByRole("status"))
    expect(screen.getByRole("button", { name: "Përgjigjja u ruajt" })).toBeDisabled()
    expect(container.firstChild).toBe(root)
    fireEvent.click(screen.getByRole("button", { name: "Ndrysho përgjigjen" }))
    await waitFor(() => expect(document.activeElement?.textContent).toContain("Do të vijmë"))
    fireEvent.click(screen.getByRole("button", { name: "S’mund të vijmë" }))
    fireEvent.click(screen.getByRole("button", { name: "Konfirmo pjesëmarrjen" }))
    await screen.findByRole("status")
    expect(onRespond).toHaveBeenCalledTimes(2)
    expect(onRespond.mock.calls[1][0]).toEqual({ dasma: { status: "declined", count: 0 } })
  })
  it("general: registers, switches to personal in place, edits use the new invitation", async () => {
    const w = createDemoWedding()
    const general = { version: 1 as const, names: w.names, message: w.message, design: w.design, events: w.events.filter((e) => e.id === "dasma"), capacity: 4 }
    let personal: Invitation | null = null
    const onRegister = vi.fn(async (name: string, count: number, responses: Invitation["guest"]["responses"]) => {
      personal = { ...general, version: 1, guest: { id: "x", token: "tok-1", name, capacity: count, kind: "family", events: ["dasma"], message: "", responses } } as Invitation
      return personal
    })
    const onRespond = vi.fn(async (_invitation: Invitation, _responses: Invitation["guest"]["responses"]) => true)
    const { container } = render(<GeneralInvitationPage invitation={general} online onRegister={onRegister} onRespond={onRespond} />)
    const root = container.firstChild
    fireEvent.change(screen.getByLabelText("Emri yt ose i familjes"), { target: { value: "Familja Test" } })
    fireEvent.change(screen.getByLabelText("Numri i personave"), { target: { value: "3" } })
    fireEvent.click(screen.getByRole("button", { name: "Do të vijmë" }))
    fireEvent.click(screen.getByRole("button", { name: "Konfirmo pjesëmarrjen" }))
    await screen.findByRole("status")
    expect(screen.getByRole("heading", { name: "Familja Test" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Do të vijmë · 3 persona")
    expect(screen.getByRole("button", { name: "Kopjo linkun tënd" })).toBeInTheDocument()
    expect(container.firstChild).toBe(root)
    fireEvent.click(screen.getByRole("button", { name: "Ndrysho përgjigjen" }))
    expect(screen.queryByLabelText("Emri yt ose i familjes")).toBeNull()
    fireEvent.change(screen.getByLabelText("Numri i personave për Dasma"), { target: { value: "2" } })
    fireEvent.click(screen.getByRole("button", { name: "Konfirmo pjesëmarrjen" }))
    await screen.findByRole("status")
    expect(onRegister).toHaveBeenCalledTimes(1)
    expect(onRespond).toHaveBeenCalledTimes(1)
    expect((onRespond.mock.calls[0] as unknown[])[0]).toBe(personal)
    expect((onRespond.mock.calls[0] as unknown[])[1]).toEqual({ dasma: { status: "accepted", count: 2 } })
  })
})
