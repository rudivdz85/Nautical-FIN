import { test, expect } from './fixtures'

test.describe('accounts page', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/accounts')
    await page.waitForURL('**/accounts')
  })

  test('renders page heading', async ({ authenticatedPage: page }) => {
    await expect(page.locator('h1', { hasText: 'Accounts' })).toBeVisible()
    await expect(page.getByText('Manage your bank accounts and wallets.')).toBeVisible()
  })

  test('shows Add Account button', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('button', { name: /Add Account/ })).toBeVisible()
  })
})
