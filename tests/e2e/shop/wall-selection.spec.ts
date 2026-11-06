import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

async function openWall(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "cube-wall-v1",
      JSON.stringify(
        btoa(
          JSON.stringify({
            w: 300,
            h: 260,
            c: "#f3f1ec",
            s: 1,
            g: 0,
            i: [
              ["diell", "a3", 70, 85],
              ["orbit", "a3", 150, 85],
              ["forma-blue", "a3", 230, 85],
            ],
          }),
        ),
      ),
    )
  })
  await page.goto("/muri")
  await expect(page.locator(".wall-poster")).toHaveCount(3)
}
async function boxSelect(page: Page, reverse = false) {
  const surface = await page.locator(".wall-surface").boundingBox()
  const unit = surface!.width / 300
  const a = { x: surface!.x + 40 * unit, y: surface!.y + 50 * unit }
  const b = { x: surface!.x + 180 * unit, y: surface!.y + 115 * unit }
  await page.mouse.move(reverse ? b.x : a.x, reverse ? b.y : a.y)
  await page.mouse.down()
  await page.mouse.move(reverse ? a.x : b.x, reverse ? a.y : b.y, { steps: 8 })
  await expect(page.locator(".wall-marquee")).toBeVisible()
  await page.mouse.up()
  await expect(page.locator(".wall-poster.is-selected")).toHaveCount(2)
}

test("drag selection moves posters as a group and one undo restores every position", async ({
  page,
}) => {
  await openWall(page)
  await boxSelect(page)
  const posters = page.locator(".wall-poster")
  const before = await Promise.all([
    posters.nth(0).boundingBox(),
    posters.nth(1).boundingBox(),
    posters.nth(2).boundingBox(),
  ])
  const first = before[0]!
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    first.x + first.width / 2 + 25,
    first.y + first.height / 2 + 15,
    { steps: 6 },
  )
  await page.mouse.up()
  for (let i = 0; i < 3; i++) {
    const moved = await posters.nth(i).boundingBox()
    expect(moved!.x - before[i]!.x).toBeCloseTo(i < 2 ? 25 : 0, 0)
    expect(moved!.y - before[i]!.y).toBeCloseTo(i < 2 ? 15 : 0, 0)
  }
  await page.getByRole("button", { name: "Kthe veprimin", exact: true }).click()
  for (let i = 0; i < 3; i++) {
    const restored = await posters.nth(i).boundingBox()
    expect(Math.abs(restored!.x - before[i]!.x)).toBeLessThan(1)
    expect(Math.abs(restored!.y - before[i]!.y)).toBeLessThan(1)
  }
  await page.locator(".wall-surface").click({ position: { x: 3, y: 3 } })
  await expect(page.locator(".wall-poster.is-selected")).toHaveCount(0)
  await boxSelect(page, true)
  await posters.nth(2).click({ modifiers: ["Shift"] })
  await expect(page.locator(".wall-poster.is-selected")).toHaveCount(3)
  await posters.nth(2).click({ modifiers: ["ControlOrMeta"] })
  await expect(page.locator(".wall-poster.is-selected")).toHaveCount(2)
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze()
  expect(
    result.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([])
})

test("selected prints share size and finish changes, duplicate, and delete together", async ({
  page,
}) => {
  await openWall(page)
  await boxSelect(page)
  const group = page.getByRole("region", {
    name: "Posterat e zgjedhur",
    exact: true,
  })
  await group.getByRole("button", { name: /^Madhësia A4/ }).click()
  await group.getByRole("button", { name: "Kornizë lisi", exact: true }).click()
  await expect(page.locator(".wall-poster.frame-oak")).toHaveCount(2)
  await expect(page.locator(".wall-print-measure").first()).toContainText(
    "25 × 33.7 cm",
  )
  await group
    .getByRole("button", { name: "Dupliko grupin", exact: true })
    .click()
  await expect(page.locator(".wall-poster")).toHaveCount(5)
  await expect(page.locator(".wall-poster.is-selected")).toHaveCount(2)
  await page
    .getByRole("button", { name: "Zgjidh krejt posterat", exact: true })
    .click()
  await expect(page.locator(".wall-poster.is-selected")).toHaveCount(5)
  await page.locator(".wall-surface").focus()
  await page.keyboard.press("Escape")
  await expect(page.locator(".wall-poster.is-selected")).toHaveCount(0)
  await page.keyboard.press("ControlOrMeta+a")
  await expect(page.locator(".wall-poster.is-selected")).toHaveCount(5)
  await page.keyboard.press("Delete")
  await expect(page.locator(".wall-poster")).toHaveCount(0)
  await page.getByRole("button", { name: "Kthe veprimin", exact: true }).click()
  await expect(page.locator(".wall-poster")).toHaveCount(5)
  await expect(page.getByRole("button", { name: /Ditë|Mbrëmje/ })).toHaveCount(
    0,
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    page.viewportSize()!.width,
  )
})

test("print configuration uses compact size and material buttons", async ({
  page,
}) => {
  await page.goto("/foto")
  await page.getByRole("tab", { name: /Formati/ }).click()
  const size = await page.locator(".size-cards button").first().boundingBox()
  const finish = await page
    .locator(".finish-cards button")
    .first()
    .boundingBox()
  expect(size!.height).toBeLessThanOrEqual(40)
  expect(finish!.height).toBeLessThanOrEqual(44)
  await expect(page.getByRole("button", { name: /Kalo në dritë/ })).toHaveCount(
    0,
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    page.viewportSize()!.width,
  )
})
