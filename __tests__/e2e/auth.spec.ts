import { test, expect } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'

test.describe('unauthenticated access', () => {
  test('root redirects to sign-in', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/')
    await page.waitForURL('**/sign-in**', { timeout: 15_000 })
    expect(page.url()).toContain('/sign-in')
  })

  test('protected route redirects to sign-in', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/accounts')
    await page.waitForURL('**/sign-in**', { timeout: 15_000 })
    expect(page.url()).toContain('/sign-in')
  })

  test('sign-in page renders Clerk widget', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/sign-in')
    await expect(page.locator('.cl-signIn-root')).toBeVisible({ timeout: 15_000 })
  })
})
