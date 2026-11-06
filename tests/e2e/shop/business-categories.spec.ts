import { expect, test } from "@playwright/test"

test("business subcategories filter independently and keep shareable URLs", async ({ page }) => {
  await page.goto("/?category=Biznes")
  const cases = [
    { label: "Printime", category: "Print" },
    { label: "Veshje", category: "Veshje" },
    { label: "Çanta & tekstil", category: "Textile" },
    { label: "Produkte promocionale", category: "Promo" },
    { label: "Ambalazh & paketim", category: "Packaging" },
    { label: "Reklama & sinjalistikë", category: "Signage" },
  ]
  const row = page.locator(".cube-shop-categories")
  await expect(row.getByRole("button")).toHaveCount(7)
  for (const item of cases) {
    const button = row.getByRole("button", { name: new RegExp(`^${item.label}`) })
    await button.click()
    await expect(page).toHaveURL(new RegExp(`category=${item.category}$`))
    await expect(button).toHaveAttribute("aria-pressed", "true")
    const cards = page.locator(".cube-shop-grid .cube-product-card")
    await expect(cards.first()).toBeVisible()
    expect(await cards.evaluateAll((elements) => [...new Set(elements.map((element) => element.getAttribute("data-category")))])).toEqual([item.category])
    await expect(page.getByRole("searchbox")).toHaveAccessibleName(`Kërko te ${item.label}`)
    await page.reload()
    await expect(button).toHaveAttribute("aria-pressed", "true")
    await expect(cards.first()).toHaveAttribute("data-category", item.category)
  }
  await row.getByRole("button", { name: /^Krejt për biznese/ }).click()
  await expect(page).toHaveURL(/category=Biznes$/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width)
})
