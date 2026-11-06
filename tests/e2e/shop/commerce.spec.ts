import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"
const businessCategoryLabels = [/Krejt për biznese/, /Printime/, /Veshje/, /Çanta & tekstil/, /Produkte promocionale/, /Ambalazh & paketim/, /Reklama & sinjalistikë/]
test.beforeEach(async ({ page }) => {
  await page.route("**/api/shop-status", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ordersAvailable: true }) }))
})
async function addFromProduct(page: Page) {
  await page.getByRole("button", { name: "Shto në shportë" }).click()
  await page.getByRole("link", { name: "Shiko shportën" }).click()
}
async function openShopMenu(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole("button", { name: "Hap menynë" }).click()
  const menu = page.locator(`${isMobile ? ".sheet-links" : ".agency-nav"} .shop-dropdown`)
  await menu.locator("summary").click()
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running"))
  return menu
}
test("shop dropdown shows only main categories and supports keyboard dismissal", async ({ page, isMobile }) => {
  await page.goto("/")
  const menu = await openShopMenu(page, isMobile)
  await expect(menu.getByRole("link")).toHaveText([
    "Krejt", "Për biznese", "Postera", "Smart Glass", "Ftesa online",
  ])
  await expect(menu.getByRole("link", { name: "Ftesa online" })).toHaveAttribute("href", "https://www.cube-designers.com/ftesa")
  await expect(menu.getByRole("link", { name: /Llampa|Filma|Paketa|Veshje|Konfiguro murin|Printo foton/ })).toHaveCount(0)
  const accessibility = await new AxeBuilder({ page })
    .include(isMobile ? ".agency-sheet" : ".agency-header")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze()
  expect(accessibility.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  )).toEqual([])
  await menu.locator("summary").press("Escape")
  await expect(menu).not.toHaveAttribute("open", "")
  await expect(menu.locator("summary")).toBeFocused()
  await menu.locator("summary").press("Enter")
  await menu.getByRole("link", { name: "Për biznese", exact: true }).click()
  await expect(page).toHaveURL(/category=Biznes/)
  await page.locator(".cube-shop-categories").getByRole("button", { name: /^Veshje/ }).click()
  await expect(page.locator(".cube-shop-categories > button.active")).toContainText("Veshje")
  await expect(page.locator(".cube-shop-categories > button")).toHaveText(businessCategoryLabels)
  await expect(page.locator(".cube-shop-categories > a")).toHaveCount(0)
  await expect(page.locator(".cube-shop-grid")).toContainText("Maicë")
})

test("catalog category row only shows options inside the selected category", async ({ page }) => {
  await page.goto("/?category=Postera")
  const row = page.locator(".cube-shop-categories")
  await expect(row.locator(":scope > button")).toHaveText([/Krejt posterat/, /Paketa/])
  await expect(row.locator(":scope > a")).toHaveText(["Konfiguro murin", "Printo foton"])
  await row.getByRole("button", { name: /^Paketa/ }).click()
  await expect(page).toHaveURL(/category=Paketa/)
  await expect(row.getByRole("button", { name: /^Paketa/ })).toHaveAttribute("aria-pressed", "true")
  await expect(page.locator(".cube-shop-grid .cube-card-info > div > span")).toHaveText(Array(24).fill("Paketa"))
  await row.getByRole("button", { name: /^Krejt posterat/ }).click()
  await expect(page).toHaveURL(/category=Postera/)
  await expect(row.locator(":scope > button, :scope > a")).toHaveCount(4)
  await page.goto("/?category=Biznes")
  await expect(row.locator(":scope > button")).toHaveText(businessCategoryLabels)
  await expect(row.locator(":scope > a")).toHaveCount(0)
  await page.goto("/")
  await expect(row).toHaveCount(0)
  await expect(page.locator(".shop-overview")).toBeVisible()
})

test("smart glass has an offer request and lamps stay hidden in the catalog", async ({ page }) => {
  await page.goto("/?category=Smart%20glass")
  await expect(page).toHaveURL(/\/smart-glass$/)
  await expect(page.locator("h1")).toContainText(/smart\s*glass/i)
  await expect(page.locator(".cube-shop-toolbar")).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Kërko ofertë", exact: true })).toHaveAttribute("href", "https://www.cube-designers.com/start-project?service=Smart%20Glass")
  await page.goto("/?q=Llampa")
  await expect(page.locator(".cube-shop-grid .cube-product-card")).toHaveCount(0)
  await expect(page.locator('a[href*="category=Llampa"]')).toHaveCount(0)
})

test("shop toolbar searches, sorts and clears filters within the selected category", async ({ page }) => {
  const base = {
    number: "01", quantityLabel: "1 copë", description: "Produkt provë",
    tone: "paper", production: "Standard", material: "Print",
  }
  await page.route("**/api/products", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ managed: true, products: [
      { ...base, id: "scope-shirt", name: "Maicë premium", category: "Veshje", price: 75 },
      { ...base, id: "scope-shirt-basic", name: "Maicë bazë", category: "Veshje", price: 25 },
      { ...base, id: "scope-poster", name: "Poster provë", category: "Postera", price: 40 },
      { ...base, id: "scope-sign", name: "Reklamë ndriçuese", category: "Signage", price: 1200 },
    ] }),
  }))
  await page.goto("/?category=Veshje")
  const titles = page.locator(".cube-shop-grid h2")
  await expect(titles).toHaveText(["Maicë premium", "Maicë bazë"])
  const search = page.getByRole("searchbox")
  await expect(search).toHaveAttribute("placeholder", "Kërko veshje…")
  await expect(page.locator(".cube-shop-toolbar .filter-menu")).toHaveCount(0)
  await page.getByRole("combobox", { name: "Rendit produktet: Veshje" }).selectOption("price-low")
  await expect(titles).toHaveText(["Maicë bazë", "Maicë premium"])
  await page.locator(".cube-filter-button").click()
  await expect(page.getByRole("slider")).toHaveAttribute("max", "75")
  await page.getByRole("slider").fill("30")
  await expect(titles).toHaveText(["Maicë bazë"])
  await search.fill("Poster")
  await expect(titles).toHaveCount(0)
  await page.locator(".cube-filter-panel").getByRole("button", { name: "Pastro filtrat" }).click()
  await expect(page).toHaveURL(/category=Veshje$/)
  await expect(search).toHaveValue("")
  await expect(titles).toHaveText(["Maicë premium", "Maicë bazë"])

  await page.goto("/?category=Postera")
  await expect(titles).toHaveText(["Poster provë"])
  await expect(search).toHaveAttribute("placeholder", "Kërko postera…")
  await page.getByRole("button", { name: /^Seria/ }).click()
  await expect(page.getByRole("slider")).toHaveAttribute("max", "40")
  await search.fill("Maicë")
  await expect(titles).toHaveCount(0)
})

test("the main header cart updates and opens the saved cart across pages", async ({ page }) => {
  await page.goto("/?category=Postera&q=Orbit")
  await page.locator(".cube-card-add").first().click()
  await expect(page.locator(".header-cart")).toHaveAccessibleName("Hap shportën, 1 produkte")
  await page.getByRole("button", { name: "Mbyll", exact: true }).click()
  await page.locator(".header-cart").click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.goto("/forma-blue")
  await expect(page.locator(".header-cart")).toHaveAccessibleName("Hap shportën, 1 produkte")
  await page.locator(".header-cart").click()
  await expect(page.getByRole("dialog")).toContainText("Orbit")
})

test("shop editors start directly below the single shop header", async ({ page }) => {
  for (const path of ["/foto", "/muri"]) {
    await page.goto(path)
    await expect(page.locator(".cube-header")).toHaveCount(0)
    const header = await page.locator(".agency-header").boundingBox()
    const main = await page.locator("#main-content").boundingBox()
    expect(main!.y).toBeCloseTo(header!.height, 0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width)
  }
})

test("the shop grid loads more products a page at a time", async ({ page }) => {
  await page.goto("/?category=Postera")
  const cards = page.locator(".cube-shop-grid .cube-product-card")
  await expect(cards).toHaveCount(24)
  await page.getByRole("button", { name: "Shfaq më shumë" }).click()
  await expect(cards).toHaveCount(48)
  await page.getByRole("button", { name: /^Seria/ }).click()
  await page.locator(".filter-menu-panel label", { hasText: "Japoni" }).click()
  await expect(cards).not.toHaveCount(48)
  await expect(
    page.getByRole("button", { name: "Shfaq më shumë" }),
  ).toHaveCount(0)
})

test("business print is kept apart from the collection", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("#shop-posters")).not.toContainText("Business Cards")
  await expect(page.locator("#shop-business")).toContainText("Business Cards")
  await page.getByRole("link", { name: "Shiko printin për biznese", exact: true }).click()
  await expect(page).toHaveURL(/category=Biznes/)
  await expect(page.locator(".cube-shop-grid")).toContainText("Business Cards")
  await page.goto("/?category=Print")
  await expect(page).toHaveURL(/category=Print/)
  await expect(page.locator(".cube-shop-categories > button.active")).toContainText("Printime")
})

test("product details have a stable indexable route", async ({ page }) => {
  await page.goto("/business-cards")
  await expect(page.locator("h1")).toHaveText("Business Cards")
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    3,
  )
})

test("archive film posters are visible without opening a filter", async ({
  page,
}) => {
  await page.goto("/")
  await expect(page.locator("#shop-posters")).toContainText("Dracula")
  await expect(page.locator("#shop-posters")).toContainText("King Kong")
  await page.getByRole("link", { name: "Shiko posterat", exact: true }).click()
  await page.getByRole("button", { name: /^Seria/ }).click()
  await page.locator(".filter-menu-panel label", { hasText: /^Kinema/ }).click()
  await expect(page).toHaveURL(/category=Postera&seria=Kinema/)
  await expect(page.locator(".cube-shop-grid")).toContainText("Dracula")
})

test("the wall planner places posters and sends the wall to the cart", async ({
  page,
}) => {
  await page.goto("/forma-blue")
  await page.getByRole("link", { name: "Provoje në mur" }).click()
  await expect(page).toHaveURL(/\/muri\?add=forma-blue/)
  const posters = page.locator(".wall-poster")
  await expect(posters.first()).toBeVisible()
  const before = await posters.count()
  await page.getByRole("button", { name: "Shto Diëll në mur" }).click()
  await expect(posters).toHaveCount(before + 1)

  // Arrow keys move the selected poster by 1 cm.
  const poster = page.getByRole("button", { name: /^Diëll,/ })
  const start = await poster.boundingBox()
  await poster.focus()
  // Plain arrows step 1 cm; Shift steps 5 cm, which here would overlap the neighbouring poster.
  await page.keyboard.press("ArrowLeft")
  await expect
    .poll(async () => (await poster.boundingBox())!.x)
    .toBeLessThan(start!.x)

  // The size choice, not the posters (their labels also mention "A3").
  await page.getByRole("button", { name: /^Madhësia A3/ }).click()
  await page.getByRole("tab", { name: /Shporta/ }).click()
  await expect(page.locator(".wall-summary")).toContainText("A3 · 29,7 × 42 cm")
  await page.getByRole("button", { name: /Shto krejt në shportë/ }).click()
  await expect(page).toHaveURL(/\/\?cart=1/)
  await expect(page.locator(".cube-cart-items > article")).toHaveCount(
    before + 1,
  )
})

test("a photo can be cropped and sized before uploads are switched on", async ({
  page,
}) => {
  await page.goto("/foto")
  await expect(page.locator("h1")).toHaveText("Printo foton tënde.")
  // A 1200 × 800 test photo drawn in the page.
  const photo = await page.evaluate(async () => {
    const canvas = new OffscreenCanvas(1200, 800)
    const context = canvas.getContext("2d")!
    context.fillStyle = "#2458d6"
    context.fillRect(0, 0, 1200, 800)
    context.fillStyle = "#ffcc00"
    context.fillRect(500, 300, 200, 200)
    const blob = await canvas.convertToBlob({ type: "image/jpeg" })
    return [...new Uint8Array(await blob.arrayBuffer())]
  })
  await page.getByLabel("Zgjidh foton").setInputFiles({
    name: "pushime.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(photo),
  })
  await expect(page.locator(".photo-cropper-frame")).toBeVisible()
  // Landscape photos start in landscape.
  await expect(page.getByRole("button", { name: "Peizazh" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await page
    .getByRole("button", { name: "Zgjidh formatin", exact: true })
    .click()
  await page.getByRole("button", { name: /^Madhësia A4/ }).click()
  await page.getByRole("button", { name: /^Kanavacë/ }).click()
  await expect(page.locator(".photo-price")).toContainText("13 €")
  await expect(page.locator(".photo-quality")).toContainText("dpi")
  await page
    .getByRole("button", { name: "Kontrollo printin", exact: true })
    .click()
  // Without Vercel Blob configured the photo is only a preview.
  await expect(page.locator(".photo-status")).toContainText("pamje paraprake")
  await expect(
    page.getByRole("button", { name: "Shto në shportë" }),
  ).toBeDisabled()
})

test("bundles list their three posters and can be added to the cart", async ({
  page,
}) => {
  await page.goto("/?category=Paketa")
  await expect(
    page.locator(".cube-shop-grid .cube-product-card").first(),
  ).toBeVisible()
  await page.goto("/paketa-hollywood-i-arte")
  await expect(page.locator("h1")).toHaveText("Paketa Hollywood i Artë")
  const contents = page.locator(".cube-bundle-shelf")
  await expect(contents).toContainText("Gilda")
  await expect(contents.locator(".cube-product-card")).toHaveCount(3)
  await addFromProduct(page)
  await expect(page.locator(".cube-cart-items")).toContainText(
    "Paketa Hollywood i Artë",
  )
})

test("shop filters the launch categories and preserves shareable search", async ({
  page,
}) => {
  await page.goto("/?category=Postera")
  // The grid shows one page (24) of the full poster catalog.
  await expect(page.locator(".cube-shop-grid .cube-product-card")).toHaveCount(
    24,
  )
  await page.getByRole("button", { name: /^Seria/ }).click()
  await page.locator(".filter-menu-panel label", { hasText: /^Film/ }).click()
  await expect(page.locator(".cube-shop-grid .cube-product-card")).toHaveCount(
    6,
  )
  await expect(page).toHaveURL(/category=Postera&seria=Film/)
  await page.getByRole("button", { name: "Pastro", exact: true }).click()
  await page.getByRole("button", { name: "Gati", exact: true }).click()
  await page.getByRole("searchbox").fill("Orbit")
  await expect(page.locator(".cube-shop-grid .cube-product-card")).toHaveCount(
    2,
  )
  await expect(page.locator(".cube-shop-grid h2")).toHaveText(["Orbit", "Paketa CUBE Art"])
  await expect(page).toHaveURL(/category=Postera&q=Orbit/)
  await page.reload()
  await expect(page.getByRole("searchbox")).toHaveValue("Orbit")
  await expect(page.locator(".cube-shop-grid")).toContainText("Orbit")
  await page.getByRole("searchbox").fill("nuk-ekziston")
  await expect(
    page.getByRole("heading", { name: "S’gjetëm asnjë produkt." }),
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Pastro filtrat", exact: true })
    .click()
  await expect(page).toHaveURL(/category=Postera$/)
  await expect(page.locator(".cube-shop-grid .cube-product-card")).toHaveCount(
    24,
  )
})

test("shop uses a responsive product grid", async ({ page, isMobile }) => {
  await page.goto("/?category=Postera")
  const columns = await page
    .locator(".cube-shop-grid")
    .evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(" ").length,
    )
  expect(columns).toBe(isMobile ? 2 : 4)
})

test("quick view contains its content and returns focus after Escape", async ({
  page,
}) => {
  await page.goto("/")
  const opener = page.getByRole("button", {
    name: "Shiko shpejt Forma — Blue",
    exact: true,
  })
  await opener.click()
  const dialog = page.getByRole("dialog", { name: "Forma — Blue" })
  await expect(dialog).toBeVisible()
  const contained = await dialog.evaluate((element) => {
    const b = element.getBoundingClientRect()
    return (
      b.left >= 0 &&
      b.top >= 0 &&
      b.right <= innerWidth &&
      b.bottom <= innerHeight
    )
  })
  expect(contained).toBe(true)
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  await expect(opener).toBeFocused()
})

test("adding from a product page adds one item and keeps the cart on reload", async ({
  page,
}) => {
  await page.goto("/forma-blue")
  await addFromProduct(page)
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.locator(".cube-quantity > span")).toHaveText("1")
  await page.getByRole("button", { name: "Rrite Forma — Blue" }).click()
  await expect(dialog.locator(".cube-quantity > span")).toHaveText("2")
  await page.getByRole("button", { name: "Mbyll", exact: true }).click()
  await page.reload()
  await page.getByRole("button", { name: "Hap shportën, 2 produkte" }).click()
  await expect(page.locator(".cube-quantity > span")).toHaveText("2")
  await page.getByRole("button", { name: /^Largo Forma — Blue, / }).click()
  await expect(page.getByText("Shporta është ende bosh.")).toBeVisible()
})

test("checkout sends the selection and only clears the cart on success", async ({
  page,
}) => {
  await page.route("**/api/orders", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unavailable" }),
    }),
  )
  await page.goto("/?add=opal-dome-lamp")
  await page.getByRole("button", { name: "Vazhdo me porosinë" }).click()
  await page.getByLabel("Emri dhe mbiemri").fill("Test CUBE")
  // Email is optional.
  await page.getByLabel("Telefoni").fill("+38344123456")
  await page.getByLabel("Adresa e dërgesës").fill("Suharekë, adresa test")
  await page
    .getByRole("button", { name: "Dërgo porosinë", exact: true })
    .click()
  await expect(page.getByRole("alert")).toContainText("Porosia nuk u dërgua")
  await expect(
    page.getByRole("link", { name: "Dërgo porosinë me email" }),
  ).toHaveAttribute("href", /mailto:.*Opal%20Dome%20Lamp/)
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cube-shop-cart-v1")!),
    ),
  ).toEqual([{ productId: "opal-dome-lamp", quantity: 1 }])
  await page.route("**/api/orders", async (route) => {
    expect(route.request().postDataJSON().items).toEqual([
      { productId: "opal-dome-lamp", quantity: 1 },
    ])
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ reference: "CUBE-123456" }),
    })
  })
  await page
    .getByRole("button", { name: "Dërgo porosinë", exact: true })
    .click()
  await expect(page.locator(".cube-order-success")).toContainText(
    "Porosia u pranua.",
  )
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cube-shop-cart-v1")!),
    ),
  ).toEqual([])
})

for (const route of ["/", "/forma-blue", "/muri", "/foto"]) {
  test(`${route} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(route)
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze()
    expect(
      results.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([])
  })
}

test("selected sizes and poster formats survive into separate cart lines", async ({
  page,
}) => {
  await page.goto("/tshirts")
  await page.getByRole("button", { name: "Madhësia: L", exact: true }).click()
  await addFromProduct(page)
  await expect(page.locator(".cube-cart-item-copy")).toContainText(
    "Madhësia: L",
  )
  await page.getByRole("button", { name: "Mbyll", exact: true }).click()
  await page.goto("/tshirts")
  await page.getByRole("button", { name: "Madhësia: XL", exact: true }).click()
  await addFromProduct(page)
  await expect(page.locator(".cube-cart-items > article")).toHaveCount(2)
  await page.getByRole("button", { name: "Mbyll", exact: true }).click()
  await page.goto("/forma-blue")
  await expect(page.getByRole("button", { name: /^Madhësia / })).toHaveCount(4)
  await expect(page.locator(".size-picker-group").first().locator("button strong")).toHaveText(["A5", "A4", "A3", "A2"])
  await page.getByRole("button", { name: /^Madhësia A2/ }).click()
  await expect(page.locator(".cube-detail-price")).toHaveText("15 €")
  await page.getByRole("button", { name: /^Pleksiglas/ }).click()
  await expect(page.locator(".cube-detail-price")).toHaveText("25 €")
  await addFromProduct(page)
  await expect(page.locator(".cube-cart-items > article")).toHaveCount(3)
  await page.getByRole("button", { name: "Vazhdo me porosinë" }).click()
  await expect(page.locator(".cube-checkout-lines")).toContainText(
    "Formati: A2 · 42 × 59,4 cm · Pleksiglas",
  )
})

test("email ordering prepares a complete request without pretending it was sent", async ({
  page,
}) => {
  await page.route("**/api/shop-status", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ordersAvailable: false }),
    }),
  )
  await page.goto("/?add=tshirts&variant=xl")
  await page.getByRole("button", { name: "Vazhdo me porosinë" }).click()
  await page.getByLabel("Emri dhe mbiemri").fill("Test CUBE")
  await page.getByLabel("Email (opsionale)").fill("test@example.com")
  await page.getByLabel("Telefoni").fill("+38344123456")
  await page.getByLabel("Adresa e dërgesës").fill("Suharekë")
  await page.getByRole("button", { name: "Përgatit porosinë me email" }).click()
  await expect(page.getByLabel("Përmbledhja e porosisë për email")).toHaveValue(
    /Madhësia: XL/,
  )
  await expect(
    page.getByRole("link", { name: "Hap email-in me porosinë" }),
  ).toHaveAttribute("href", /mailto:info@cube-designers.com/)
  await expect(page.locator(".cube-email-order")).toContainText(
    "Kërkesa ende s’është dërguar.",
  )
  await expect(page.locator(".cube-order-success")).toHaveCount(0)
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cube-shop-cart-v1")!),
    ),
  ).toEqual([{ productId: "tshirts", quantity: 1, variantId: "xl" }])
})

test("corrupt stored selections cannot crash the shop", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("cube-shop-cart-v1", JSON.stringify({ broken: true }))
    localStorage.setItem("cube-shop-favorites-v1", JSON.stringify(null))
  })
  await page.goto("/")
  await expect(page.locator("#shop-posters .cube-product-card").first()).toBeVisible()
  await page.getByRole("button", { name: "Hap shportën, 0 produkte" }).click()
  await expect(page.getByText("Shporta është ende bosh.")).toBeVisible()
})

test("wall room keeps its paint and can be exported without lighting controls", async ({
  page,
}) => {
  await page.goto("/muri")
  await expect(page.locator(".wall-room .wall-sofa")).toBeVisible()
  await expect(page.getByRole("button", { name: /Mbrëmje|Ditë/ })).toHaveCount(
    0,
  )
  await page.reload()
  await page.getByRole("tab", { name: "Muri", exact: true }).click()
  await page.getByRole("button", { name: "Blu nate", exact: true }).click()
  await expect(page.locator(".wall-room-material")).toHaveAttribute(
    "src",
    /2e3b52/,
  )
  await page.getByRole("checkbox", { name: /Divani për shkallë/ }).uncheck()
  await expect(page.locator(".wall-sofa")).toHaveCount(0)
  await page.getByRole("checkbox", { name: /Divani për shkallë/ }).check()
  await expect(page.locator(".wall-sofa")).toBeVisible()
  const download = page.waitForEvent("download")
  await page
    .getByRole("button", { name: "Shkarko foton e murit", exact: true })
    .click()
  const file = await download
  expect(file.suggestedFilename()).toBe("muri-cube.png")
  expect(await file.failure()).toBeNull()
})

test("wall studio starts with dimensions and keeps both panes usable", async ({
  page,
  isMobile,
}) => {
  await page.goto("/muri")
  await expect(
    page.getByRole("tab", { name: "Muri", exact: true }),
  ).toHaveAttribute("aria-selected", "true")
  await expect(page.locator(".wall-poster")).toHaveCount(0)
  const left = await page.locator(".wall-stage-column").boundingBox()
  const right = await page.locator(".wall-panel").boundingBox()
  if (!isMobile) {
    expect(left!.width / (left!.width + right!.width)).toBeCloseTo(0.7, 1)
    expect(Math.abs(left!.y - right!.y)).toBeLessThan(2)
  } else {
    expect(right!.y).toBeGreaterThan(left!.y)
  }
  const width = page.getByRole("spinbutton", {
    name: "Gjerësia e murit",
    exact: true,
  })
  const height = page.getByRole("spinbutton", {
    name: "Lartësia e murit",
    exact: true,
  })
  await width.fill("420")
  await height.fill("280")
  await expect(page.locator(".wall-dimensions")).toContainText("420 × 280 cm")
  await width.fill("100")
  await expect(width).toHaveAttribute("aria-invalid", "true")
  await expect(
    page.getByRole("button", { name: "Vazhdo te posterat" }),
  ).toBeDisabled()
  await width.fill("420")
  await page.getByRole("button", { name: "Vazhdo te posterat" }).click()
  await expect(
    page.getByRole("tab", { name: "Posterat", exact: true }),
  ).toHaveAttribute("aria-selected", "true")
  await page.getByRole("searchbox", { name: "Kërko poster" }).fill("Diëll")
  await page.getByRole("button", { name: "Shto Diëll në mur" }).click()
  await expect(page.locator(".wall-poster")).toHaveCount(1)
  await page.getByRole("button", { name: /Madhësia A3/ }).click()
  await page
    .getByRole("spinbutton", { name: "Pozicioni horizontal" })
    .fill("150")
  await page.getByRole("button", { name: "Qendroje", exact: true }).click()
  await expect(
    page.getByRole("spinbutton", { name: "Pozicioni horizontal" }),
  ).toHaveValue("210")
  await page.getByRole("button", { name: "Kthe veprimin", exact: true }).click()
  await expect(
    page.getByRole("spinbutton", { name: "Pozicioni horizontal" }),
  ).toHaveValue("150")
  await page
    .getByRole("button", { name: "Përsërit veprimin", exact: true })
    .click()
  await expect(
    page.getByRole("spinbutton", { name: "Pozicioni horizontal" }),
  ).toHaveValue("210")
  await page.getByRole("button", { name: "Shiko përmbledhjen" }).click()
  await expect(page.locator(".wall-summary")).toContainText("A3 · 29,7 × 42 cm")
  await page.getByRole("button", { name: "Ndrysho Diëll", exact: true }).click()
  await expect(page.locator(".wall-selected")).toBeVisible()
})

test("wall studio can undo an entire poster drag", async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "Pointer drag is exercised in desktop; mobile retains keyboard and touch handlers",
  )
  await page.goto("/muri?add=diell")
  const poster = page.locator(".wall-poster").first()
  const initial = await poster.boundingBox()
  await poster.hover()
  await page.mouse.down()
  await page.mouse.move(
    initial!.x + initial!.width / 2 + 30,
    initial!.y + initial!.height / 2 + 25,
    { steps: 6 },
  )
  await page.mouse.up()
  const moved = await poster.boundingBox()
  expect(moved!.x).toBeGreaterThan(initial!.x + 10)
  await page.getByRole("button", { name: "Kthe veprimin", exact: true }).click()
  const restored = await poster.boundingBox()
  expect(Math.abs(restored!.x - initial!.x)).toBeLessThan(1)
  expect(Math.abs(restored!.y - initial!.y)).toBeLessThan(1)
})

test("the cart opens on the wall and saving the wall updates the cart", async ({
  page,
}) => {
  // Seeded once, before the shop reads the cart.
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return
    sessionStorage.setItem("seeded", "1")
    localStorage.setItem(
      "cube-shop-cart-v1",
      JSON.stringify([
        { productId: "forma-blue", quantity: 1, variantId: "a2-pleksi" },
        { productId: "paketa-hollywood-i-arte", quantity: 1, variantId: "a4" },
        { productId: "diell", quantity: 4, variantId: "a6" },
      ]),
    )
  })
  await page.goto("/?cart=1")
  await page.getByRole("link", { name: /Shiko si duken në mur/ }).click()
  await expect(page).toHaveURL(/\/muri\?shporta=1/)
  // The bundle and Forma — Blue go on the wall; a retired size stays unavailable in the cart.
  await expect(page.locator(".wall-poster")).toHaveCount(4)
  await expect(page.locator(".wall-summary")).toContainText(
    "Paketa Hollywood i Artë",
  )

  await page.getByRole("button", { name: "Provo", exact: true }).click()
  await expect(page.locator(".wall-poster")).toHaveCount(4)
  await page.getByRole("button", { name: "Rrjetë", exact: true }).click()

  await page
    .getByRole("button", { name: "Përditëso shportën me murin" })
    .click()
  // The shop drops ?cart=1 once the cart drawer is open.
  await expect(page.locator(".cube-cart-items")).toBeVisible()
  const cart = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cube-shop-cart-v1")!),
  )
  // The retired size remains and the wall replaces the available selections.
  expect(
    cart.find((line: { productId: string }) => line.productId === "diell"),
  ).toMatchObject({ quantity: 4, variantId: "a6" })
  expect(
    cart
      .filter((line: { productId: string }) => line.productId !== "diell")
      .reduce(
        (sum: number, line: { productId: string; quantity: number }) =>
          sum + (line.productId.startsWith("paketa") ? 3 : 1) * line.quantity,
        0,
      ),
  ).toBe(4)
})

test("corner handles and +/− step a print through the standard sizes", async ({
  page,
}) => {
  await page.goto("/muri?add=kinema-king-kong")
  const poster = page.getByRole("button", { name: /^King Kong,/ })
  await poster.click()
  const measure = page.locator(".wall-print-measure").first()
  await expect(measure).toContainText("A4")
  const handle = (await page.locator(".wall-resize.is-se").boundingBox())!
  await page.mouse.move(handle.x + 6, handle.y + 6)
  await page.mouse.down()
  for (let step = 1; step <= 10; step++)
    await page.mouse.move(handle.x + 6 + step * 8, handle.y + 6 + step * 11)
  await page.mouse.up()
  await expect(measure).toContainText("A2")
  await poster.focus()
  await page.keyboard.press("-")
  await expect(measure).toContainText("A3")
})

test("poster filters are multi-select menus", async ({ page }) => {
  await page.goto("/?category=Postera&seria=Kinema,Muzik%C3%AB")
  await expect(page.locator(".cube-result-count")).toContainText(
    "Kinema, Muzikë",
  )
  await page.goto("/muri")
  await page.getByRole("tab", { name: /Posterat/ }).click()
  await page.getByRole("button", { name: /Filtro/ }).click()
  await page.locator(".filter-menu-panel label", { hasText: "Paketa" }).click()
  await page.getByRole("button", { name: "Gati" }).click()
  await expect(
    page.locator(".wall-picker-grid > button").first(),
  ).toHaveAccessibleName(/Shto Paketa/)
})

test("trying a bundle clears the wall for it, and undo brings the old wall back", async ({
  page,
}) => {
  await page.goto("/muri?add=forma-blue")
  await expect(page.locator(".wall-poster")).toHaveCount(1)
  await page.goto("/muri?add=diell")
  await expect(page.locator(".wall-poster")).toHaveCount(2)
  await page.goto("/paketa-hollywood-i-arte")
  await page.getByRole("link", { name: /Provoje në murin tënd/ }).click()
  const posters = page.locator(".wall-poster")
  await expect(posters).toHaveCount(3)
  await expect(page.getByRole("button", { name: /^Gilda,/ })).toBeVisible()
  await expect(page.getByRole("button", { name: /^Diëll,/ })).toHaveCount(0)
  await page.getByRole("button", { name: "Kthe veprimin", exact: true }).click()
  await expect(posters).toHaveCount(2)
  await expect(page.getByRole("button", { name: /^Diëll,/ })).toBeVisible()
})
