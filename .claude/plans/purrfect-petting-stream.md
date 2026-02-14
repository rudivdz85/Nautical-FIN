# Frontend Tests — Implementation Plan

## Context
The project has 461 backend service tests but zero frontend testing infrastructure. No vitest config for web, no @testing-library/react, no jsdom. We need to set up the infrastructure and write tests for utility functions, the API client, and representative page components.

## Approach: Vitest Workspace

Use `vitest.workspace.ts` to define two projects (backend: node, frontend: jsdom) so `pnpm test` runs both in parallel with a single command. The existing `vitest.config.ts` is replaced.

## Implementation Steps

### Step 1: Install dependencies
```bash
pnpm add -Dw @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/react @types/react-dom
```

### Step 2: Create `vitest.workspace.ts` (replaces `vitest.config.ts`)
Two workspace projects:
- **backend** — `environment: 'node'`, `include: ['__tests__/core/**/*.test.ts']`, existing aliases
- **frontend** — `environment: 'jsdom'`, `include: ['__tests__/web/**/*.test.{ts,tsx}']`, `@` alias → `apps/web/src`, plus `@fin/core` aliases, setup file for jest-dom matchers

### Step 3: Create `__tests__/web/setup.ts`
Single line: `import '@testing-library/jest-dom/vitest'` to register `.toBeInTheDocument()` etc.

### Step 4: Verify backend tests still pass
Run `pnpm test` — all 461 backend tests must pass before proceeding.

### Step 5: Format utility tests (`__tests__/web/lib/format.test.ts`)
~30 tests for all 13 pure functions in `apps/web/src/lib/format.ts`:
- `formatCurrency` — number, string, zero, negative, custom currency
- `formatDate` — valid date, null, undefined
- `formatDebtType`, `formatGoalType`, `formatTransactionType`, `formatTransactionSource`, `formatBudgetStatus`, `formatFrequency`, `formatAccountType` — known labels + fallback
- `getWeekRange` — Wednesday, Sunday, Monday inputs
- `formatWeekday`, `formatShortDate` — basic formatting
- `formatMonth` — month/year formatting

### Step 6: API client tests (`__tests__/web/lib/api-client.test.ts`)
~12 tests mocking `globalThis.fetch` via `vi.stubGlobal`:
- `apiClient.get` — success extracts `.data`, error throws `ApiError`
- `apiClient.post` — correct method + body, error handling
- `apiClient.patch` — correct method + body
- `apiClient.delete` — correct method, no body
- `ApiError` class — constructor sets code/message/status/name

### Step 7: Dashboard component tests (`__tests__/web/app/dashboard/dashboard-page-client.test.tsx`)
~10 tests. Props-only component (no fetching), simplest to test.
- Renders all 4 metric cards (net worth, available, savings, debt)
- Active budget section vs "No active budget" empty state
- Recent transactions list vs empty state
- Savings goals with progress bars vs empty state
- Pending tasks with action buttons vs empty state

Mocks needed: `next/navigation`, `next/link`, `sonner`, `@/lib/api-client`

### Step 8: Help/FAQ component tests (`__tests__/web/app/help/help-page-client.test.tsx`)
~8 tests. Good for testing user interaction (search + filter).
- Renders default FAQs when DB returns empty
- Search input filters questions by text
- Category badge filters by category
- Clearing search restores all items
- Empty search result message

Mocks needed: `next/navigation`, `next/link`

### Step 9: Tracker component tests (`__tests__/web/app/tracker/tracker-page-client.test.tsx`)
~8 tests. Tests async data fetching and navigation.
- Loading state on mount
- Empty state when API returns []
- Renders week table with entry data
- Payday badge appears for isPayday entries
- Summary cards show correct totals

Mocks needed: `next/navigation`, `sonner`, `@/lib/api-client`, `@/lib/format` (partial — getWeekRange)

### Step 10: Build and verify
`pnpm build && pnpm test` — all tests pass.

## Files Summary

**New files (6):**
- `vitest.workspace.ts`
- `__tests__/web/setup.ts`
- `__tests__/web/lib/format.test.ts`
- `__tests__/web/lib/api-client.test.ts`
- `__tests__/web/app/dashboard/dashboard-page-client.test.tsx`
- `__tests__/web/app/help/help-page-client.test.tsx`
- `__tests__/web/app/tracker/tracker-page-client.test.tsx`

**Modified files (1):**
- `package.json` — add devDependencies, add `test:backend`/`test:frontend` scripts

**Removed files (1):**
- `vitest.config.ts` — replaced by workspace

**Key source files under test:**
- `apps/web/src/lib/format.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/app/(auth)/dashboard/dashboard-page-client.tsx`
- `apps/web/src/app/(auth)/help/help-page-client.tsx`
- `apps/web/src/app/(auth)/tracker/tracker-page-client.tsx`

## Estimated new tests: ~68
## Total after: ~529 tests (461 backend + 68 frontend)
