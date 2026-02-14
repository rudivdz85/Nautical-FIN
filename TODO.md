# Fin — Remaining Work

> Generated from full codebase audit. Build passes, 531 tests pass (25 files).
> Backend: 20 service verticals complete. Frontend: 17 pages complete.

---

## Status Overview

| Area | Status | Notes |
|------|--------|-------|
| DB Schema (21 tables) | COMPLETE | All tables, enums, indexes |
| Services (20 files) | COMPLETE | All CRUD + lifecycle methods |
| API Routes (76+) | COMPLETE | All endpoints with auth + logging |
| Types & Validation | COMPLETE | All Zod schemas synced with DB |
| Frontend Pages (17) | COMPLETE | Every nav item has a page |
| Backend Tests (462) | COMPLETE | 100% service coverage |
| Frontend Tests (69) | PARTIAL | 3 of 16 pages tested |
| Chat / AI | PARTIAL | Chat wired; Insights backend-only |
| Import | PARTIAL | CSV only; no auto-categorization |
| Error/Loading UX | MISSING | No error boundaries, loading states, or 404 |
| Onboarding | PARTIAL | No default category seeding |

---

## Priority 1 — Core Gaps (Production Blockers)

### 1.1 Default Category Seeding on Onboarding
**Impact:** Users start with zero categories, making budgets/actuals/categorization impossible.
**Files:** `apps/web/src/app/(onboarding)/onboarding-page-client.tsx`, `packages/core/src/services/categories.service.ts`
**Work:**
- Add step to onboarding that seeds default expense/income categories
- Default categories already defined in `packages/core/src/services/default-categories.ts`
- Call `categoriesService.seedDefaults(db, userId)` (needs new method) at onboarding completion
- Alternatively add to the `complete-onboarding` API endpoint

### 1.2 Auto-Categorization on Import
**Impact:** Imported transactions all land as uncategorized — users must manually categorize hundreds of rows.
**Files:** `packages/core/src/services/statement-imports.service.ts`
**Work:**
- After creating each transaction, run categorization rules matching
- Apply merchant normalization via `merchantMappingsService`
- Apply rule-based categorization via `categorizationRulesService`
- Set `categoryId`, `categorizationMethod`, `merchantNormalized` on matched transactions

### 1.3 Error Boundaries & 404 Page
**Impact:** Any server error shows a white screen. Invalid routes have no feedback.
**Files:** New files in `apps/web/src/app/`
**Work:**
- Add `apps/web/src/app/not-found.tsx` — global 404 page
- Add `apps/web/src/app/(auth)/error.tsx` — error boundary for auth layout
- Add `apps/web/src/app/error.tsx` — root error boundary

### 1.4 Dynamic Task Bell Badge
**Impact:** Header task icon always shows "0" — misleading when tasks exist.
**Files:** `apps/web/src/components/app-header.tsx`
**Work:**
- Fetch pending task count server-side in `(auth)/layout.tsx`
- Pass count as prop or use a lightweight API call
- Display actual count in the TaskBell badge

---

## Priority 2 — Feature Completion

### 2.1 AI Insights Dashboard Widget
**Impact:** Full backend exists (service, API, DB) but nothing displays insights to users.
**Files:** `apps/web/src/app/(auth)/dashboard/dashboard-page-client.tsx`
**Work:**
- Add "Insights" card to dashboard showing unread AI insights
- Wire to `GET /api/ai-insights?unread=true`
- Add mark-as-read and dismiss actions
- Optional: dedicated `/insights` page for full history

### 2.2 AI Insight Auto-Generation
**Impact:** Insights only exist if manually created via API — no automated financial analysis.
**Files:** New service method or scheduled job
**Work:**
- Add `generateInsights(db, userId)` to `aiInsightsService`
- Analyze: budget vs actual variance, unusual spending patterns, savings milestones, debt progress
- Trigger: on month-end close, budget activation, or via manual "Analyze" button
- Use Anthropic API (already installed) to generate insight text

### 2.3 Chat Tool Definitions (Function Calling)
**Impact:** Chat is conversational only — cannot take actions on behalf of the user.
**Files:** `apps/web/src/app/api/chat/route.ts`
**Work:**
- Add Vercel AI SDK tool definitions for common actions:
  - `getAccountBalances`, `getRecentTransactions`, `getBudgetSummary`
  - `createTask`, `markTaskComplete`
  - `getSpendingByCategory`
- Enables "What did I spend on groceries?" or "Create a task to fund my emergency account"

### 2.4 Import Format Expansion (OFX/QFX)
**Impact:** Most SA banks export OFX/QFX — CSV requires manual column mapping.
**Files:** `apps/web/src/app/(auth)/import/import-page-client.tsx`, new parser files
**Work:**
- Add `ofx-js` or similar library for OFX/QFX parsing
- Auto-detect file type from extension/content
- OFX has standardized fields — no column mapping needed
- PDF/XLS are lower priority (complex, bank-specific)

### 2.5 Loading States (Skeleton Loaders)
**Impact:** Pages show nothing until server data loads — poor perceived performance.
**Files:** New `loading.tsx` files per route
**Work:**
- Add `apps/web/src/app/(auth)/dashboard/loading.tsx` with skeleton cards
- Add `loading.tsx` for other data-heavy pages (transactions, budget, actuals)
- Or add Suspense boundaries in `(auth)/layout.tsx`

---

## Priority 3 — Test Coverage

### 3.1 Frontend Page Tests (13 pages untested)
**Impact:** No regression safety for UI. Existing 3 tested pages show good patterns to follow.

| Page | Complexity | Priority |
|------|-----------|----------|
| accounts | Medium (CRUD table + form) | High |
| transactions | High (filters + table + form) | High |
| budget | High (detail sheet + sub-entities) | High |
| categories | Medium (nested tree + form) | Medium |
| debts | Medium (CRUD + detail sheet) | Medium |
| savings | Medium (CRUD + contributions) | Medium |
| actuals | High (3-section detail sheet) | Medium |
| incomes | Low (CRUD table + confirm) | Medium |
| tasks | Medium (lifecycle actions + filter) | Medium |
| recurring | Medium (CRUD + generate/skip) | Low |
| import | High (multi-step wizard) | Low |
| chat | Medium (useChat hook) | Low |
| settings | Low (form + toggles) | Low |

**Work per page:** ~50-100 lines following existing patterns:
- Render with mock data, check empty state
- Render with data, check table/cards
- Test key interactions (open form, submit, delete)

---

## Priority 4 — Polish & Quality of Life

### 4.1 In-App Notification Center
**Impact:** Settings has notification toggles but no notification system exists.
**Work:** Add notification persistence, notification bell dropdown, mark-as-read

### 4.2 Bulk Categorization UI
**Impact:** After import, users need to categorize many transactions at once.
**Work:** Add multi-select to transactions table, apply category to selection

### 4.3 Budget vs Actual Auto-Populate
**Impact:** Starting a month-end review requires manual category entry.
**Work:** Pre-populate actual categories from the month's budget items

### 4.4 Recurring Transaction Auto-Generation
**Impact:** Recurring transactions exist but don't auto-create on schedule.
**Work:** Scheduled job or on-login check to generate pending recurring transactions

### 4.5 Balance Reconciliation Checks
**Impact:** Import stores opening/closing balances but never validates them.
**Work:** After import, compare computed balance vs stated closing balance, warn on mismatch

---

## File Counts

| Directory | Files |
|-----------|-------|
| `packages/core/src/services/` | 21 |
| `packages/core/src/repositories/` | 21 |
| `packages/core/src/types/` | 17 |
| `packages/core/src/validation/` | 16 |
| `packages/testing/src/factories/` | 23 |
| `apps/web/src/app/api/` | 76+ route files |
| `apps/web/src/app/(auth)/` | 17 page directories |
| `__tests__/core/services/` | 20 test files (462 tests) |
| `__tests__/web/` | 5 test files (69 tests) |
