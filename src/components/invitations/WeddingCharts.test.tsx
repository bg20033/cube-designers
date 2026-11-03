import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import OverviewCharts, { BudgetCharts } from "./WeddingCharts"
import { createDemoWedding } from "./model"
import { createWeddingPlan } from "./planning-model"

afterEach(cleanup)

describe("wedding charts", () => {
  it("shows who comes to each event in persons, including unused seats as not coming", () => {
    render(<OverviewCharts wedding={createDemoWedding()} />)
    const card = (name: string) => screen.getByRole("article", { name })
    expect(within(card("Dasma")).getByText("/ 25 vijnë")).toBeInTheDocument()
    expect(Array.from(card("Dasma").querySelectorAll("dd"), (dd) => dd.textContent)).toEqual(["15", "3", "7"])
    expect(within(card("Dasma")).getByText("5 nga 8 ftesa janë përgjigjur")).toBeInTheDocument()
    expect(within(card("Nata e dasmës")).getByText("/ 10 vijnë")).toBeInTheDocument()
    expect(within(card("Kanagjegji")).getByText("2 nga 3 ftesa janë përgjigjur")).toBeInTheDocument()
  })

  it("handles a wedding without guests without invalid percentages", () => {
    const wedding = { ...createDemoWedding(), guests: [] }
    const { container } = render(<OverviewCharts wedding={wedding} />)
    expect(screen.getAllByText("Ende pa ftesa për këtë event")).toHaveLength(3)
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/)
  })

  it("keeps overpaid deposits from hiding outstanding payments and separates common costs", () => {
    const wedding = createDemoWedding(), plan = createWeddingPlan()
    plan.expenses = [
      { ...plan.expenses[1], unitCents: 10000, paidCents: 20000, eventId: "" },
      { ...plan.expenses[2], unitCents: 10000, paidCents: 0, eventId: "nata" },
    ]
    render(<BudgetCharts wedding={wedding} plan={plan} />)
    const payments = screen.getByRole("region", { name: "Grafiku i pagesave" })
    expect(within(payments).getByText("50%")).toBeInTheDocument()
    expect(within(payments).getAllByText("100,00 €")).toHaveLength(2)
    expect(within(payments).getByText(/mbi koston e disa shpenzimeve/)).toBeInTheDocument()
    const events = screen.getByRole("region", { name: "Grafiku i shpenzimeve sipas eventit" })
    expect(within(events).getAllByText("100,00 €")).toHaveLength(2)
    expect(within(events).getByText("Të përbashkëta")).toBeInTheDocument()
  })

  it("updates budget charts when the guest scenario changes", () => {
    const wedding = createDemoWedding(), plan = createWeddingPlan()
    plan.expenses[0].unitCents = 2000
    const { rerender } = render(<BudgetCharts wedding={wedding} plan={plan} />)
    const costs = () => screen.getByRole("region", { name: "Grafiku i shpenzimeve sipas eventit" })
    expect(within(costs()).getByText("500,00 €")).toBeInTheDocument()
    rerender(<BudgetCharts wedding={wedding} plan={{ ...plan, budget: { ...plan.budget, guestSource: "confirmed" } }} />)
    expect(within(costs()).getByText("300,00 €")).toBeInTheDocument()
    expect(within(costs()).queryByText("500,00 €")).not.toBeInTheDocument()
  })
})
