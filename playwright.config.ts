import { defineConfig, devices } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// Load env vars from the web app's .env.local (Clerk keys, test credentials)
const envPath = path.resolve(__dirname, 'apps/web/.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2]
    }
  }
}

// @clerk/testing expects CLERK_PUBLISHABLE_KEY (without NEXT_PUBLIC_ prefix)
if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
}

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 60_000,

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  ...(process.env.CI
    ? {
        webServer: {
          command: 'pnpm --filter @fin/web dev',
          url: 'http://localhost:3000',
          reuseExistingServer: false,
          timeout: 120_000,
        },
      }
    : {}),
})
