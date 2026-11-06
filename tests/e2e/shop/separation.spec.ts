import { expect, test } from '@playwright/test'

test('the storefront has its own header and keeps commerce URLs on its origin', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'CUBE Shop', exact: true })).toHaveAttribute('href', '/')
  await expect(page.locator('.agency-header .header-project')).toHaveCount(0)
  await expect(page.locator('.agency-header a[href="/work"], .agency-header a[href="/about"]')).toHaveCount(0)
  await expect(page.locator('#shop-posters .cube-card-image a').first()).toHaveAttribute('href', '/forma-blue')
  await expect(page.locator('.header-cart')).toHaveCount(1)
  await page.goto('/forma-blue')
  await expect(page.locator('h1')).toContainText('Forma')
  await page.getByRole('button', { name: 'Shto në shportë', exact: true }).click()
  await page.getByRole('link', { name: 'Shiko shportën', exact: true }).click()
  await expect(page).toHaveURL(/4321\//)
  await expect(page.getByRole('dialog')).toContainText('Forma')
  expect(errors).toEqual([])
})

test('the public shop API excludes studio and admin endpoints', async ({ request }) => {
  for (const path of ['/api/admin/session', '/api/invitations', '/api/submissions', '/api/unknown']) {
    expect((await request.get(path)).status()).toBe(404)
  }
  const response = await request.put('/api/products', { data: {} })
  expect(response.status()).toBe(405)
  expect(response.headers().allow).toBe('GET, HEAD')
  const head = await request.head('/api/shop-status')
  expect(head.status()).toBe(200)
  expect(await head.body()).toHaveLength(0)
})

test('unknown products return 404 and product content is rendered without JavaScript', async ({ browser, baseURL, request }) => {
  const missing = await request.get('/missing-product-123')
  expect(missing.status()).toBe(404)
  expect(await missing.text()).toContain('noindex,follow')
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await context.newPage()
  await page.goto('/forma-blue')
  await expect(page.locator('h1')).toContainText('Forma')
  await expect(page.getByRole('link', { name: 'CUBE Shop', exact: true })).toBeVisible()
  await context.close()
})
