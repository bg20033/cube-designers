import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const routes = ["/", "/about", "/work", "/roadmap", "/shop", "/start-project"]

for (const route of routes) {
  test(`${route} renders a single page heading without horizontal overflow`, async ({
    page,
  }) => {
    await page.goto(route)
    await expect(page.locator("h1")).toHaveCount(1)
    await expect(page.locator("h1")).toBeAttached()

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasOverflow).toBe(false)
  })
}

test("product details have a stable indexable route", async ({ page }) => {
  await page.goto("/shop/business-cards")
  await expect(page.locator("h1")).toHaveText("Business Cards")
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(4)
})

test("unknown routes return a real 404", async ({ request }) => {
  const response = await request.get("/not-a-real-page")
  expect(response.status()).toBe(404)
})

test("crawler files are real text and XML resources", async ({ request }) => {
  const robots = await request.get("/robots.txt")
  expect(robots.headers()["content-type"]).toContain("text/plain")
  expect(await robots.text()).toContain("User-agent:")

  const sitemap = await request.get("/sitemap.xml")
  expect(sitemap.headers()["content-type"]).toMatch(/xml/)
  expect(await sitemap.text()).toContain("<urlset")
})

test("roadmap has no serious accessibility violations", async ({ page }) => {
  await page.goto("/roadmap")
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze()
  const serious = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  )
  expect(serious).toEqual([])
})

test("pre-rendered content remains useful without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto("/roadmap")

  await expect(page.locator("h1")).toContainText("Roadmap 90-ditor")
  await expect(page.getByText("Kuptojmë", { exact: true }).first()).toBeVisible()
  await expect(page).toHaveTitle("Roadmap 90-ditor | Nga ideja te sistemi")

  await context.close()
})

test("roadmap respects reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/roadmap")

  await expect(page.locator("h1")).toHaveCount(1)
  const transitionsAreDisabled = await page.evaluate(() => {
    const filter = document.querySelector(".rm2-route-filters button")
    return filter ? getComputedStyle(filter).transitionDuration === "0s" : false
  })
  expect(transitionsAreDisabled).toBe(true)
})

test("landing service story stays pinned while its scroll story advances", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Desktop uses the pinned service-story layout")
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")

  const story = page.locator(".service-story")
  const storyTop = await story.evaluate(
    (element) => window.scrollY + element.getBoundingClientRect().top,
  )
  await page.evaluate((top) => window.scrollTo(0, top + 480), storyTop)

  await expect
    .poll(() =>
      page.locator(".story-sticky").evaluate((element) =>
        Math.round(element.getBoundingClientRect().top),
      ),
    )
    .toBe(0)
  await expect(page.locator(".story-card-shell")).toBeVisible()
})

test("roadmap remains pinned and updates its day from scroll progress", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Mobile uses the linear roadmap journey")
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/roadmap")
  await page.waitForTimeout(400)
  await page.evaluate(() => window.scrollTo(0, 900))

  await expect
    .poll(() =>
      page.locator(".rm2-sticky-stage").evaluate((element) =>
        Math.round(element.getBoundingClientRect().top),
      ),
    )
    .toBe(76)
  await expect
    .poll(async () =>
      Number(await page.locator(".rm2-live-day strong").textContent()),
    )
    .toBeGreaterThan(0)
})
