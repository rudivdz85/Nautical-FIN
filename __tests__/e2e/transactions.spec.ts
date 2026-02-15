import { test, expect } from './fixtures'

test.describe('transactions page', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/transactions')
    await page.waitForURL('**/transactions')
  })

  test('renders page heading', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()
  })
})
