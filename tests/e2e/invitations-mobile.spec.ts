import { expect, test, type Locator, type Page } from "@playwright/test"

// Small-phone regressions found in exploratory QA (340px is the narrowest width we support).
test.use({ viewport: { width: 340, height: 740 }, isMobile: true, hasTouch: true, permissions: ["clipboard-read", "clipboard-write"] })

async function inScrollView(locator: Locator) {
  return locator.evaluate((element) => {
    const r = element.getBoundingClientRect()
    let box = { top: 0, bottom: window.innerHeight }
    for (let p = element.parentElement; p; p = p.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight) { const b = p.getBoundingClientRect(); box = { top: Math.max(box.top, b.top), bottom: Math.min(box.bottom, b.bottom) }; break }
    }
    // Ignore anything covered by sticky dialog actions.
    const cover = document.elementFromPoint(r.left + r.width / 2, Math.min(r.bottom - 2, window.innerHeight - 1))
    return r.top >= box.top - 1 && r.bottom <= box.bottom + 1 && Boolean(cover) && (element.contains(cover) || cover === element)
  })
}

test("QA-2: removing an event shows its confirmation on a 340px phone", async ({ page }) => {
  await page.goto("/ftesa?demo=1")
  await page.getByRole("button", { name: "Ndrysho eventin Kanagjegji" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: /Hiqe eventin/ }).click()
  const confirmation = dialog.getByText(/Eventi hiqet nga ftesat/)
  await expect(confirmation).toBeVisible()
  await expect.poll(() => inScrollView(confirmation), { message: "confirmation text is off screen" }).toBe(true)
})

async function brokenWords(page: Page, heading: Locator) {
  return heading.evaluate((element) => {
    const broken: string[] = []
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? ""
      for (const match of text.matchAll(/\S{2,}/g)) {
        const range = document.createRange()
        range.setStart(node, match.index!)
        range.setEnd(node, match.index! + match[0].length)
        const lines = new Set(Array.from(range.getClientRects()).filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top)))
        if (lines.size > 1) broken.push(match[0])
      }
    }
    return broken
  })
}

test("QA-3: long couple names wrap between words, not inside them", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/ftesa?demo=1&tab=designs")
  await page.getByLabel("Emrat e çiftit").fill("Aleksandër Kristoforidhi & Margarita Tutulani")
  expect(await brokenWords(page, page.locator(".inv-editor-preview .inv-card-names").first()), "editor preview").toEqual([])
  await page.getByRole("button", { name: "Ruaj ftesën", exact: true }).click()
  await expect(page.getByRole("button", { name: "Ruaj ftesën", exact: true })).toBeDisabled()
  await page.goto("/ftesa?demo=1&tab=guests")
  await page.getByRole("button", { name: "Kopjo linkun për Familja Gashi", exact: true }).click()
  await page.goto(await page.evaluate(() => navigator.clipboard.readText()))
  const heading = page.getByRole("heading", { level: 1 })
  await expect(heading).toContainText("Kristoforidhi")
  expect(await brokenWords(page, heading), "guest page").toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test("QA-4: in a fresh demo, a personal link shows the answers the dashboard already counts", async ({ page }) => {
  await page.goto("/ftesa?demo=1&tab=guests")
  await expect(page.locator("tbody tr").filter({ hasText: "Familja Gashi" })).toContainText("U përgjigj")
  await page.getByRole("button", { name: "Kopjo linkun për Familja Gashi", exact: true }).click()
  await page.goto(await page.evaluate(() => navigator.clipboard.readText()))
  const groups = page.locator(".ftesa-rsvp").getByRole("group", { name: /^Pjesëmarrja në / })
  await expect(groups.first()).toBeVisible()
  for (const group of await groups.all()) await expect(group.getByRole("button", { pressed: true })).toHaveCount(1)
  await expect(page.getByRole("button", { name: "Përgjigjja u ruajt" })).toBeVisible()
})

test("QA-5: paying more than the price is flagged in the editor, the row and the summary", async ({ page }) => {
  await page.goto("/ftesa?demo=1&tab=budget")
  await page.getByRole("button", { name: /^Ndrysho / }).first().click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(/^Çmimi/).fill("100")
  await dialog.getByLabel(/Paguar/).fill("500")
  await expect(dialog.getByRole("status").filter({ hasText: "Paguar më shumë se çmimi" })).toBeVisible()
  await dialog.getByRole("button", { name: "Ruaj", exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText(/mbi çmim$/).first()).toBeVisible()
  await expect(page.getByText(/janë paguar mbi çmimin/)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})


// The demo opens only for a signed-in admin; fake that for every page of the test's browser context.
test.beforeEach(async ({ context }) => {
  await context.route("**/api/admin/session", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ authenticated: true }) }))
})
