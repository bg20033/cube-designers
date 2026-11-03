import { expect, test, type Page } from "@playwright/test"

// User-reported bug: after a guest confirms attendance the page must stay where it is and
// show the success state in place: no reload, no remount, no jump back to the envelope.
test.use({ permissions: ["clipboard-read", "clipboard-write"] })

declare global {
  interface Window { __qaMarker?: string; __qaRoot?: Element | null; __qaHero?: Element | null }
}

async function markPage(page: Page) {
  await page.evaluate(() => {
    window.__qaMarker = "still-here"
    window.__qaRoot = document.querySelector(".ftesa-page")
    window.__qaHero = document.querySelector(".ftesa-hero")
  })
}

async function expectSamePage(page: Page) {
  const state = await page.evaluate(() => ({
    marker: window.__qaMarker,
    sameRoot: Boolean(window.__qaRoot) && window.__qaRoot === document.querySelector(".ftesa-page") && window.__qaRoot!.isConnected,
    sameHero: Boolean(window.__qaHero) && window.__qaHero === document.querySelector(".ftesa-hero") && window.__qaHero!.isConnected,
  }))
  expect(state.marker, "page was reloaded").toBe("still-here")
  expect(state.sameRoot, "invitation page was remounted").toBe(true)
  expect(state.sameHero, "envelope was remounted").toBe(true)
}

const rsvpSection = (page: Page) => page.locator(".ftesa-rsvp")
const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY))

async function submitInPlace(page: Page, submit: ReturnType<Page["getByRole"]>) {
  // Put the confirm button in the middle of the screen, the way a guest would read the form,
  // once the section's reveal transition has finished (it moves the layout while running).
  await submit.scrollIntoViewIfNeeded()
  await expect(rsvpSection(page)).toHaveClass(/is-in/)
  await page.waitForTimeout(700)
  await submit.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }))
  await page.waitForTimeout(300)
  const before = await scrollY(page)
  const heroBottom = await page.evaluate(() => { const hero = document.querySelector(".ftesa-hero")!; return hero.getBoundingClientRect().bottom + window.scrollY })
  expect(before, "RSVP form should sit below the envelope").toBeGreaterThan(heroBottom - 400)
  await submit.click()
  const saved = page.getByRole("button", { name: "Përgjigjja u ruajt" })
  await expect(saved).toBeVisible()
  const success = rsvpSection(page).getByRole("status").filter({ hasText: "Faleminderit" })
  await expect(success).toContainText("u ruajt")
  await expect(success).toBeFocused()
  // Give any reload / remount / scroll reset a chance to happen before asserting it didn't.
  await page.waitForTimeout(800)
  await expectSamePage(page)
  const after = await scrollY(page)
  expect(Math.abs(after - before), `scroll jumped from ${before} to ${after}`).toBeLessThan(120)
  await expect(success).toBeInViewport()
  await expect(page.locator(".ftesa-hero .ftesa-stage")).not.toBeInViewport()
}

async function openPersonalLink(page: Page, guestName: string) {
  await page.goto("/ftesa?demo=1&tab=guests")
  await page.getByRole("button", { name: `Kopjo linkun për ${guestName}`, exact: true }).click()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toContain("#ftese=")
  await page.goto(link)
  await expect(page.getByRole("heading", { name: guestName, exact: true })).toBeVisible()
  return link
}

async function editAnswer(page: Page) {
  const before = await scrollY(page)
  await rsvpSection(page).getByRole("button", { name: "Ndrysho përgjigjen", exact: true }).click()
  await expectSamePage(page)
  // Focus lands on a choice of the first event, near where the guest already was.
  await expect(rsvpSection(page).getByRole("group", { name: /^Pjesëmarrja në / }).first().getByRole("button", { pressed: true })).toBeFocused()
  expect(Math.abs((await scrollY(page)) - before)).toBeLessThan(400)
}

async function answerAll(page: Page, choice: "accept" | "decline") {
  const groups = rsvpSection(page).getByRole("group", { name: /^Pjesëmarrja në / })
  const count = await groups.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) await groups.nth(i).getByRole("button").nth(choice === "accept" ? 0 : 1).click()
}

for (const motion of ["no-preference", "reduce"] as const) {
  test(`personal link: confirming stays in place and can be edited again (motion: ${motion})`, async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.emulateMedia({ reducedMotion: motion })
    const link = await openPersonalLink(page, "Familja Krasniqi")
    await markPage(page)

    await answerAll(page, "accept")
    const confirm = rsvpSection(page).getByRole("button", { name: "Konfirmo pjesëmarrjen", exact: true })
    await submitInPlace(page, confirm)
    expect(page.url()).toBe(link)

    // Editing the answer again still works, still in place.
    await editAnswer(page)
    await answerAll(page, "decline")
    const again = rsvpSection(page).getByRole("button", { name: "Konfirmo pjesëmarrjen", exact: true })
    await expect(again).toBeVisible()
    await submitInPlace(page, again)

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("cube-ftesa-demo-v1")!))
    const guest = stored.guests.find((g: { name: string }) => g.name === "Familja Krasniqi")
    expect(Object.values(guest.responses).every((r) => (r as { status: string }).status === "declined")).toBe(true)
    expect(errors).toEqual([])
  })
}

test("general demo link: registering stays in place (no reload) and the answer can be edited", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/ftesa?demo=1")
  await page.getByRole("button", { name: "Kopjo linkun", exact: true }).click()
  const url = await page.evaluate(() => navigator.clipboard.readText())
  expect(url).toContain("#teftuar-demo=")
  await page.goto(url)
  await expect(page.getByLabel("Emri yt ose i familjes")).toBeVisible()
  await markPage(page)

  await page.getByLabel("Emri yt ose i familjes").fill("Familja RSVP Në Vend")
  await page.getByLabel("Numri i personave", { exact: true }).selectOption("2")
  await answerAll(page, "accept")
  const confirm = rsvpSection(page).getByRole("button", { name: "Konfirmo pjesëmarrjen", exact: true })
  await submitInPlace(page, confirm)

  // The address bar now holds the personal link, and it can be copied from the success panel.
  expect(page.url()).toContain("#ftese=")
  await rsvpSection(page).getByRole("button", { name: "Kopjo linkun tënd", exact: true }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url())
  await expect(page.getByRole("heading", { name: "Familja RSVP Në Vend", exact: true })).toBeVisible()

  // Editing the answer again updates the same registration instead of creating a new guest.
  await editAnswer(page)
  await answerAll(page, "decline")
  const again = rsvpSection(page).getByRole("button", { name: "Konfirmo pjesëmarrjen", exact: true })
  await expect(again).toBeVisible()
  await submitInPlace(page, again)

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("cube-ftesa-demo-v1")!))
  const matches = stored.guests.filter((g: { name: string }) => g.name === "Familja RSVP Në Vend")
  expect(matches).toHaveLength(1)
  expect(Object.values(matches[0].responses).every((r) => (r as { status: string }).status === "declined")).toBe(true)

  // A later visit to the (now personal) URL shows the stored answer.
  await page.reload()
  await expect(page.getByRole("heading", { name: "Familja RSVP Në Vend", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Përgjigjja u ruajt" })).toBeDisabled()
  const pressed = rsvpSection(page).getByRole("group", { name: /^Pjesëmarrja në / }).first().getByRole("button", { pressed: true })
  await expect(pressed).toContainText("S’mund")
  expect(errors).toEqual([])
})

test("general demo link: missing name or answers show a focused error and register nobody", async ({ page }) => {
  await page.goto("/ftesa?demo=1")
  await page.getByRole("button", { name: "Kopjo linkun", exact: true }).click()
  const url = await page.evaluate(() => navigator.clipboard.readText())
  const guestsBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("cube-ftesa-demo-v1") ?? "{\"guests\":[]}").guests.length)
  await page.goto(url)
  await markPage(page)
  const confirm = rsvpSection(page).getByRole("button", { name: "Konfirmo pjesëmarrjen", exact: true })
  await confirm.click()
  await expect(rsvpSection(page).getByRole("alert")).toContainText("Shkruaj emrin")
  await expect(rsvpSection(page).getByRole("alert")).toBeFocused()
  await page.getByLabel("Emri yt ose i familjes").fill("Familja Pa Përgjigje")
  await confirm.click()
  await expect(rsvpSection(page).getByRole("alert")).toContainText("secilin event")
  await expectSamePage(page)
  expect(page.url()).toContain("#teftuar-demo=")
  const guestsAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("cube-ftesa-demo-v1") ?? "{\"guests\":[]}").guests.length)
  expect(guestsAfter).toBe(guestsBefore)
})

test("personal link: the RSVP can be answered and confirmed with the keyboard only", async ({ page }) => {
  test.skip(test.info().project.name.startsWith("mobile"), "keyboard flow is a desktop concern")
  await openPersonalLink(page, "Familja Krasniqi")
  await markPage(page)
  const groups = rsvpSection(page).getByRole("group", { name: /^Pjesëmarrja në / })
  const count = await groups.count()
  for (let i = 0; i < count; i++) {
    await groups.nth(i).getByRole("button").first().focus()
    await page.keyboard.press("Enter")
    await expect(groups.nth(i).getByRole("button").first()).toHaveAttribute("aria-pressed", "true")
  }
  const confirm = rsvpSection(page).getByRole("button", { name: "Konfirmo pjesëmarrjen", exact: true })
  await confirm.focus()
  await page.keyboard.press("Enter")
  const success = rsvpSection(page).getByRole("status").filter({ hasText: "Faleminderit" })
  await expect(success).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(rsvpSection(page).getByRole("button", { name: "Ndrysho përgjigjen", exact: true })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(groups.first().getByRole("button", { pressed: true })).toBeFocused()
  await expectSamePage(page)
})


test.beforeEach(async ({ page }) => {
  await page.route("**/api/admin/session", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ authenticated: true }) }))
})
