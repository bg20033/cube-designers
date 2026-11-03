import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/invitations**", (route) => route.fulfill({
    status: route.request().url().includes("action=status") ? 200 : 401,
    contentType: "application/json",
    body: JSON.stringify(route.request().url().includes("action=status")
      ? { available: false, price: null, administrationConfigured: false }
      : { error: "Kyçu për të vazhduar." }),
  }))
})

test("invitation entry presents real designs before the order form", async ({ page }) => {
  await page.goto("/ftesa")
  await expect(page.locator("h1")).toHaveCount(1)
  await expect(page.locator("h1")).toContainText("Ftesat dhe mysafirët.")
  await expect(page.locator(".ftl-hero")).toBeVisible()
  await expect(page.locator(".ftl-preview .inv-card")).toHaveClass(/inv-theme-lilac/)
  const picker = page.getByRole("group", { name: "Parapamja e dizajneve" })
  await expect(picker.getByRole("button")).toHaveCount(4)
  await picker.getByRole("button", { name: "Perla", exact: true }).click()
  await expect(page.locator(".ftl-preview .inv-card")).toHaveClass(/inv-theme-rose/)
  await expect(picker.getByRole("button", { name: "Perla", exact: true })).toHaveAttribute("aria-pressed", "true")
  expect(await page.evaluate(() => localStorage.getItem("cube-ftesa-demo-v1"))).toBeNull()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width)
  await expect(page.locator(".ftl-main a[href*=demo]")).toHaveCount(0)
})

test("entry actions reach login and creation while service status stays understandable", async ({ page }) => {
  await page.goto("/ftesa")
  await page.getByRole("navigation", { name: "Ftesa online", exact: true }).getByRole("link", { name: "Kyçu", exact: true }).click()
  await expect(page).toHaveURL(/view=login#kycu$/)
  await expect(page.locator(".ftl-hero")).toHaveCount(0)
  await expect(page.locator("h1")).toContainText("Mirë se")
  await expect(page.getByRole("heading", { name: "Kyçu te ftesat tuaja", exact: true })).toBeVisible()
  await expect(page.getByLabel("Referenca e porosisë")).toBeVisible()
  await page.getByRole("navigation", { name: "Ftesa online", exact: true }).getByRole("link", { name: "Apliko", exact: true }).click()
  await expect(page).toHaveURL(/view=apply#porosit$/)
  await expect(page.getByLabel("Emri", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Dërgo kërkesën", exact: true })).toBeEnabled()
  await expect(page.locator(".ftl-account input:not([name=website])")).toHaveCount(3)
  await expect(page.locator(".ftl-account input[type=password], .ftl-account input[type=date], .ftl-account .inv-checkout-summary")).toHaveCount(0)
  await expect(page.locator(".ftl-page")).not.toContainText(/Neon|databaza|ADMIN_PASSWORD/)
})

test("entry supports keyboard design selection and has no serious accessibility issues", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/ftesa")
  const design = page.getByRole("button", { name: "Nën yje", exact: true })
  await design.focus()
  await page.keyboard.press("Enter")
  await expect(page.locator(".ftl-preview .inv-card")).toHaveClass(/inv-theme-midnight/)
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([])
})

test("the first view is useful without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  try {
    await page.goto(`${baseURL}/ftesa`)
    await expect(page.locator("h1")).toContainText("Ftesat dhe mysafirët.")
    await expect(page.locator(".ftl-preview .inv-card")).toContainText("Arbër")
    await expect(page.getByRole("link", { name: "Apliko për ftesat", exact: true })).toHaveAttribute("href", "/ftesa?view=apply#porosit")
  } finally { await context.close() }
})

test("visitors can inspect the package, apply, and open the login view directly", async ({ page }) => {
  await page.goto("/ftesa")
  const nav = page.getByRole("navigation", { name: "Ftesa online", exact: true })
  await nav.getByRole("link", { name: "Çka përfshin", exact: true }).click()
  const included = page.locator("#perfshin")
  await expect(included.getByRole("heading", { level: 2 })).toContainText("Çka përfshin")
  await expect(included.locator("article")).toHaveCount(6)
  await expect(included).toContainText("Çmimi me ofertë")
  await nav.getByRole("link", { name: "Apliko", exact: true }).click()
  await expect(page.getByLabel("Emri", { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/view=apply#porosit$/)
  await page.goto("/ftesa?view=login")
  await expect(page.getByLabel("Referenca e porosisë")).toBeVisible()
  await expect(page.locator("h1")).toHaveCount(1)
  await expect(page.locator(".ftl-hero, #perfshin")).toHaveCount(0)
  await expect(page.getByLabel("Emri", { exact: true })).toHaveCount(0)
  await nav.getByRole("link", { name: "Çka përfshin", exact: true }).click()
  await expect(page.locator("#perfshin")).toBeVisible()
  await expect(page.locator(".ftl-hero")).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width)
})


test("the three-field application sends a contact request and confirms only a saved request", async ({ page }) => {
  let application: Record<string, unknown> | undefined
  await page.route("**/api/submissions", async (route) => {
    application = route.request().postDataJSON()
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, id: 12 }) })
  })
  await page.goto("/ftesa?view=apply")
  await page.getByLabel("Emri", { exact: true }).fill("Arbër")
  await page.getByLabel("Mbiemri", { exact: true }).fill("Gashi")
  await page.getByLabel("Emaili", { exact: true }).fill("arber@example.test")
  await page.getByRole("button", { name: "Dërgo kërkesën", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Kërkesa u dërgua.", exact: true })).toBeVisible()
  expect(application).toMatchObject({ kind: "project", name: "Arbër Gashi", email: "arber@example.test", services: ["Ftesa online"] })
  expect(application).not.toHaveProperty("password")
  expect(application).not.toHaveProperty("date")
  await expect(page.locator(".ftl-account form")).toHaveCount(0)
})

test("failed applications keep the three fields and offer an honest email fallback", async ({ page }) => {
  await page.route("**/api/submissions", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Unavailable" }) }))
  await page.goto("/ftesa?view=apply")
  await page.getByLabel("Emri", { exact: true }).fill("Arbër")
  await page.getByLabel("Mbiemri", { exact: true }).fill("Gashi")
  await page.getByLabel("Emaili", { exact: true }).fill("arber@example.test")
  await page.getByRole("button", { name: "Dërgo kërkesën", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("Kërkesa nuk u dërgua")
  await expect(page.getByLabel("Emaili", { exact: true })).toHaveValue("arber@example.test")
  await expect(page.getByRole("heading", { name: "Kërkesa u dërgua.", exact: true })).toHaveCount(0)
  const fallback = new URL((await page.getByRole("link", { name: "Përgatit emailin", exact: true }).getAttribute("href"))!)
  expect(fallback.protocol).toBe("mailto:")
  expect(fallback.searchParams.get("body")).toContain("Arbër Gashi")
  expect(fallback.searchParams.get("body")).toContain("arber@example.test")
})


test("public visitors cannot open the demo dashboard", async ({ page }) => {
  await page.route("**/api/admin/session", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ authenticated: false }) }))
  await page.goto("/ftesa?demo=1")
  await expect(page).toHaveURL(/\/ftesa$/)
  await expect(page.locator(".ftl-hero")).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Navigimi i ftesave" })).toHaveCount(0)
})
