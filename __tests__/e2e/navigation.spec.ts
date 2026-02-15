import { test, expect } from './fixtures'

test.describe.configure({ mode: 'serial' })

const routes = [
  { navTitle: 'Dashboard', path: '/dashboard', heading: 'Dashboard' },
  { navTitle: 'Daily Tracker', path: '/tracker', heading: 'Daily Tracker' },
  { navTitle: 'Transactions', path: '/transactions', heading: 'Transactions' },
  { navTitle: 'Budget', path: '/budget', heading: 'Budget' },
  { navTitle: 'Actuals', path: '/actuals', heading: 'Actuals & Retro' },
  { navTitle: 'Chat', path: '/chat', heading: 'Chat' },
  { navTitle: 'Accounts', path: '/accounts', heading: 'Accounts' },
  { navTitle: 'Incomes', path: '/incomes', heading: 'Incomes' },
  { navTitle: 'Categories', path: '/categories', heading: 'Categories' },
  { navTitle: 'Recurring', path: '/recurring', heading: 'Recurring Transactions' },
  { navTitle: 'Savings Goals', path: '/savings', heading: 'Savings Goals' },
  { navTitle: 'Debts', path: '/debts', heading: 'Debts' },
  { navTitle: 'Tasks', path: '/tasks', heading: 'Tasks' },
  { navTitle: 'Import', path: '/import', heading: 'Import Statement' },
  { navTitle: 'Help', path: '/help', heading: 'Help & FAQ' },
  { navTitle: 'Settings', path: '/settings', heading: 'Settings' },
]

test.describe('sidebar navigation', () => {
  for (const route of routes) {
    test(`navigates to ${route.navTitle}`, async ({ authenticatedPage: page }) => {
      const sidebar = page.locator('[data-slot="sidebar"]')
      await sidebar.getByRole('link', { name: route.navTitle }).click()
      await page.waitForURL(`**${route.path}`, { timeout: 15_000 })
      expect(page.url()).toContain(route.path)

      await expect(
        page.locator('h1', { hasText: route.heading }),
      ).toBeVisible({ timeout: 10_000 })
    })
  }
})
