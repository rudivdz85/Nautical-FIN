import { test, expect } from './fixtures'

test.describe('settings page', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/settings')
    await page.waitForURL('**/settings')
  })

  test('renders page heading', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })

  test('displays appearance section', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Appearance')).toBeVisible()
  })

  test('displays currency setting', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Currency')).toBeVisible()
  })
})
