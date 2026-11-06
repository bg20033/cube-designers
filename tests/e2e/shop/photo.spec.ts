import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

const source = "public/media/collections/wall/linen-sofa.webp"
test("photo workspace gives the preview most of the width, opens the picker, and shares one crop across previews", async ({
  page,
  isMobile,
}) => {
  await page.goto("/foto")
  const editor = await page.locator(".photo-editor").boundingBox()
  const panel = await page.locator(".photo-panel").boundingBox()
  expect(editor).not.toBeNull()
  expect(panel).not.toBeNull()
  // Desktop: the preview takes about 70% of the width; mobile stacks them.
  if (isMobile) expect(Math.abs(editor!.height - panel!.height)).toBeLessThan(2)
  else
    expect(editor!.width / (editor!.width + panel!.width)).toBeCloseTo(0.7, 1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    page.viewportSize()!.width,
  )
  const chooser = page.waitForEvent("filechooser")
  await page
    .getByRole("button", { name: "Zgjidh një foto", exact: false })
    .click()
  await (await chooser).setFiles(source)
  const frame = page.locator(".photo-cropper-frame")
  await expect(frame).toBeVisible()
  await page.getByRole("button", { name: "Zmadho", exact: true }).click()
  await expect(page.getByLabel("Zmadhimi", { exact: true })).toHaveText("115%")
  await frame.focus()
  const before = await frame.evaluate((el) => el.style.backgroundPosition)
  await frame.press("ArrowRight")
  const position = await frame.evaluate((el) => el.style.backgroundPosition)
  expect(position).not.toBe(before)
  const background = await frame.evaluate((el) => ({
    position: el.style.backgroundPosition,
    size: el.style.backgroundSize,
  }))
  await page.getByRole("button", { name: "Në ambient", exact: true }).click()
  const print = page.locator(".photo-room-print .print-surface-photo")
  await expect(print).toBeVisible()
  expect(
    await print.evaluate((el) => ({
      position: el.style.backgroundPosition,
      size: el.style.backgroundSize,
    })),
  ).toEqual(background)
  await expect(page.getByRole("button", { name: /Kalo në dritë/ })).toHaveCount(
    0,
  )
  await page.getByRole("button", { name: "Detaji", exact: true }).click()
  await expect(page.locator(".photo-room-preview")).toHaveClass(/is-detail/)
  await page.getByRole("tab", { name: /Formati/ }).click()
  await page.getByRole("button", { name: /^Madhësia A4/ }).click()
  await page.getByRole("button", { name: /^Kornizë lisi/ }).click()
  await expect(page.locator(".photo-room-print")).toHaveClass(/frame-oak/)
  await page.getByRole("tab", { name: /Fotoja/ }).click()
  await page.getByRole("button", { name: "Rivendos", exact: true }).click()
  await expect(page.getByLabel("Zmadhimi", { exact: true })).toHaveText("100%")
  await expect(
    page.getByRole("button", { name: "Zvogëlo", exact: true }),
  ).toBeDisabled()
  const result = await new AxeBuilder({ page }).analyze()
  expect(
    result.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([])
})

test("invalid replacements keep the selected photo and show a clear error", async ({
  page,
}) => {
  await page.goto("/foto")
  await page.getByLabel("Zgjidh foton", { exact: true }).setInputFiles(source)
  await expect(page.locator(".photo-cropper-frame")).toBeVisible()
  const before = await page
    .locator(".photo-cropper-frame")
    .evaluate((el) => el.style.backgroundImage)
  await page.getByLabel("Zgjidh foton", { exact: true }).setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("test"),
  })
  await expect(page.getByRole("alert")).toContainText("JPG, PNG ose WebP")
  expect(
    await page
      .locator(".photo-cropper-frame")
      .evaluate((el) => el.style.backgroundImage),
  ).toBe(before)
  await page.getByRole("tab", { name: /Formati/ }).click()
  await page.getByRole("button", { name: /^Madhësia A6/ }).click()
  await expect(page.locator(".photo-price")).toContainText("8 €")
  await expect(page.locator(".photo-price")).toContainText("4 copë × 2 €")
  await page.getByRole("tab", { name: /Përmbledhja/ }).click()
  await expect(
    page.getByRole("button", { name: "Shto në shportë", exact: true }),
  ).toBeDisabled()
})

test("the example renders a real room but cannot be ordered as a customer photo", async ({
  page,
}) => {
  await page.goto("/foto")
  await expect
    .poll(() =>
      page
        .locator(".photo-room-image")
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0)
  await expect(page.locator(".photo-scene-note")).toContainText("Foto shembull")
  await page.getByRole("tab", { name: /Formati/ }).click()
  await page.getByRole("button", { name: /^Madhësia 50/ }).click()
  await page.getByRole("button", { name: /^Kornizë lisi/ }).click()
  const scene = await page.locator(".photo-room-preview").boundingBox()
  const print = await page.locator(".photo-room-print").boundingBox()
  expect(print!.x).toBeGreaterThanOrEqual(scene!.x)
  expect(print!.y).toBeGreaterThanOrEqual(scene!.y)
  expect(print!.y + print!.height).toBeLessThanOrEqual(scene!.y + scene!.height)
  await expect(page.getByRole("button", { name: /Kalo në dritë/ })).toHaveCount(
    0,
  )
  await expect(page.locator(".photo-room-image")).toHaveAttribute(
    "src",
    /living-room-day/,
  )
  await page
    .getByRole("button", { name: "Kontrollo printin", exact: true })
    .click()
  await expect(page.locator(".photo-summary")).toContainText("Ende pa foto")
  await expect(
    page.getByRole("button", { name: "Shto në shportë", exact: true }),
  ).toBeDisabled()
  expect(
    await page.evaluate(() => localStorage.getItem("cube-shop-cart-v1")),
  ).toBeNull()
})
