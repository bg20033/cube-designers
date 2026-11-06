import { expect, test } from "@playwright/test"

const routes = ["/", "/about", "/work", "/start-project"]

test.beforeEach(async ({ page }) => {
  await page.route("**/api/shop-status", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ordersAvailable: true }),
    }),
  )
  await page.addInitScript(() => {
    window.sessionStorage.setItem("cube-intro-entered", "1")
  })
})

for (const route of routes) {
  test(`${route} renders a single page heading without horizontal overflow`, async ({
    page,
  }) => {
    await page.goto(route)
    await expect(page.locator("h1")).toHaveCount(1)
    await expect(page.locator("h1")).toBeAttached()

    const hasOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    )
    expect(hasOverflow).toBe(false)
  })
}

test("portfolio images load with responsive sources and useful alt text", async ({
  page,
}) => {
  await page.goto("/work")
  const images = page.locator(".work-case-visual img")
  await expect(images).toHaveCount(3)

  for (let index = 0; index < (await images.count()); index += 1) {
    const image = images.nth(index)
    await image.scrollIntoViewIfNeeded()
    await expect(image).toBeVisible()
    await expect(image).toHaveAttribute("alt", /\S+/)
    await expect(image).toHaveAttribute("srcset", /\.webp\s+\d+w/)
    await expect
      .poll(() => image.evaluate((element) => element.naturalWidth))
      .toBeGreaterThan(0)
  }
})

test("work case visuals keep a compact editorial scale", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Mobile uses its own compact image scale")
  await page.goto("/work")
  const heroHeight = await page
    .locator(".work-case-visual")
    .first()
    .evaluate((element) => element.getBoundingClientRect().height)
  expect(heroHeight).toBeLessThanOrEqual(620)
})

test("about is compact, text-led, and search-oriented", async ({ page }) => {
  await page.goto("/about")
  await expect(page.locator(".about-production")).toHaveCount(0)
  await expect(page.locator(".about-capabilities")).toBeVisible()
  await expect(page.locator(".about-capability-grid article")).toHaveCount(3)
  await expect(page).toHaveTitle(/Studio kreative.*branding.*Kosovë/i)

  const description = await page
    .locator('meta[name="description"]')
    .getAttribute("content")
  expect(description).toMatch(/Suharekë.*identitet vizual.*web design/i)

  const structuredData = (
    await page.locator('script[type="application/ld+json"]').allTextContents()
  ).join(" ")
  expect(structuredData).toContain("ProfessionalService")
  expect(structuredData).toContain("Suharekë")

  const heroHeight = await page
    .locator(".about-poster-hero")
    .evaluate((element) => element.getBoundingClientRect().height)
  expect(heroHeight).toBeLessThanOrEqual(760)
})

test("studio links directly to the separate shop", async ({ page, isMobile, request }) => {
  await page.goto("/")
  await expect(page.locator(".blast-hero")).toBeVisible()
  await expect(page.locator(".cube-store, .shop-dropdown, .header-cart")).toHaveCount(0)
  if (isMobile) await page.getByRole("button", { name: "Hap menynë" }).click()
  const navigation = page.locator(isMobile ? ".sheet-links" : ".agency-nav")
  await expect(navigation.locator('a[href="https://shop.cube-designers.com/"]')).toHaveAttribute("href", "https://shop.cube-designers.com/")
  for (const [path, target] of [["/shop?category=Postera", "/?category=Postera"], ["/shop/foto?test=1", "/foto?test=1"], ["/shop/forma-blue", "/forma-blue"]]) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    expect(response.headers().location).toBe(`https://shop.cube-designers.com${target}`)
  }
  const sitemap = await request.get("/sitemap.xml")
  expect(await sitemap.text()).not.toContain("/shop")
})

test("inner routes never allocate the lanyard WebGL canvas", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(baseURL ? new URL("/about", baseURL).toString() : "/about")
  await expect(
    page.getByRole("button", { name: "Enter the Cube Designers website" }),
  ).toHaveCount(0)
  await expect(page.locator(".lanyard-intro canvas")).toHaveCount(0)
  await context.close()
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

test("pre-rendered content remains useful without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto("/about")

  await expect(page.locator("h1")).toContainText("CUBE")
  await expect(page.getByText("Dëgjojmë", { exact: true })).toBeVisible()
  await expect(page).toHaveTitle("CUBE DESIGNERS | Studio kreative & branding në Kosovë")

  await context.close()
})

test("preview serves the real catalog API and the admin entry", async ({
  request,
  page,
}) => {
  const catalog = await request.get("/api/products")
  expect(catalog.status()).toBe(200)
  expect(Array.isArray((await catalog.json()).products)).toBe(true)
  const status = await request.get("/api/shop-status")
  expect(typeof (await status.json()).ordersAvailable).toBe("boolean")
  const admin = await page.goto("/admin")
  expect(admin?.status()).toBe(200)
  await expect(page.getByRole("heading", { name: "CUBE Admin" })).toBeVisible()
})
