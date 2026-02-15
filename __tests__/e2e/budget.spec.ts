import { test, expect } from './fixtures'

test.describe('budget page', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/budget')
    await page.waitForURL('**/budget')
  })

  test('renders page heading', async ({ authenticatedPage: page }) => {
    await expect(page.locator('h1', { hasText: 'Budget' })).toBeVisible()
  })
})
