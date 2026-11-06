import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { readFile } from "node:fs/promises"

const image = "public/media/collections/photo/alpine-example-v1.webp"

test("custom dimensions follow the original photo and validate independently", async ({
  page,
}) => {
  await page.goto("/foto")
  await page.getByLabel("Zgjidh foton", { exact: true }).setInputFiles(image)
  await expect(page.locator(".photo-cropper-frame")).toBeVisible()
  await page
    .getByRole("button", { name: "Zgjidh formatin", exact: true })
    .click()
  await page.getByRole("button", { name: "Sipas fotos", exact: true }).click()
  const width = page.getByLabel("Gjerësia e printit", { exact: true })
  const height = page.getByLabel("Lartësia e printit", { exact: true })
  await expect(width).toHaveValue("40")
  await expect(height).toHaveValue("26.7")
  await page.getByRole("button", { name: "Prerja", exact: true }).click()
  const cropSize = await page
    .locator(".photo-cropper-frame")
    .evaluate((el) => el.style.backgroundSize.split(" ").map(parseFloat))
  expect(Math.max(...cropSize)).toBeLessThan(100.2)
  await width.fill("45")
  await expect(height).toHaveValue("30")
  await page.getByRole("button", { name: "Kornizë lisi", exact: false }).click()
  await expect(page.locator(".photo-price")).toContainText("37 €")
  await page
    .getByRole("button", { name: "Proporcioni i fotos i lidhur", exact: true })
    .click()
  await width.fill("42.5")
  await expect(height).toHaveValue("30")
  await width.fill("71")
  await expect(
    page.getByRole("button", { name: "Kontrollo printin", exact: true }),
  ).toBeDisabled()
  await expect(page.getByRole("tab", { name: /Përmbledhja/ })).toBeDisabled()
  await expect(page.getByRole("alert")).toContainText("10–70 cm")
  await width.fill("42.5")
  await page.getByRole("button", { name: "Në ambient", exact: true }).click()
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze()
  expect(
    result.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([])
  await page
    .getByRole("button", { name: "Kontrollo printin", exact: true })
    .click()
  await expect(page.locator(".photo-summary")).toContainText("42.5 × 30 cm")
  await expect(
    page.getByRole("button", { name: "Shto në shportë", exact: true }),
  ).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    page.viewportSize()!.width,
  )
})

test("custom photo dimensions survive the cart and the saved wall", async ({
  page,
}) => {
  const picture = await readFile(image)
  await page.route("**/*.blob.vercel-storage.com/**", (route) =>
    route.fulfill({ contentType: "image/webp", body: picture }),
  )
  await page.addInitScript(() => {
    const photo = {
      image:
        "https://store1.public.blob.vercel-storage.com/foto/web/custom.jpg",
      original:
        "https://store1.private.blob.vercel-storage.com/foto/original/custom.jpg",
      crop: { x: 0, y: 0, w: 1, h: 1 },
      landscape: true,
      name: "custom.jpg",
    }
    const item = {
      productId: "foto",
      variantId: "custom300x455-kornize-lisi",
      quantity: 1,
      photo,
    }
    localStorage.setItem("cube-shop-cart-v1", JSON.stringify([item]))
    localStorage.setItem(
      "cube-wall-incoming",
      JSON.stringify({ variant: item.variantId, photo }),
    )
  })
  await page.goto("/?cart=1")
  await expect(page.locator(".cube-cart-items")).toContainText("45,5 × 30 cm")
  await expect(page.locator(".cube-cart-items")).toContainText("37")
  const ratio = await page
    .locator(".cube-cart-photo")
    .evaluate((el) => parseFloat(el.style.aspectRatio))
  expect(ratio).toBeCloseTo(45.5 / 30)
  await page.goto("/muri")
  await expect(page.locator(".wall-poster")).toHaveCount(1)
  await expect(page.locator(".wall-poster")).toHaveClass(/frame-oak/)
  await page.getByRole("tab", { name: /Shporta/ }).click()
  await expect(page.locator(".wall-summary")).toContainText("45,5 × 30 cm")
  await expect(page.locator(".wall-summary")).toContainText("37")
  // Saved walls use the same custom variant and geometry on a clean navigation.
  await page.evaluate(() => {
    localStorage.removeItem("cube-wall-incoming")
  })
  const saved = await page.evaluate(() => localStorage.getItem("cube-wall-v1"))
  const encoded = JSON.parse(saved!)
  const decoded = JSON.parse(
    Buffer.from(
      encoded.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString(),
  )
  expect(decoded.i[0][1]).toBe("custom300x455-kornize-lisi")
})
