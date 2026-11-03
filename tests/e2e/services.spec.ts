import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

// Services live on the About page (#sherbimet, one block per category linking to /sherbime/<slug>).
// The old /sherbime hub redirects there.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("cube-intro-entered", "1"))
})

const categories = ["print", "branding", "digital", "social"]

test("/sherbime moves to the services section on About", async ({ page }) => {
  await page.goto("/sherbime")
  await expect(page).toHaveURL(/\/about#sherbimet$/)
  await expect(page.locator("#sherbimet")).toBeInViewport()
})

test("About lists every service group and the category anchors land on them", async ({ page }) => {
  await page.goto("/about")
  await expect(page.locator("h1")).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  for (const key of categories) {
    await page.goto(`/about#${key}`)
    const group = page.locator(`#${key}`)
    await expect(group).toBeInViewport()
    // The group heading is not hidden under the fixed header.
    const heading = group.getByRole("heading", { level: 3 })
    await expect.poll(() => heading.evaluate((element) => {
      const r = element.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + 4, r.top + r.height / 2)
      return r.top >= 0 && Boolean(hit) && element.contains(hit)
    })).toBe(true)
  }
})

test("every service link on About opens a real service page", async ({ page, request }) => {
  await page.goto("/about")
  const hrefs = [...new Set(await page.locator('#sherbimet a[href^="/sherbime/"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")!)))]
  expect(hrefs.length).toBeGreaterThanOrEqual(12)
  for (const href of hrefs) expect((await request.get(href)).status(), href).toBe(200)
  await page.locator(`#sherbimet a[href="${hrefs[0]}"]`).click()
  await expect(page).toHaveURL(new RegExp(`${hrefs[0]}$`))
  await expect(page.locator("h1")).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test("the About services section has no serious accessibility violations", async ({ page }) => {
  await page.goto("/about#sherbimet")
  const results = await new AxeBuilder({ page }).include("#sherbimet").withTags(["wcag2a", "wcag2aa"]).analyze()
  expect(results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")).map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
})
