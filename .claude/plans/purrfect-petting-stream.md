# Dashboard Page — Implementation Plan

## Context
The Dashboard is the landing page — the user's financial overview at a glance. It's the final frontend page (12/12). All backend services are already built. The dashboard pulls data from multiple services server-side and renders summary cards, a tasks list, and quick-glance widgets.

## Architecture

Pure server component fetches all data via `Promise.all()`, passes to a client component for interactivity (task dismissal). No client-side data fetching needed — everything renders on initial load and refreshes with `router.refresh()`.

## Dashboard Widgets (from solution doc)

**Row 1 — Key Metrics (4 cards)**:
1. **Net Worth** — From `netWorthSnapshotsService.getLatest()`, fallback to manual calc (sum of account balances minus debts)
2. **Available to Spend** — Sum of spending-classified account balances (`classification === 'spending'`)
3. **Total Savings** — From latest snapshot or sum of savings account balances
4. **Total Debt** — Sum of active debt `currentBalance`

**Row 2 — Budget & Activity (2 wider cards)**:
5. **Monthly Budget** — Active budget summary: planned income, planned expenses, unallocated. If no active budget, show "No active budget" with link.
6. **Recent Transactions** — Last 5 transactions with type badges.

**Row 3 — Goals & Tasks (2 wider cards)**:
7. **Savings Goals** — Active goals with progress bars (currentAmount/targetAmount).
8. **Pending Tasks** — List of pending/snoozed tasks with priority badges and dismiss/complete actions.

## Implementation Steps

### Step 1: Server Component (`page.tsx`)
Fetch all data in parallel:
```
const [accounts, latestSnapshot, budgets, debts, savingsGoals, tasks, recentTransactions] = await Promise.all([
  accountsService.list(db, user.id),
  netWorthSnapshotsService.getLatest(db, user.id),
  budgetsService.list(db, user.id),
  debtsService.list(db, user.id),
  savingsGoalsService.list(db, user.id),
  tasksService.list(db, user.id, ['pending', 'snoozed']),
  transactionsService.list(db, user.id, { /* last 5 */ }),
])
```
Compute derived values server-side (net worth, available spend, totals) and pass to client.

### Step 2: Dashboard Page Client (`dashboard-page-client.tsx`)

**Props**: All fetched data + pre-computed summaries.

**Layout**: Responsive grid using CSS grid.
- Row 1: `grid-cols-4` — 4 metric cards
- Row 2: `grid-cols-2` — Budget summary + Recent transactions
- Row 3: `grid-cols-2` — Savings goals + Tasks

**Metric cards**: Use existing `Card` component. Each shows label, value (formatted with `formatCurrency`), and an icon.

**Budget card**: Status badge, income/expenses/unallocated with progress-style layout. Link to /budget.

**Recent transactions**: Mini table (last 5) with type badge, description, amount. Link to /transactions.

**Savings goals card**: Progress bars with percentage. Link to /savings.

**Tasks card**: List with priority badges (high=destructive, medium=default, low=secondary), dismiss/complete via `apiClient.patch`. Uses `router.refresh()` after action.

### Step 3: Build & Verify
- `pnpm build` passes
- `pnpm test` passes (451 tests)

## Files Summary

**New files (1)**:
- `apps/web/src/app/(auth)/dashboard/dashboard-page-client.tsx`

**Modified files (1)**:
- `apps/web/src/app/(auth)/dashboard/page.tsx` — placeholder → server component

**Key reference files**:
- `packages/core/src/services/net-worth-snapshots.service.ts` — getLatest
- `packages/core/src/services/tasks.service.ts` — list with status filter
- `packages/core/src/services/budgets.service.ts` — list (find active)
- `packages/core/src/services/debts.service.ts` — list
- `packages/core/src/services/savings-goals.service.ts` — list
- `packages/core/src/services/accounts.service.ts` — list
- `packages/core/src/services/transactions.service.ts` — list with filters
- `apps/web/src/lib/format.ts` — formatCurrency, formatDate, formatMonth, etc.
