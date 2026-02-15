import { test, expect } from './fixtures'

test.describe('dashboard', () => {
  test('renders page heading and metric cards', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('Net Worth', { exact: true })).toBeVisible()
    await expect(page.getByText('Available to Spend', { exact: true })).toBeVisible()
    await expect(page.getByText('Total Savings', { exact: true })).toBeVisible()
    await expect(page.getByText('Total Debt', { exact: true })).toBeVisible()
  })

  test('renders action buttons', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('button', { name: /Snapshot/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Analyze/ })).toBeVisible()
  })

  test('renders budget section', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Monthly Budget', { exact: true })).toBeVisible()
  })

  test('renders recent transactions section', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Recent Transactions', { exact: true })).toBeVisible()
  })

  test('renders savings goals section', async ({ authenticatedPage: page }) => {
    const main = page.locator('main')
    await expect(main.getByText('Savings Goals', { exact: true })).toBeVisible()
  })

  test('renders tasks section', async ({ authenticatedPage: page }) => {
    const main = page.locator('main')
    await expect(main.getByText('Tasks', { exact: true })).toBeVisible()
  })
})
