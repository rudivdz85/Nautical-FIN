# Fin Backend API Architecture

A comprehensive reference for the backend architecture of Fin, a personal finance management application built for the South African market with plans for global expansion.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Clean Architecture](#3-clean-architecture)
   - 3.1 [Request Lifecycle](#31-request-lifecycle)
   - 3.2 [Route Layer](#32-route-layer)
   - 3.3 [Service Layer](#33-service-layer)
   - 3.4 [Repository Layer](#34-repository-layer)
   - 3.5 [Database Layer](#35-database-layer)
4. [Authentication and Authorization](#4-authentication-and-authorization)
5. [Error Handling](#5-error-handling)
6. [Response Format](#6-response-format)
7. [Validation](#7-validation)
8. [Observability and Logging](#8-observability-and-logging)
9. [Database Schema Overview](#9-database-schema-overview)
10. [API Reference: All 20 Feature Verticals](#10-api-reference-all-20-feature-verticals)
    - 10.1 [Accounts](#101-accounts)
    - 10.2 [Users and Onboarding](#102-users-and-onboarding)
    - 10.3 [Categories](#103-categories)
    - 10.4 [Transactions](#104-transactions)
    - 10.5 [Recurring Transactions](#105-recurring-transactions)
    - 10.6 [Budgets](#106-budgets)
    - 10.7 [Statement Imports](#107-statement-imports)
    - 10.8 [Incomes](#108-incomes)
    - 10.9 [Debts and Debt Payments](#109-debts-and-debt-payments)
    - 10.10 [Savings Goals and Contributions](#1010-savings-goals-and-contributions)
    - 10.11 [Actuals and Retro](#1011-actuals-and-retro)
    - 10.12 [Tasks](#1012-tasks)
    - 10.13 [Categorization Rules](#1013-categorization-rules)
    - 10.14 [Merchant Mappings](#1014-merchant-mappings)
    - 10.15 [Duplicate Rules](#1015-duplicate-rules)
    - 10.16 [Net Worth Snapshots](#1016-net-worth-snapshots)
    - 10.17 [Daily Tracker Cache](#1017-daily-tracker-cache)
    - 10.18 [Chat Messages](#1018-chat-messages)
    - 10.19 [FAQ Items](#1019-faq-items)
    - 10.20 [AI Insights](#1020-ai-insights)
11. [Test Architecture](#11-test-architecture)
    - 11.1 [Current State: Service-Layer Unit Tests](#111-current-state-service-layer-unit-tests)
    - 11.2 [Test Infrastructure](#112-test-infrastructure)
    - 11.3 [Test Coverage by Feature](#113-test-coverage-by-feature)
    - 11.4 [How Tests Scale: The Testing Pyramid](#114-how-tests-scale-the-testing-pyramid)
12. [Technical Decisions and Gotchas](#12-technical-decisions-and-gotchas)
13. [Coding Standards](#13-coding-standards)

---

## 1. System Overview

Fin is a personal finance management application designed with a South Africa-first approach (ZAR defaults, local bank support, SA-relevant financial concepts like salaried vs. variable income) with a clear path to global expansion.

**Technology stack:**

| Concern            | Technology                        |
|--------------------|-----------------------------------|
| Runtime            | Node.js (Next.js 15 App Router)   |
| Language           | TypeScript (strict mode)          |
| Package Manager    | pnpm (monorepo with workspaces)   |
| Build Orchestration| Turborepo                         |
| Authentication     | Clerk (webhooks + JWT middleware)  |
| Database           | Neon Postgres (serverless)        |
| ORM                | Drizzle ORM                       |
| Validation         | Zod                               |
| Logging            | Pino (structured JSON)            |
| AI                 | Vercel AI SDK                     |
| Testing            | Vitest                            |
| Deployment         | Vercel                            |

**Platform roadmap:** The API currently runs in a Next.js web app. Electron (desktop) and React Native/Expo (mobile) clients will be added in the future, consuming the same API.

---

## 2. Monorepo Structure

```
fin/
  apps/
    web/                          # Next.js 15 application
      src/
        app/
          api/                    # All API route handlers (70+ route files)
            accounts/
            budgets/
            transactions/
            ...
        lib/
          auth.ts                 # getAuthenticatedUser()
          db.ts                   # Lazy-initialized Proxy DB client
          api-error.ts            # handleApiError() utility
  packages/
    core/                         # Business logic (zero framework dependencies)
      src/
        db/
          schema.ts               # Drizzle ORM schema (24 tables, 20+ enums)
        errors/
          index.ts                # AppError hierarchy
        repositories/             # Data access layer (20+ repository files)
        services/                 # Business logic layer (20 service files)
        types/                    # TypeScript type definitions per feature
        validation/               # Zod schemas per feature
        utils/
          index.ts                # successResponse(), errorResponse()
    logger/                       # Pino logger + WideEvent class
      src/
        logger.ts                 # Pino instance (pretty in dev, JSON in prod)
        wide-event.ts             # Structured wide event logging
    testing/                      # Test utilities
      src/
        factories/                # 20 factory files for test data generation
  __tests__/                      # All test files (mirrors packages/core structure)
    core/
      services/                   # 20 service test files, 451 tests total
```

Each package is self-contained. The `core` package has no dependency on Next.js, Clerk, or any web framework, making it portable to other runtimes (Electron, React Native, standalone server) without modification.

---

## 3. Clean Architecture

### 3.1 Request Lifecycle

Every API request follows this deterministic flow:

```
HTTP Request
    |
    v
[Next.js Route Handler]  -- apps/web/src/app/api/**/route.ts
    |  Creates WideEvent for structured logging
    |  Authenticates via getAuthenticatedUser()
    |  Parses query params / request body
    |
    v
[Service Layer]           -- packages/core/src/services/*.service.ts
    |  Validates input with Zod (input always typed as `unknown`)
    |  Enforces business rules
    |  Orchestrates repository calls
    |  Throws AppError subclasses on failure
    |
    v
[Repository Layer]        -- packages/core/src/repositories/*.repository.ts
    |  Pure data access (Drizzle ORM queries)
    |  No business logic, no validation
    |  Returns typed entities or undefined
    |
    v
[Neon Postgres]           -- Serverless connection via @neondatabase/serverless
```

### 3.2 Route Layer

Route handlers live in `apps/web/src/app/api/` and use the Next.js 15 App Router file-based routing convention. Each route file exports named functions matching HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

**Responsibilities:**
- Create a `WideEvent` instance and set the request context
- Authenticate the user via `getAuthenticatedUser()`
- Parse URL search params or request body
- Delegate to the appropriate service method
- Return a JSON response via `NextResponse.json(successResponse(data))`
- Catch all errors via `handleApiError(error, event)`

**Dynamic route params** use Next.js 15's async params pattern:

```typescript
type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  // ...
}
```

**Canonical route handler pattern:**

```typescript
export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/accounts',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_account' })

    event.incrementDbQuery()
    const account = await accountsService.create(db, user.id, body)

    event.addMetadata({ accountId: account.id, accountType: account.accountType })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(account), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
```

### 3.3 Service Layer

Services are plain object literals (not classes) exported from `packages/core/src/services/`. They contain all business logic and are the boundary of validation.

**Key design rules:**

1. **Input is always `unknown`.** Service methods never trust the caller. All input is validated internally using Zod schemas, ensuring the service layer works identically whether called from a route handler, a webhook, a CLI tool, or a test.

2. **Database is injected.** Every method receives a `Database` parameter (typed as `NeonHttpDatabase`), making services testable with mock databases.

3. **Errors are domain errors.** Services throw `AppError` subclasses, never HTTP-specific constructs.

```typescript
export const accountsService = {
  async create(db: Database, userId: string, input: unknown): Promise<Account> {
    const parsed = createAccountSchema.safeParse(input)
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) fieldErrors[path] = []
        fieldErrors[path].push(issue.message)
      }
      throw new ValidationError('Invalid account data', fieldErrors)
    }

    // Business logic: resolve classification based on account type
    const classification = resolveClassification(data.accountType, data.classification)
    const isFirstAccount = (await accountsRepository.countByUserId(db, userId)) === 0

    return accountsRepository.create(db, { userId, ...data, classification, isFirstAccount })
  },
}
```

### 3.4 Repository Layer

Repositories are plain object literals that encapsulate all Drizzle ORM queries. They have no business logic, no validation, and no error interpretation.

**Key design rules:**

1. **Single-table focus.** Each repository maps to one database table. Cross-table queries go in the service that orchestrates them.

2. **Returns raw data.** Repositories return typed entities (`Account`, `Transaction`, etc.) or `undefined` for single-entity lookups. The service decides whether `undefined` is a `NotFoundError`.

3. **Soft deletes where appropriate.** Entities like accounts use `softDelete` (setting `isActive: false`) rather than hard deletes.

```typescript
export const accountsRepository = {
  async findByUserId(db: Database, userId: string): Promise<Account[]> {
    return db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
      .orderBy(accounts.displayOrder)
  },

  async softDelete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .update(accounts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning({ id: accounts.id })
    return results.length > 0
  },
}
```

### 3.5 Database Layer

The database client uses Neon's serverless HTTP driver, specifically typed as `NeonHttpDatabase` (not the generic `PgDatabase`, which causes HKT type mismatches with Drizzle).

**Lazy initialization via Proxy:**

The database connection is wrapped in a `Proxy` to avoid evaluating `DATABASE_URL` at import time. This is critical because Next.js evaluates module-level code during static site generation (SSG) at build time, when environment variables may not be available.

```typescript
let _db: NeonHttpDatabase | undefined

export function getDb(): NeonHttpDatabase {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL environment variable is not set')
    const sql = neon(url)
    _db = drizzle(sql)
  }
  return _db
}

export const db = new Proxy({} as NeonHttpDatabase, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  },
})
```

This pattern means `db` can be imported freely at the module level without triggering a connection. The actual connection is only established when a property of `db` is first accessed at runtime.

---

## 4. Authentication and Authorization

Authentication is handled by Clerk with two distinct flows:

### JWT-Based Request Authentication

Every protected API route calls `getAuthenticatedUser()`, which:

1. Calls Clerk's `auth()` to extract the `clerkId` from the session JWT
2. Looks up the corresponding internal user record in the database
3. Returns an `AuthenticatedUser` object (`{ id, clerkId, email }`) or throws `UnauthorizedError`

```typescript
export interface AuthenticatedUser {
  id: string
  clerkId: string
  email: string
}
```

All subsequent service calls use the internal `user.id` (UUID), never the Clerk ID.

### Webhook-Based User Provisioning

Clerk sends webhook events to `/api/webhooks/clerk` for user lifecycle events. The webhook handler verifies the Svix signature and dispatches to the users service:

| Webhook Event   | Action                                              |
|-----------------|-----------------------------------------------------|
| `user.created`  | Creates user record + subscription + default categories |
| `user.updated`  | Updates email and display name                      |
| `user.deleted`  | Deletes user record (cascading)                     |

### Authorization Model

Authorization is **row-level** and **implicit**: every query filters by `userId`, ensuring users can only access their own data. There is no role-based access control (RBAC) for end users. Admin-only endpoints (like FAQ item creation) require authentication but do not currently enforce an admin role at the database level.

---

## 5. Error Handling

### Error Class Hierarchy

All domain errors extend `AppError`, which provides structured serialization:

```
AppError (base)
  code: string          -- Machine-readable error code
  statusCode: number    -- HTTP status code
  isOperational: boolean -- true for expected errors, false for bugs

  ValidationError (400)
    fieldErrors?: Record<string, string[]>  -- Per-field error messages

  NotFoundError (404)
    Constructed with: resource name + optional id

  UnauthorizedError (401)
    Default message: "Authentication required"

  ForbiddenError (403)
    Default message: "Insufficient permissions"

  ConflictError (409)
    Used for: duplicate resources, invalid state transitions
```

### Error Mapping

The `handleApiError` utility in `apps/web/src/lib/api-error.ts` maps errors to HTTP responses:

| Error Type      | Status | Log Level | Response Body                                |
|-----------------|--------|-----------|----------------------------------------------|
| `AppError`      | Varies | `warn`    | `{ error: { code, message } }` via `toJSON()`|
| Unknown `Error` | 500    | `error`   | `{ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }` |
| Non-Error throw | 500    | `error`   | Same as above                                |

The `handleApiError` function also finalizes the `WideEvent` with the error details, ensuring every request -- success or failure -- produces exactly one structured log entry.

```typescript
export function handleApiError(error: unknown, event: WideEvent): NextResponse {
  if (error instanceof AppError) {
    event.setError({ code: error.code, message: error.message })
    event.finalize(error.statusCode, 'error')
    logger.warn(event.toJSON())
    return NextResponse.json(error.toJSON(), { status: error.statusCode })
  }

  const message = error instanceof Error ? error.message : 'Internal server error'
  event.setError({ code: 'INTERNAL_ERROR', message, stack: error instanceof Error ? error.stack : undefined })
  event.finalize(500, 'error')
  logger.error(event.toJSON())
  return NextResponse.json(errorResponse('INTERNAL_ERROR', 'Internal server error'), { status: 500 })
}
```

---

## 6. Response Format

All API responses follow a consistent envelope format.

### Success Response

```json
{
  "data": { ... }
}
```

For list endpoints, `data` is an array. For single-entity endpoints, `data` is an object.

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid account data"
  }
}
```

### Paginated Response (used by chat messages)

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 142,
    "totalPages": 3
  }
}
```

### TypeScript Interfaces

```typescript
interface ApiSuccessResponse<T> {
  data: T
}

interface ApiErrorResponse {
  error: {
    code: string
    message: string
  }
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
```

---

## 7. Validation

Validation is performed exclusively in the service layer using Zod schemas defined in `packages/core/src/validation/`.

**Each feature has two schemas:**

| Schema          | Purpose                     | Pattern                            |
|-----------------|-----------------------------|------------------------------------|
| `create*Schema` | Full creation validation    | All required fields + optional ones|
| `update*Schema` | Partial update validation   | `.partial()` with at-least-one-field refinement |

**Example (accounts):**

```typescript
export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  accountType: z.enum(['cheque', 'savings', 'credit_card', 'investment', 'loan', 'other']),
  classification: z.enum(['spending', 'non_spending']).optional(),
  institution: z.string().max(100).optional(),
  currency: z.string().length(3).default('ZAR'),
  currentBalance: z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid balance format').default('0'),
  // ...
})

export const updateAccountSchema = createAccountSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' },
)
```

**Validation error aggregation:** When validation fails, the service transforms Zod issues into a `fieldErrors` record before throwing `ValidationError`:

```typescript
const fieldErrors: Record<string, string[]> = {}
for (const issue of parsed.error.issues) {
  const path = issue.path.join('.')
  if (!fieldErrors[path]) fieldErrors[path] = []
  fieldErrors[path].push(issue.message)
}
throw new ValidationError('Invalid account data', fieldErrors)
```

**Monetary values** are validated as strings with a regex pattern (`/^-?\d+(\.\d{1,2})?$/`) and stored as `decimal(15,2)` in Postgres to avoid floating-point precision issues.

---

## 8. Observability and Logging

### Wide Event Pattern

The system uses a "wide event" logging pattern: instead of scattering multiple log calls throughout a request, a single `WideEvent` object accumulates context and is emitted as one structured log entry at the end of the request.

```typescript
class WideEvent {
  constructor(type: string)              // 'api' | 'webhook'
  setRequest(info: RequestInfo): this    // method, path, query
  setUser(info: UserInfo): this          // id, clerkId
  addMetadata(meta: Record<string, unknown>): this
  incrementDbQuery(durationMs?: number): this
  setError(error: { code, message, stack? }): this
  finalize(statusCode: number, status: string): this
  toJSON(): WideEventData
}
```

**Every request produces exactly one log entry** containing:

| Field              | Description                                |
|--------------------|--------------------------------------------|
| `type`             | Event type (`api`, `webhook`)              |
| `startTime`        | Request start timestamp                    |
| `durationMs`       | Total request duration                     |
| `request`          | HTTP method, path, query                   |
| `user`             | Internal user ID, Clerk ID                 |
| `metadata`         | Feature-specific context (entity IDs, counts, actions) |
| `dbQueryCount`     | Number of database queries made            |
| `dbQueryDurationMs`| Total time spent in database queries       |
| `statusCode`       | HTTP response status                       |
| `status`           | `"success"` or `"error"`                   |
| `error`            | Error code, message, stack (on failure only)|

### Pino Logger

```typescript
const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
  // Pretty-printing in development, structured JSON in production
})
```

- Successful requests: `logger.info(event.toJSON())`
- Operational errors (AppError): `logger.warn(event.toJSON())`
- Unexpected errors: `logger.error(event.toJSON())`

---

## 9. Database Schema Overview

The schema is defined in a single file (`packages/core/src/db/schema.ts`) using Drizzle ORM's declarative API. It contains 24 tables with comprehensive indexing.

### Tables and Relationships

```
users
  |-- subscriptions (1:1)
  |-- accounts (1:N)
  |-- categories (1:N, self-referencing via parentId)
  |-- transactions (1:N)
  |     |-- transactionAuditLog (1:N)
  |-- recurringTransactions (1:N)
  |-- incomes (1:N)
  |-- budgets (1:N)
  |     |-- budgetItems (1:N)
  |     |-- budgetIncomes (1:N)
  |     |-- plannedOneOffs (1:N)
  |-- actuals (1:N)
  |     |-- actualCategories (1:N)
  |     |-- accountBalanceConfirmations (1:N)
  |     |-- surplusAllocations (1:N)
  |-- debts (1:N)
  |     |-- debtPayments (1:N)
  |-- savingsGoals (1:N)
  |     |-- savingsContributions (1:N)
  |-- tasks (1:N)
  |-- categorizationRules (1:N)
  |-- statementImports (1:N)
  |-- duplicateRules (1:N)
  |-- merchantMappings (1:N)
  |-- netWorthSnapshots (1:N)
  |-- dailyTrackerCache (1:N)
  |-- chatMessages (1:N)
  |-- aiInsights (1:N)
  faqItems (standalone, no user FK)
```

### Enum Types

| Enum                      | Values                                                          |
|---------------------------|-----------------------------------------------------------------|
| `account_type`            | cheque, savings, credit_card, investment, loan, other           |
| `account_classification`  | spending, non_spending                                          |
| `transaction_type`        | debit, credit, transfer                                         |
| `transaction_source`      | manual, import, bank_sync, recurring                            |
| `category_type`           | income, expense                                                 |
| `recurring_frequency`     | weekly, monthly, yearly                                         |
| `recurring_amount_type`   | fixed, variable                                                 |
| `budget_status`           | draft, active, closed                                           |
| `actual_status`           | open, reconciling, closed                                       |
| `surplus_action`          | rollover, savings, general                                      |
| `debt_type`               | home_loan, vehicle, personal_loan, credit_card, overdraft, store_account, student_loan, other |
| `savings_goal_type`       | emergency, specific, general                                    |
| `task_type`               | retro_reminder, fund_account, balance_low, recurring_failed, variable_recurring_confirm, unconfirmed_income, budget_threshold, unusual_spending, goal_milestone, bill_increase, savings_goal_track, uncategorized_transactions, surplus_action, planned_expense_reminder, planned_expense_warning, custom |
| `task_priority`           | high, medium, low                                               |
| `task_status`             | pending, completed, dismissed, snoozed                          |
| `subscription_tier`       | trial, basic, premium, lifetime                                 |
| `budget_redistribution`   | even, weekly, weighted                                          |
| `import_status`           | processing, completed, failed, partial                          |

### Key Schema Design Decisions

- **UUIDs for all primary keys** (`uuid().primaryKey().defaultRandom()`)
- **Monetary values as `decimal(15,2)`** stored as strings to prevent floating-point errors
- **Soft deletes** on accounts, recurring transactions, incomes, debts, and savings goals (via `isActive` flag)
- **Self-referencing tables** use `AnyPgColumn` return type annotation (categories `parentId`, transactions `parentTransactionId`)
- **Unique constraints** on natural keys: budgets per (user, year, month), actuals per (user, year, month), net worth snapshots per (user, date), daily tracker per (user, date)
- **Cascading deletes** from users to all owned entities
- **Comprehensive indexing** on all foreign keys and common query patterns

---

## 10. API Reference: All 20 Feature Verticals

### 10.1 Accounts

Financial accounts (bank accounts, credit cards, investments, loans).

| Method | Endpoint                   | Description                |
|--------|----------------------------|----------------------------|
| GET    | `/api/accounts`            | List user's accounts       |
| POST   | `/api/accounts`            | Create an account          |
| GET    | `/api/accounts/:id`        | Get account by ID          |
| PUT    | `/api/accounts/:id`        | Update an account          |
| DELETE | `/api/accounts/:id`        | Soft-delete an account     |

**Account types:** cheque, savings, credit_card, investment, loan, other

**Classification logic:** Investment and loan accounts are always `non_spending`. Other types default to their preset classification but can be overridden (e.g., a savings account used for daily spending can be classified as `spending`).

**Special behavior:** The first account created for a user is automatically flagged with `isFirstAccount: true`.

---

### 10.2 Users and Onboarding

User management via Clerk webhooks and preferences.

| Method | Endpoint                        | Description                       |
|--------|---------------------------------|-----------------------------------|
| POST   | `/api/webhooks/clerk`           | Clerk webhook handler             |
| GET    | `/api/users/me`                 | Get current user profile          |
| PUT    | `/api/users/preferences`        | Update user preferences           |
| POST   | `/api/users/complete-onboarding`| Mark onboarding as complete       |

**User preferences** (stored as JSONB):
- `financialMonthStartDay` (default: 25, common SA salary date)
- `defaultCurrency` (default: `ZAR`)
- `theme` (light / dark / system)
- `budgetRedistribution` (even / weekly / weighted)
- `notifications` (inApp, push, desktop, email booleans)

---

### 10.3 Categories

Income and expense categories with hierarchical nesting.

| Method | Endpoint                   | Description                    |
|--------|----------------------------|--------------------------------|
| GET    | `/api/categories`          | List categories (optionally by type) |
| POST   | `/api/categories`          | Create a category              |
| GET    | `/api/categories/:id`      | Get category by ID             |
| PUT    | `/api/categories/:id`      | Update a category              |
| DELETE | `/api/categories/:id`      | Delete a category              |

**Category types:** income, expense

**Default categories** are created automatically during user onboarding via the `default-categories.ts` module.

**Self-referencing:** Categories support a `parentId` for nesting (e.g., "Food" > "Restaurants", "Food" > "Groceries").

---

### 10.4 Transactions

The core financial data entity. Records all money movement.

| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| GET    | `/api/transactions`              | List transactions (with filters) |
| POST   | `/api/transactions`              | Create a transaction           |
| GET    | `/api/transactions/:id`          | Get transaction by ID          |
| PUT    | `/api/transactions/:id`          | Update a transaction           |
| DELETE | `/api/transactions/:id`          | Delete a transaction           |
| POST   | `/api/transactions/transfer`     | Create a transfer (two linked transactions) |

**Query filters** (all optional):

| Parameter    | Type    | Description                                    |
|-------------|---------|------------------------------------------------|
| `accountId` | UUID    | Filter by account                              |
| `categoryId`| UUID    | Filter by category                             |
| `type`      | string  | `debit`, `credit`, or `transfer`               |
| `source`    | string  | `manual`, `import`, `bank_sync`, or `recurring`|
| `startDate` | date    | Transactions on or after this date             |
| `endDate`   | date    | Transactions on or before this date            |
| `isReviewed`| boolean | Filter by reviewed status                      |

**Transaction types:** debit (outflow), credit (inflow), transfer (between accounts)

**Transfer handling:** The `/transfer` endpoint creates two linked transactions (one debit, one credit) with a shared `transferPairId`.

---

### 10.5 Recurring Transactions

Templates for automatically generating transactions on a schedule.

| Method | Endpoint                                        | Description                    |
|--------|-------------------------------------------------|--------------------------------|
| GET    | `/api/recurring-transactions`                   | List recurring transactions    |
| POST   | `/api/recurring-transactions`                   | Create recurring transaction   |
| GET    | `/api/recurring-transactions/:id`               | Get by ID                      |
| PUT    | `/api/recurring-transactions/:id`               | Update                         |
| DELETE | `/api/recurring-transactions/:id`               | Delete                         |
| POST   | `/api/recurring-transactions/:id/generate`      | Generate a transaction instance|
| POST   | `/api/recurring-transactions/:id/skip`          | Skip next occurrence           |

**Frequency types:** weekly, monthly, yearly

**Amount types:** fixed (exact amount every time) or variable (amount provided at generation time, with optional `amountMax` ceiling)

---

### 10.6 Budgets

Monthly budget planning with line items, income projections, and planned one-off expenses.

| Method | Endpoint                                           | Description                     |
|--------|----------------------------------------------------|---------------------------------|
| GET    | `/api/budgets`                                     | List budgets                    |
| POST   | `/api/budgets`                                     | Create budget (year + month)    |
| GET    | `/api/budgets/:id`                                 | Get budget with all children    |
| PUT    | `/api/budgets/:id`                                 | Update budget                   |
| DELETE | `/api/budgets/:id`                                 | Delete budget                   |
| POST   | `/api/budgets/:id/activate`                        | Activate a draft budget         |
| POST   | `/api/budgets/:id/close`                           | Close a budget period           |
| GET    | `/api/budgets/:id/items`                           | List budget items               |
| POST   | `/api/budgets/:id/items`                           | Add a budget item               |
| PUT    | `/api/budgets/:id/items/:itemId`                   | Update a budget item            |
| DELETE | `/api/budgets/:id/items/:itemId`                   | Remove a budget item            |
| GET    | `/api/budgets/:id/incomes`                         | List budget incomes             |
| POST   | `/api/budgets/:id/incomes`                         | Add a budget income             |
| PUT    | `/api/budgets/:id/incomes/:incomeId`               | Update a budget income          |
| DELETE | `/api/budgets/:id/incomes/:incomeId`               | Remove a budget income          |
| GET    | `/api/budgets/:id/planned-one-offs`                | List planned one-offs           |
| POST   | `/api/budgets/:id/planned-one-offs`                | Add a planned one-off           |
| PUT    | `/api/budgets/:id/planned-one-offs/:oneOffId`      | Update a planned one-off        |
| DELETE | `/api/budgets/:id/planned-one-offs/:oneOffId`      | Remove a planned one-off        |

**Budget statuses:** draft -> active -> closed

**Unique constraint:** One budget per user per (year, month).

**Planned one-offs** track large expected expenses (e.g., annual insurance, holiday spending) with reminder settings.

---

### 10.7 Statement Imports

Upload and process bank statements.

| Method | Endpoint                                 | Description                    |
|--------|------------------------------------------|--------------------------------|
| GET    | `/api/statement-imports`                 | List imports                   |
| POST   | `/api/statement-imports`                 | Create an import record        |
| GET    | `/api/statement-imports/:id`             | Get import details             |
| DELETE | `/api/statement-imports/:id`             | Delete an import               |
| POST   | `/api/statement-imports/:id/process`     | Process/parse the statement    |

**Import statuses:** processing -> completed / failed / partial

**Processing** includes bank-specific parsing logic for extracting transactions from different statement formats.

---

### 10.8 Incomes

Expected income sources (salary, freelance, rental, etc.).

| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| GET    | `/api/incomes`                   | List incomes                   |
| POST   | `/api/incomes`                   | Create an income               |
| GET    | `/api/incomes/:id`               | Get income by ID               |
| PUT    | `/api/incomes/:id`               | Update an income               |
| DELETE | `/api/incomes/:id`               | Delete an income               |
| POST   | `/api/incomes/:id/confirm`       | Confirm income received        |

**Frequency types:** weekly, monthly, yearly

**Special fields:** `isPrimarySalary` (used for payday calculations), `confirmationRequiredMonthly` (triggers task if not confirmed), `expectedDay` (day of month).

---

### 10.9 Debts and Debt Payments

Track debts and record payments against them.

| Method | Endpoint                                        | Description                    |
|--------|-------------------------------------------------|--------------------------------|
| GET    | `/api/debts`                                    | List debts                     |
| POST   | `/api/debts`                                    | Create a debt                  |
| GET    | `/api/debts/:id`                                | Get debt by ID                 |
| PUT    | `/api/debts/:id`                                | Update a debt                  |
| DELETE | `/api/debts/:id`                                | Delete a debt                  |
| GET    | `/api/debts/:id/payments`                       | List payments for a debt       |
| POST   | `/api/debts/:id/payments`                       | Record a payment               |
| GET    | `/api/debts/:id/payments/:paymentId`            | Get a specific payment         |
| DELETE | `/api/debts/:id/payments/:paymentId`            | Delete a payment               |

**Debt types:** home_loan, vehicle, personal_loan, credit_card, overdraft, store_account, student_loan, other

**Payment tracking** includes `principalAmount`, `interestAmount`, and `balanceAfter` for amortization visibility.

---

### 10.10 Savings Goals and Contributions

Track savings goals and record contributions toward them.

| Method | Endpoint                                                          | Description                    |
|--------|-------------------------------------------------------------------|--------------------------------|
| GET    | `/api/savings-goals`                                              | List savings goals             |
| POST   | `/api/savings-goals`                                              | Create a savings goal          |
| GET    | `/api/savings-goals/:id`                                          | Get goal by ID                 |
| PUT    | `/api/savings-goals/:id`                                          | Update a goal                  |
| DELETE | `/api/savings-goals/:id`                                          | Delete a goal                  |
| GET    | `/api/savings-goals/:id/contributions`                            | List contributions             |
| POST   | `/api/savings-goals/:id/contributions`                            | Record a contribution          |
| GET    | `/api/savings-goals/:id/contributions/:contributionId`            | Get a specific contribution    |
| DELETE | `/api/savings-goals/:id/contributions/:contributionId`            | Delete a contribution          |

**Goal types:** emergency (months-of-expenses target), specific (fixed amount + target date), general (open-ended)

---

### 10.11 Actuals and Retro

Monthly retrospective tracking. Links actual spending to budgeted amounts for variance analysis.

| Method | Endpoint                                                                    | Description                    |
|--------|-----------------------------------------------------------------------------|--------------------------------|
| GET    | `/api/actuals`                                                              | List actuals periods           |
| POST   | `/api/actuals`                                                              | Create an actuals period       |
| GET    | `/api/actuals/:id`                                                          | Get actuals with all children  |
| PUT    | `/api/actuals/:id`                                                          | Update actuals period          |
| DELETE | `/api/actuals/:id`                                                          | Delete actuals period          |
| POST   | `/api/actuals/:id/close`                                                    | Close an actuals period        |
| POST   | `/api/actuals/:id/reconcile`                                                | Start reconciliation           |
| GET    | `/api/actuals/:id/categories`                                               | List actual categories         |
| POST   | `/api/actuals/:id/categories`                                               | Add an actual category         |
| PUT    | `/api/actuals/:id/categories/:categoryId`                                   | Update an actual category      |
| DELETE | `/api/actuals/:id/categories/:categoryId`                                   | Remove an actual category      |
| GET    | `/api/actuals/:id/balance-confirmations`                                    | List balance confirmations     |
| POST   | `/api/actuals/:id/balance-confirmations`                                    | Add a balance confirmation     |
| PUT    | `/api/actuals/:id/balance-confirmations/:confirmationId`                    | Update a confirmation          |
| POST   | `/api/actuals/:id/balance-confirmations/:confirmationId/confirm`            | Confirm a balance              |
| DELETE | `/api/actuals/:id/balance-confirmations/:confirmationId`                    | Remove a confirmation          |
| GET    | `/api/actuals/:id/surplus-allocations`                                      | List surplus allocations       |
| POST   | `/api/actuals/:id/surplus-allocations`                                      | Add a surplus allocation       |
| PUT    | `/api/actuals/:id/surplus-allocations/:allocationId`                        | Update a surplus allocation    |
| POST   | `/api/actuals/:id/surplus-allocations/:allocationId/action`                 | Execute a surplus action       |
| DELETE | `/api/actuals/:id/surplus-allocations/:allocationId`                        | Remove a surplus allocation    |

**Actuals statuses:** open -> reconciling -> closed

**Surplus actions:** rollover (to next month's budget), savings (to a savings goal), general (unallocated)

---

### 10.12 Tasks

System-generated and custom to-do items for the user.

| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| GET    | `/api/tasks`                     | List tasks (with status filter)|
| POST   | `/api/tasks`                     | Create a task                  |
| GET    | `/api/tasks/:id`                 | Get task by ID                 |
| PUT    | `/api/tasks/:id`                 | Update a task                  |
| DELETE | `/api/tasks/:id`                 | Delete a task                  |
| POST   | `/api/tasks/:id/complete`        | Mark as completed              |
| POST   | `/api/tasks/:id/dismiss`         | Dismiss a task                 |
| POST   | `/api/tasks/:id/snooze`          | Snooze until a given datetime  |
| POST   | `/api/tasks/:id/unsnooze`        | Cancel a snooze                |

**Task types:** 16 system types (retro_reminder, fund_account, balance_low, etc.) plus custom

**Task statuses:** pending, completed, dismissed, snoozed

**Priorities:** high, medium, low

---

### 10.13 Categorization Rules

User-defined rules for automatically categorizing imported or new transactions.

| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| GET    | `/api/categorization-rules`      | List rules                     |
| POST   | `/api/categorization-rules`      | Create a rule                  |
| GET    | `/api/categorization-rules/:id`  | Get rule by ID                 |
| PUT    | `/api/categorization-rules/:id`  | Update a rule                  |
| DELETE | `/api/categorization-rules/:id`  | Delete a rule                  |

**Criteria (at least one required):** `merchantExact`, `merchantPattern`, `descriptionPattern`, `amountMin`, `amountMax`

**Tracking:** `timesApplied` and `timesCorrected` counters for rule effectiveness measurement.

---

### 10.14 Merchant Mappings

Map raw bank merchant names to user-friendly normalized names.

| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| GET    | `/api/merchant-mappings`         | List mappings                  |
| POST   | `/api/merchant-mappings`         | Create a mapping               |
| GET    | `/api/merchant-mappings/:id`     | Get mapping by ID              |
| PUT    | `/api/merchant-mappings/:id`     | Update a mapping               |
| DELETE | `/api/merchant-mappings/:id`     | Delete a mapping               |

**Special operations:** `resolve()` to look up a mapping for a given raw merchant name, duplicate check to prevent creating multiple mappings for the same `originalName`.

**Scope:** Mappings can be per-user or global (`isGlobal`).

---

### 10.15 Duplicate Rules

Rules for handling duplicate transactions during import.

| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| GET    | `/api/duplicate-rules`           | List rules                     |
| POST   | `/api/duplicate-rules`           | Create a rule                  |
| GET    | `/api/duplicate-rules/:id`       | Get rule by ID                 |
| DELETE | `/api/duplicate-rules/:id`       | Delete a rule                  |

**Actions:** allow (let through), skip (silently ignore), flag (mark for review)

**Criteria (at least one required):** `merchantPattern`, `amount`

---

### 10.16 Net Worth Snapshots

Point-in-time snapshots of the user's total financial position.

| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| GET    | `/api/net-worth-snapshots`        | List snapshots                 |
| POST   | `/api/net-worth-snapshots`        | Create a snapshot              |
| GET    | `/api/net-worth-snapshots/latest` | Get most recent snapshot       |
| GET    | `/api/net-worth-snapshots/:id`    | Get snapshot by ID             |
| DELETE | `/api/net-worth-snapshots/:id`    | Delete a snapshot              |

**Immutable:** Snapshots have no update endpoint. To correct a snapshot, delete and recreate it.

**Unique constraint:** One snapshot per user per date.

**Fields:** totalAssets, totalLiabilities, netWorth, totalCashSpend, totalCreditAvailable, totalSavings, totalDebt, plus a `breakdown` JSONB field for per-account details.

---

### 10.17 Daily Tracker Cache

Pre-computed daily financial projections for the forward-looking dashboard.

| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| GET    | `/api/daily-tracker`             | List entries (date range query)|
| POST   | `/api/daily-tracker`             | Create an entry                |
| GET    | `/api/daily-tracker/:id`         | Get entry by ID                |
| PUT    | `/api/daily-tracker/:id`         | Update an entry                |
| DELETE | `/api/daily-tracker/:id`         | Delete an entry                |

**Date range queries:** Supports `startDate` and `endDate` query parameters.

**Unique constraint:** One entry per user per date. Duplicate dates return a `ConflictError`.

**Fields:** expectedIncome, expectedDebtPayments, expectedExpenses, predictedSpend, runningBalance, hasAlerts, isPayday, plus detail JSONB fields.

---

### 10.18 Chat Messages

AI chat conversation history.

| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| GET    | `/api/chat-messages`             | List messages (paginated)      |
| POST   | `/api/chat-messages`             | Create a message               |
| GET    | `/api/chat-messages/:id`         | Get message by ID              |
| DELETE | `/api/chat-messages`             | Clear all chat history         |
| DELETE | `/api/chat-messages/:id`         | Delete a specific message      |

**Pagination:** `limit` (default 50, max 100) and `offset` query parameters.

**Roles:** Messages have a `role` field (user, assistant, system).

**AI metadata:** `intent` (what the user was asking), `entities` (extracted structured data), `actionTaken`, `actionResult`.

---

### 10.19 FAQ Items

Static FAQ content, publicly readable, admin-writable.

| Method | Endpoint                            | Description                    |
|--------|-------------------------------------|--------------------------------|
| GET    | `/api/faq-items`                    | List all FAQ items (public)    |
| POST   | `/api/faq-items`                    | Create FAQ item (admin)        |
| GET    | `/api/faq-items/:id`                | Get FAQ item by ID             |
| PUT    | `/api/faq-items/:id`                | Update FAQ item (admin)        |
| DELETE | `/api/faq-items/:id`                | Delete FAQ item (admin)        |
| GET    | `/api/faq-items/by-slug/:slug`      | Get FAQ item by slug           |

**Public access:** The `GET` list and by-slug endpoints do not require authentication.

**Category filter:** `?category=budgeting` filters FAQ items by category.

**Slug lookup:** Supports SEO-friendly URLs via the `/by-slug/:slug` endpoint.

---

### 10.20 AI Insights

AI-generated financial insights and recommendations.

| Method | Endpoint                              | Description                    |
|--------|---------------------------------------|--------------------------------|
| GET    | `/api/ai-insights`                    | List insights (with filters)   |
| POST   | `/api/ai-insights`                    | Create an insight              |
| GET    | `/api/ai-insights/:id`                | Get insight by ID              |
| DELETE | `/api/ai-insights/:id`                | Delete an insight              |
| POST   | `/api/ai-insights/:id/read`           | Mark as read                   |
| POST   | `/api/ai-insights/:id/dismiss`        | Dismiss an insight             |

**Filtering:** Supports `?unread=true` to get only unread insights.

**Fields:** insightType, title, content, priority, isRead, isDismissed, validUntil, relatedEntityType/Id, metadata.

---

## 11. Test Architecture

### 11.1 Current State: Service-Layer Unit Tests

The project has **20 test files** with **451 tests**, all testing the service layer with mocked repositories. This is the most cost-effective testing layer because:

- Services contain all business logic and validation rules
- Repository mocking isolates tests from database state and network calls
- Tests run in milliseconds, enabling rapid feedback during development
- Every validation path, business rule, and error case is exercisable

**Test pattern:**

```typescript
// 1. Mock the repository module
vi.mock('../../../packages/core/src/repositories/accounts.repository.js', () => ({
  accountsRepository: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    countByUserId: vi.fn(),
  },
}))

// 2. Create a mock database (empty object, never called directly)
const mockDb = {} as Parameters<typeof accountsService.list>[0]

// 3. Test a service method
it('creates a cheque account with spending classification by default', async () => {
  vi.mocked(accountsRepository.countByUserId).mockResolvedValue(0)
  vi.mocked(accountsRepository.create).mockResolvedValue(created)

  const result = await accountsService.create(mockDb, TEST_USER_ID, {
    name: 'My Cheque',
    accountType: 'cheque',
    currency: 'ZAR',
    currentBalance: '1000.50',
  })

  expect(result).toEqual(created)
  expect(accountsRepository.create).toHaveBeenCalledWith(
    mockDb,
    expect.objectContaining({ classification: 'spending', isFirstAccount: true }),
  )
})
```

### 11.2 Test Infrastructure

| Component        | Technology / Location                                    |
|------------------|----------------------------------------------------------|
| Test runner      | Vitest 2.x                                               |
| Configuration    | `vitest.config.ts` at monorepo root                      |
| Test files       | `__tests__/core/services/*.service.test.ts`              |
| Factories        | `packages/testing/src/factories/*.factory.ts`            |
| Coverage         | V8 provider, covers `packages/core/src/**/*.ts`          |
| Path aliases     | Mirrors package aliases (`@fin/core`, `@fin/logger`, etc.) |

**Factory functions** generate realistic test entities for all 20 features. Each factory exports:
- `createTest*()` -- Returns a complete entity object with sensible defaults and overridable fields
- `createTest*Input()` -- Returns a valid creation input matching the Zod schema
- `resetFactoryCounters()` -- Resets the auto-incrementing ID counter

### 11.3 Test Coverage by Feature

| Feature                    | Tests | Key Scenarios Covered                                               |
|----------------------------|-------|---------------------------------------------------------------------|
| Accounts                   | 15    | CRUD, 6 account types, classification defaults/overrides, soft delete, first-account detection |
| Users & Onboarding         | 20    | Webhook creation, preferences update, onboarding completion         |
| Categories                 | 22    | CRUD, expense/income types, default category seeding, hierarchy     |
| Transactions               | 25    | CRUD, transfers (linked pair), filters (account, category, date, type, source, reviewed) |
| Recurring Transactions     | 29    | CRUD, instance generation (fixed/variable amounts), skip, next occurrence updates |
| Budgets                    | 44    | CRUD with items/incomes/one-offs, activate/close state machine, totals calculation |
| Statement Imports          | 19    | Create, process, bank-specific parsing, error handling              |
| Incomes                    | 21    | CRUD, confirm, frequency types, primary salary designation          |
| Debts & Payments           | 31    | Nested CRUD, all 8 debt types, payment recording with principal/interest split |
| Savings Goals & Contributions | 31 | Nested CRUD, all 3 goal types, contribution recording, completion tracking |
| Actuals & Retro            | 31    | Categories, balance confirmations, surplus allocations, close/reconcile workflows |
| Tasks                      | 28    | CRUD, complete/dismiss, snooze/unsnooze, status filtering           |
| Categorization Rules       | 22    | CRUD, at-least-one-criterion validation, recordApplied/recordCorrected |
| Merchant Mappings          | 16    | CRUD, resolve(), duplicate checking                                 |
| Duplicate Rules            | 15    | CRUD, action types (allow/skip/flag), at-least-one-criterion        |
| Net Worth Snapshots        | 13    | Create (immutable), delete, unique-per-date, latest endpoint        |
| Daily Tracker Cache        | 16    | Date range queries, duplicate date check                            |
| Chat Messages              | 16    | Paginated list (default 50, max 100), clear history                 |
| FAQ Items                  | 19    | Public read, slug lookup, category filter, admin write              |
| AI Insights                | 18    | CRUD, mark as read, dismiss, unread filter                          |

### 11.4 How Tests Scale: The Testing Pyramid

The current test suite sits at the **unit test** level of the testing pyramid. Here is the planned progression:

```
                    /\
                   /  \
                  / E2E \          End-to-end tests
                 /--------\        (Playwright)
                / API Tests \      HTTP layer tests
               /--------------\    (supertest or similar)
              / Integration     \  Real database tests
             /--------------------\(test containers)
            /    Unit Tests (NOW)   \
           /--------------------------\
          /  451 tests, 20 service files \
         /________________________________\
```

**Level 1 -- Unit Tests (current, 451 tests)**

These test the service layer with mocked repositories. They validate:
- All input validation rules (Zod schema enforcement)
- Business logic (classification defaults, state machine transitions, calculations)
- Error handling (NotFoundError, ValidationError, ConflictError for each scenario)
- Data transformation (how service input maps to repository calls)

Strengths: Fast (sub-second full suite), deterministic, no infrastructure dependencies.

Limitations: Do not verify SQL queries, database constraints, or query correctness. A service could pass a test but generate invalid SQL in production.

**Level 2 -- Integration Tests (next phase)**

Integration tests will use a real Postgres instance to verify that repositories produce correct SQL and that database constraints (unique, foreign key, cascading deletes) work as expected.

Approach options:
- **Test containers:** Spin up a Postgres container per test run via `testcontainers`. Provides full isolation but requires Docker.
- **Dedicated test database:** Use a Neon branch or local Postgres instance. Faster startup, shared schema.
- **Transaction rollback:** Wrap each test in a transaction and roll back after assertion. Fastest but may miss certain constraint behaviors.

Target scope: Repository methods, multi-table operations, migration verification.

**Level 3 -- API Route Tests**

Test the HTTP layer to verify that route handlers correctly parse requests, pass data to services, and format responses.

Approach: Use a tool like `supertest` or Next.js test utilities to send HTTP requests to the route handlers and assert on status codes, response bodies, and headers.

Target scope:
- Authentication enforcement (401 for unauthenticated requests)
- Query parameter parsing and validation
- Request body handling
- Response envelope format (`{ data }` vs `{ error }`)
- HTTP status codes for each error type
- Content-Type headers

**Level 4 -- End-to-End Tests**

Full-stack tests using Playwright that exercise the complete request flow from browser to database and back.

Target scope:
- Critical user journeys (onboarding, creating first account, making a budget, recording a transaction)
- Multi-step workflows (create budget -> activate -> create actuals -> reconcile -> close)
- Cross-feature interactions (creating a transaction updates the account balance, confirming income creates a task)

**Level 5 -- Performance Tests**

Load testing for critical paths to identify bottlenecks before they affect users.

Target scope:
- Transaction list with complex filters under high data volume
- Budget retrieval with all nested children
- Daily tracker cache computation
- Concurrent writes (multiple imports, bulk transaction creation)

Tools: k6, Artillery, or autocannon for HTTP load testing. Database-level benchmarks using pgbench or custom scripts.

Key metrics: P50/P95/P99 response times, database query counts per request (tracked via WideEvent), connection pool utilization, error rate under load.

---

## 12. Technical Decisions and Gotchas

### NeonHttpDatabase vs PgDatabase

Drizzle ORM's generic `PgDatabase` type uses Higher-Kinded Types (HKT) that do not match the concrete `NeonHttpDatabase` type from `drizzle-orm/neon-http`. All services and repositories type the database parameter as `NeonHttpDatabase` to avoid type errors:

```typescript
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
type Database = NeonHttpDatabase
```

### Lazy DB Initialization

Next.js evaluates module-level code during SSG/build. A directly instantiated database connection would fail during `next build` because `DATABASE_URL` is not available. The Proxy-based lazy initialization pattern defers the connection to the first runtime access.

### No .js Extensions in Imports

TypeScript's `moduleResolution: "bundler"` setting combined with Next.js webpack bundling means `.js` extensions in imports are not used. This differs from pure Node.js ESM projects.

### Self-Referencing Tables

Tables that reference themselves (categories via `parentId`, transactions via `parentTransactionId`) require the `AnyPgColumn` return type annotation:

```typescript
parentId: uuid('parent_id').references((): AnyPgColumn => categories.id)
```

### Monetary Precision

All monetary values are stored as `decimal(15,2)` in Postgres and transmitted as strings in the API. This prevents JavaScript floating-point arithmetic issues that can cause rounding errors in financial calculations.

### ClerkProvider Conditional Rendering

The `ClerkProvider` is conditionally rendered in the web app to avoid errors during build when the Clerk publishable key is not available.

### verbatimModuleSyntax

The `verbatimModuleSyntax` TypeScript option conflicts with Next.js. The project uses `esModuleInterop` instead.

---

## 13. Coding Standards

| Rule                        | Standard                                                 |
|-----------------------------|----------------------------------------------------------|
| TypeScript strictness       | Strict mode, no `any` keyword                            |
| File naming                 | kebab-case (`accounts.service.ts`, `wide-event.ts`)      |
| Variable naming             | camelCase                                                |
| Type naming                 | PascalCase (`Account`, `CreateAccountInput`)             |
| Comments                    | Only on complex logic; code should be self-documenting   |
| Logging                     | One wide event log per request, never multiple log calls |
| Error handling              | AppError subclasses for all domain errors                |
| Validation boundary         | Service layer only (input typed as `unknown`)            |
| Test location               | `__tests__/` at monorepo root, mirroring source structure|
| Dependencies                | Services depend on repositories, never the reverse       |
| Database access             | Only through repository layer, never directly in services or routes |
| Soft deletes                | Preferred over hard deletes for user-facing entities     |
| Monetary values             | `decimal(15,2)` in DB, string in API/TypeScript          |
