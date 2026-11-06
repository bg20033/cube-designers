import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/shop-status", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ordersAvailable: true }) }))
})

test("Krejt shows separate sliders with working buttons and keyboard navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  await expect(page.locator("h1")).toHaveText("Shop")
  await expect(page.locator(".shop-slider-heading h2")).toHaveText(["Postera", "Për biznese", "Smart Glass", "Ftesa online"])
  await expect(page.locator(".cube-shop-grid, .cube-shop-toolbar, .cube-film-wall, .cube-explore")).toHaveCount(0)
  const posters = page.getByRole("region", { name: "Postera", exact: true })
  const track = posters.getByRole("list")
  await posters.getByRole("button", { name: "Më shumë te Postera" }).click()
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
  await track.focus()
  await page.keyboard.press("Home")
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBe(0)
  await page.keyboard.press("ArrowRight")
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
  await page.keyboard.press("End")
  await expect(posters.getByRole("button", { name: "Më shumë te Postera" })).toBeDisabled()
  await expect(posters.getByRole("button", { name: "Kthehu te Postera" })).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width)
  await expect(page.locator('[data-category="Llampa"]')).toHaveCount(0)
})

test("slider products keep quick view and cart actions, with no favorites heart", async ({ page }) => {
  await page.goto("/")
  const card = page.locator("#shop-posters .cube-product-card").first()
  await expect(card.getByRole("button", { name: /^(Ruaj|Largo) / })).toHaveCount(0)
  await card.getByRole("button", { name: "Shiko shpejt Forma — Blue", exact: true }).click()
  await expect(page.getByRole("dialog", { name: "Forma — Blue" })).toBeVisible()
  await page.keyboard.press("Escape")
  await card.getByRole("button", { name: "Shto Forma — Blue në shportë", exact: true }).click()
  await expect(page.getByRole("dialog")).toContainText("Forma — Blue")
  await expect(page.locator(".header-cart")).toHaveAccessibleName("Hap shportën, 1 produkte")
})

test("slider links open the category and the correct service previews", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "Shiko posterat", exact: true }).click()
  await expect(page).toHaveURL(/category=Postera/)
  await expect(page.locator(".cube-shop-grid .cube-product-card")).toHaveCount(24)
  await expect(page.locator(".shop-overview")).toHaveCount(0)
  await page.goto("/")
  await page.getByRole("link", { name: "Zbulo Smart Glass", exact: true }).click()
  await expect(page).toHaveURL(/\/smart-glass$/)
  await expect(page.locator(".sg-viewer")).toBeVisible()
  await page.goto("/")
  await expect(page.getByRole("link", { name: "Shiko modelin Perla", exact: true })).toHaveAttribute("href", "https://www.cube-designers.com/ftesa?design=rose")
})

test("the slider overview has no serious accessibility issues", async ({ page }) => {
  await page.goto("/")
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([])
})
