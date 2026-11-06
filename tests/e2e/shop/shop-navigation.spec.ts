import { expect, test } from "@playwright/test"

test("shop category navigation keeps the document and supports back navigation", async ({ page, isMobile }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/?category=Postera")
  await expect(page.locator(".cube-shop-categories .active")).toContainText("Krejt posterat")
  await page.locator(".agency-header").evaluate((element) => element.setAttribute("data-navigation-marker", "same-header"))
  if (isMobile) await page.getByRole("button", { name: "Hap menynë", exact: true }).click()
  const menu = page.locator(`${isMobile ? ".sheet-links" : ".agency-nav"} .shop-dropdown`)
  await menu.locator("summary").click()
  await menu.getByRole("link", { name: "Për biznese", exact: true }).click()
  await expect(page.locator(".cube-shop-categories .active")).toContainText("Krejt për biznese")
  await expect(page.locator(".agency-header")).toHaveAttribute("data-navigation-marker", "same-header")
  await page.locator(".cube-shop-categories").getByRole("button", { name: /^Veshje/ }).click()
  await expect(page).toHaveURL(/category=Veshje/)
  await page.goBack()
  await expect(page.locator(".cube-shop-categories .active")).toContainText("Krejt për biznese")
  await page.goBack()
  await expect(page.locator(".cube-shop-categories .active")).toContainText("Krejt posterat")
  await expect(page.locator(".agency-header")).toHaveAttribute("data-navigation-marker", "same-header")
  expect(errors).toEqual([])
})

test("mobile categories stay on one horizontally scrollable row", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Phone layout only")
  await page.goto("/?category=Biznes")
  const row = page.locator(".cube-shop-categories")
  await expect(row.getByRole("button")).toHaveCount(7)
  const layout = await row.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    scrollable: element.scrollWidth > element.clientWidth,
    tops: Array.from(element.children, (child) => child.getBoundingClientRect().top),
  }))
  expect(layout.height).toBeLessThan(70)
  expect(layout.scrollable).toBe(true)
  expect(Math.max(...layout.tops) - Math.min(...layout.tops)).toBeLessThan(2)
  await row.getByRole("button", { name: /^Reklama/ }).click()
  await expect(row.getByRole("button", { name: /^Reklama/ })).toHaveAttribute("aria-pressed", "true")
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width)
})
