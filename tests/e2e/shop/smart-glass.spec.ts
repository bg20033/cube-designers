import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("Smart Glass has an isolated view with a working privacy demonstration", async ({ page }) => {
  await page.goto("/smart-glass")
  await expect(page).toHaveTitle("Smart Glass — Privatësi me një klik | CUBE")
  await expect(page.locator("h1")).toHaveCount(1)
  await expect(page.locator("h1")).toContainText(/Smart Glass/)
  await expect(page.locator("#main-content")).not.toContainText(/folie|Smart Film/i)
  await expect(page.locator(".smart-glass-page")).not.toContainText(/€|\b95\b|Çmimi|Çmime/)
  await expect(page.locator(".cube-shop-toolbar, .cube-shop-grid, .cube-film-wall, .cube-explore")).toHaveCount(0)
  for (const image of await page.locator(".sg-viewer img").all()) {
    await expect.poll(() => image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0)
  }
  const toggle = page.getByRole("switch", { name: "Xham transparent" })
  await expect(toggle).not.toBeChecked()
  await toggle.focus()
  await page.keyboard.press("Space")
  await expect(toggle).toBeChecked()
  await expect(page.locator(".sg-viewer")).toHaveAttribute("data-transparent", "true")
  await toggle.click()
  await expect(page.locator(".sg-viewer")).toHaveAttribute("data-transparent", "false")
  await page.locator(".sg-video > summary").click()
  const video = page.locator(".sg-video video")
  await expect(video).toBeVisible()
  await expect(video).toHaveAttribute("controls", "")
  await video.evaluate((element) => element.load())
  await expect.poll(() => video.evaluate((element) => element.readyState)).toBeGreaterThanOrEqual(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width)
  await expect(page.getByRole("link", { name: "Kërko ofertë", exact: true })).toHaveAttribute("href", "https://www.cube-designers.com/start-project?service=Smart%20Glass")
})

test("Smart Glass works with reduced motion and keeps the existing links", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/?category=Smart%20glass")
  await expect(page).toHaveURL(/\/smart-glass$/)
  expect(await page.locator(".sg-private-image").evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s")
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([])
  await page.goto("/smart-film")
  await expect(page.locator("h1")).toContainText(/Smart Glass/)
  await expect(page.locator(".cube-detail-hero")).toHaveCount(0)
})

test("Smart Glass keeps its content and native video without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  try {
    await page.goto(`${baseURL}/smart-glass`)
    await expect(page.locator("h1")).toContainText(/Smart Glass/)
    await expect(page.locator(".sg-private-image")).toBeVisible()
    await page.locator(".sg-video > summary").click()
    await expect(page.locator(".sg-video video")).toBeVisible()
    await expect(page.getByRole("link", { name: "Kërko ofertë", exact: true })).toBeVisible()
  } finally {
    await context.close()
  }
})
