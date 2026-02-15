import { test as base, type Page } from '@playwright/test'
import { clerk } from '@clerk/testing/playwright'

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })
    await clerk.loaded({ page })

    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: process.env.E2E_CLERK_USER_USERNAME!,
        password: process.env.E2E_CLERK_USER_PASSWORD!,
      },
    })

    // clerk.signIn() sets the session but doesn't navigate — go to dashboard explicitly
    await page.goto('/dashboard')
    await page.waitForURL('**/dashboard', { timeout: 15_000 })

    await use(page)
  },
})

export { expect } from '@playwright/test'
