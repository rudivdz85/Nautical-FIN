import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  time,
  decimal,
  integer,
  smallint,
  boolean,
  jsonb,
  pgEnum,
  index,
  unique,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================================================
// ENUMS
// ============================================================================

export const accountTypeEnum = pgEnum('account_type', [
  'cheque',
  'savings',
  'credit_card',
  'investment',
  'loan',
  'other',
])

export const accountClassificationEnum = pgEnum('account_classification', [
  'spending',
  'non_spending',
])

export const transactionTypeEnum = pgEnum('transaction_type', ['debit', 'credit', 'transfer'])

export const transactionSourceEnum = pgEnum('transaction_source', [
  'manual',
  'import',
  'bank_sync',
  'recurring',
])

export const categoryTypeEnum = pgEnum('category_type', ['income', 'expense'])

export const recurringFrequencyEnum = pgEnum('recurring_frequency', [
  'weekly',
  'monthly',
  'yearly',
])

export const recurringAmountTypeEnum = pgEnum('recurring_amount_type', ['fixed', 'variable'])

export const budgetStatusEnum = pgEnum('budget_status', ['draft', 'active', 'closed'])

export const actualStatusEnum = pgEnum('actual_status', ['open', 'reconciling', 'closed'])

export const surplusActionEnum = pgEnum('surplus_action', ['rollover', 'savings', 'general'])

export const debtTypeEnum = pgEnum('debt_type', [
  'home_loan',
  'vehicle',
  'personal_loan',
  'credit_card',
  'overdraft',
  'store_account',
  'student_loan',
  'other',
])

export const savingsGoalTypeEnum = pgEnum('savings_goal_type', [
  'emergency',
  'specific',
  'general',
])

export const taskTypeEnum = pgEnum('task_type', [
  'retro_reminder',
  'fund_account',
  'balance_low',
  'recurring_failed',
  'variable_recurring_confirm',
  'unconfirmed_income',
  'budget_threshold',
  'unusual_spending',
  'goal_milestone',
  'bill_increase',
  'savings_goal_track',
  'uncategorized_transactions',
  'surplus_action',
  'planned_expense_reminder',
  'planned_expense_warning',
  'custom',
])

export const taskPriorityEnum = pgEnum('task_priority', ['high', 'medium', 'low'])

export const taskStatusEnum = pgEnum('task_status', ['pending', 'completed', 'dismissed', 'snoozed'])

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'trial',
  'basic',
  'premium',
  'lifetime',
])

export const budgetRedistributionEnum = pgEnum('budget_redistribution', [
  'even',
  'weekly',
  'weighted',
])

export const importStatusEnum = pgEnum('import_status', [
  'processing',
  'completed',
  'failed',
  'partial',
])

// ============================================================================
// USERS
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    displayName: varchar('display_name', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

    preferences: jsonb('preferences')
      .$type<{
        financialMonthStartDay: number
        defaultCurrency: string
        theme: 'light' | 'dark' | 'system'
        budgetRedistribution: 'even' | 'weekly' | 'weighted'
        notifications: {
          inApp: boolean
          push: boolean
          desktop: boolean
          email: boolean
        }
      }>()
      .default({
        financialMonthStartDay: 25,
        defaultCurrency: 'ZAR',
        theme: 'system',
        budgetRedistribution: 'even',
        notifications: {
          inApp: true,
          push: true,
          desktop: true,
          email: false,
        },
      }),

    onboardingCompleted: boolean('onboarding_completed').default(false),
    isSalaried: boolean('is_salaried'),
  },
  (table) => ({
    clerkIdIdx: index('users_clerk_id_idx').on(table.clerkId),
    emailIdx: index('users_email_idx').on(table.email),
  }),
)

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tier: subscriptionTierEnum('tier').notNull().default('trial'),
    trialStartDate: timestamp('trial_start_date', { withTimezone: true }),
    trialEndDate: timestamp('trial_end_date', { withTimezone: true }),
    subscriptionStartDate: timestamp('subscription_start_date', { withTimezone: true }),
    subscriptionEndDate: timestamp('subscription_end_date', { withTimezone: true }),
    isLifetime: boolean('is_lifetime').default(false),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
  }),
)

// ============================================================================
// ACCOUNTS
// ============================================================================

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    accountType: accountTypeEnum('account_type').notNull(),
    classification: accountClassificationEnum('classification').notNull(),
    institution: varchar('institution', { length: 100 }),
    accountNumberMasked: varchar('account_number_masked', { length: 20 }),
    currency: varchar('currency', { length: 3 }).notNull().default('ZAR'),
    currentBalance: decimal('current_balance', { precision: 15, scale: 2 })
      .notNull()
      .default('0'),
    balanceAsOfDate: date('balance_as_of_date'),
    creditLimit: decimal('credit_limit', { precision: 15, scale: 2 }),
    isActive: boolean('is_active').notNull().default(true),
    isFirstAccount: boolean('is_first_account').default(false),
    syncMethod: varchar('sync_method', { length: 20 }).default('manual'),
    bankSyncEnabled: boolean('bank_sync_enabled').default(false),
    bankSyncLastAt: timestamp('bank_sync_last_at', { withTimezone: true }),
    displayOrder: smallint('display_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('accounts_user_id_idx').on(table.userId),
    userActiveIdx: index('accounts_user_active_idx').on(table.userId, table.isActive),
  }),
)

// ============================================================================
// CATEGORIES
// ============================================================================

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    categoryType: categoryTypeEnum('category_type').notNull(),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id),
    icon: varchar('icon', { length: 50 }),
    color: varchar('color', { length: 7 }),
    isSystem: boolean('is_system').notNull().default(false),
    isHidden: boolean('is_hidden').notNull().default(false),
    displayOrder: smallint('display_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('categories_user_id_idx').on(table.userId),
    userTypeIdx: index('categories_user_type_idx').on(table.userId, table.categoryType),
  }),
)

// ============================================================================
// TRANSACTIONS
// ============================================================================

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id),

    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('ZAR'),
    transactionDate: date('transaction_date').notNull(),
    postedDate: date('posted_date'),

    description: varchar('description', { length: 500 }).notNull(),
    merchantOriginal: varchar('merchant_original', { length: 200 }),
    merchantNormalized: varchar('merchant_normalized', { length: 200 }),
    notes: text('notes'),

    transactionType: transactionTypeEnum('transaction_type').notNull(),
    source: transactionSourceEnum('source').notNull().default('manual'),
    externalId: varchar('external_id', { length: 100 }),

    isRecurringInstance: boolean('is_recurring_instance').default(false),
    recurringId: uuid('recurring_id').references(() => recurringTransactions.id),

    transferPairId: uuid('transfer_pair_id'),
    transferToAccountId: uuid('transfer_to_account_id').references(() => accounts.id),

    isSplit: boolean('is_split').default(false),
    parentTransactionId: uuid('parent_transaction_id').references((): AnyPgColumn => transactions.id),

    categorizationConfidence: decimal('categorization_confidence', { precision: 3, scale: 2 }),
    categorizationMethod: varchar('categorization_method', { length: 20 }),
    isAiCategorized: boolean('is_ai_categorized').default(false),
    isReviewed: boolean('is_reviewed').default(false),

    importId: uuid('import_id').references(() => statementImports.id),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userDateIdx: index('transactions_user_date_idx').on(table.userId, table.transactionDate),
    accountIdx: index('transactions_account_idx').on(table.accountId),
    categoryIdx: index('transactions_category_idx').on(table.categoryId),
    userExternalIdx: index('transactions_user_external_idx').on(table.userId, table.externalId),
    recurringIdx: index('transactions_recurring_idx').on(table.recurringId),
    transferPairIdx: index('transactions_transfer_pair_idx').on(table.transferPairId),
    importIdx: index('transactions_import_idx').on(table.importId),
    userUnreviewedIdx: index('transactions_user_unreviewed_idx').on(
      table.userId,
      table.isReviewed,
    ),
  }),
)

// ============================================================================
// TRANSACTION AUDIT LOG
// ============================================================================

export const transactionAuditLog = pgTable(
  'transaction_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 20 }).notNull(),
    fieldChanged: varchar('field_changed', { length: 50 }),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    transactionIdx: index('audit_transaction_idx').on(table.transactionId),
    userIdx: index('audit_user_idx').on(table.userId),
  }),
)

// ============================================================================
// RECURRING TRANSACTIONS
// ============================================================================

export const recurringTransactions = pgTable(
  'recurring_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id),

    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 255 }),

    amountType: recurringAmountTypeEnum('amount_type').notNull().default('fixed'),
    amount: decimal('amount', { precision: 15, scale: 2 }),
    amountMax: decimal('amount_max', { precision: 15, scale: 2 }),

    frequency: recurringFrequencyEnum('frequency').notNull(),
    dayOfMonth: smallint('day_of_month'),
    dayOfWeek: smallint('day_of_week'),

    startDate: date('start_date').notNull(),
    nextOccurrence: date('next_occurrence'),
    lastOccurrence: date('last_occurrence'),

    transactionType: transactionTypeEnum('transaction_type').notNull(),

    isActive: boolean('is_active').notNull().default(true),
    requiresConfirmation: boolean('requires_confirmation').default(false),

    merchantPattern: varchar('merchant_pattern', { length: 200 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('recurring_user_idx').on(table.userId),
    userActiveIdx: index('recurring_user_active_idx').on(table.userId, table.isActive),
    nextOccurrenceIdx: index('recurring_next_occurrence_idx').on(table.nextOccurrence),
  }),
)

// ============================================================================
// INCOMES
// ============================================================================

export const incomes = pgTable(
  'incomes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    recurringId: uuid('recurring_id').references(() => recurringTransactions.id),

    name: varchar('name', { length: 100 }).notNull(),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),

    frequency: recurringFrequencyEnum('frequency').notNull().default('monthly'),
    expectedDay: smallint('expected_day'),

    isConfirmed: boolean('is_confirmed').notNull().default(true),
    confirmationRequiredMonthly: boolean('confirmation_required_monthly').default(false),

    nextExpected: date('next_expected'),
    lastReceived: date('last_received'),

    isPrimarySalary: boolean('is_primary_salary').default(false),
    isActive: boolean('is_active').notNull().default(true),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('incomes_user_idx').on(table.userId),
    userActiveIdx: index('incomes_user_active_idx').on(table.userId, table.isActive),
  }),
)

// ============================================================================
// BUDGETS
// ============================================================================

export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    year: smallint('year').notNull(),
    month: smallint('month').notNull(),

    status: budgetStatusEnum('status').notNull().default('draft'),

    totalPlannedIncome: decimal('total_planned_income', { precision: 15, scale: 2 }).default('0'),
    totalPlannedExpenses: decimal('total_planned_expenses', { precision: 15, scale: 2 }).default(
      '0',
    ),
    totalPlannedSavings: decimal('total_planned_savings', { precision: 15, scale: 2 }).default('0'),
    totalPlannedDebtPayments: decimal('total_planned_debt_payments', {
      precision: 15,
      scale: 2,
    }).default('0'),
    unallocatedAmount: decimal('unallocated_amount', { precision: 15, scale: 2 }).default('0'),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userYearMonthIdx: unique('budgets_user_year_month_idx').on(
      table.userId,
      table.year,
      table.month,
    ),
    userIdx: index('budgets_user_idx').on(table.userId),
  }),
)

// ============================================================================
// BUDGET ITEMS
// ============================================================================

export const budgetItems = pgTable(
  'budget_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),

    plannedAmount: decimal('planned_amount', { precision: 15, scale: 2 })
      .notNull()
      .default('0'),
    rolloverAmount: decimal('rollover_amount', { precision: 15, scale: 2 }).default('0'),

    surplusAction: surplusActionEnum('surplus_action').default('rollover'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    budgetCategoryIdx: unique('budget_items_budget_category_idx').on(
      table.budgetId,
      table.categoryId,
    ),
    budgetIdx: index('budget_items_budget_idx').on(table.budgetId),
  }),
)

// ============================================================================
// BUDGET INCOMES
// ============================================================================

export const budgetIncomes = pgTable(
  'budget_incomes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    incomeId: uuid('income_id').references(() => incomes.id),

    name: varchar('name', { length: 100 }).notNull(),
    expectedAmount: decimal('expected_amount', { precision: 15, scale: 2 }).notNull(),
    expectedDate: date('expected_date'),

    isConfirmed: boolean('is_confirmed').default(false),
    actualAmount: decimal('actual_amount', { precision: 15, scale: 2 }),
    actualDate: date('actual_date'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    budgetIdx: index('budget_incomes_budget_idx').on(table.budgetId),
  }),
)

// ============================================================================
// PLANNED ONE-OFFS
// ============================================================================

export const plannedOneOffs = pgTable(
  'planned_one_offs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    categoryId: uuid('category_id').references(() => categories.id),

    description: varchar('description', { length: 255 }).notNull(),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    expectedDate: date('expected_date').notNull(),

    isReserved: boolean('is_reserved').notNull().default(true),
    reminderDaysBefore: smallint('reminder_days_before').notNull().default(14),
    reminderThreshold: decimal('reminder_threshold', { precision: 15, scale: 2 }).default('1000'),

    lastReminderSent: date('last_reminder_sent'),
    lastReminderType: varchar('last_reminder_type', { length: 20 }),

    isCompleted: boolean('is_completed').default(false),
    actualTransactionId: uuid('actual_transaction_id').references(() => transactions.id),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    budgetIdx: index('planned_one_offs_budget_idx').on(table.budgetId),
    expectedDateIdx: index('planned_one_offs_expected_date_idx').on(table.expectedDate),
    userPendingIdx: index('planned_one_offs_pending_idx').on(
      table.isCompleted,
      table.expectedDate,
    ),
  }),
)

// ============================================================================
// ACTUALS
// ============================================================================

export const actuals = pgTable(
  'actuals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    budgetId: uuid('budget_id').references(() => budgets.id),

    year: smallint('year').notNull(),
    month: smallint('month').notNull(),

    status: actualStatusEnum('status').notNull().default('open'),

    totalIncome: decimal('total_income', { precision: 15, scale: 2 }).default('0'),
    totalExpenses: decimal('total_expenses', { precision: 15, scale: 2 }).default('0'),
    netSavings: decimal('net_savings', { precision: 15, scale: 2 }).default('0'),

    reconciledAt: timestamp('reconciled_at', { withTimezone: true }),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userYearMonthIdx: unique('actuals_user_year_month_idx').on(
      table.userId,
      table.year,
      table.month,
    ),
    userIdx: index('actuals_user_idx').on(table.userId),
  }),
)

// ============================================================================
// ACTUAL CATEGORIES
// ============================================================================

export const actualCategories = pgTable(
  'actual_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actualId: uuid('actual_id')
      .notNull()
      .references(() => actuals.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),

    totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).default('0'),
    transactionCount: integer('transaction_count').default(0),

    budgetedAmount: decimal('budgeted_amount', { precision: 15, scale: 2 }),
    variance: decimal('variance', { precision: 15, scale: 2 }),
    variancePercentage: decimal('variance_percentage', { precision: 5, scale: 2 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    actualCategoryIdx: unique('actual_categories_actual_category_idx').on(
      table.actualId,
      table.categoryId,
    ),
    actualIdx: index('actual_categories_actual_idx').on(table.actualId),
  }),
)

// ============================================================================
// ACCOUNT BALANCE CONFIRMATIONS
// ============================================================================

export const accountBalanceConfirmations = pgTable(
  'account_balance_confirmations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actualId: uuid('actual_id')
      .notNull()
      .references(() => actuals.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),

    expectedBalance: decimal('expected_balance', { precision: 15, scale: 2 }).notNull(),
    confirmedBalance: decimal('confirmed_balance', { precision: 15, scale: 2 }),
    difference: decimal('difference', { precision: 15, scale: 2 }),

    isConfirmed: boolean('is_confirmed').default(false),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    actualAccountIdx: unique('balance_confirmations_actual_account_idx').on(
      table.actualId,
      table.accountId,
    ),
  }),
)

// ============================================================================
// SURPLUS ALLOCATIONS
// ============================================================================

export const surplusAllocations = pgTable(
  'surplus_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actualId: uuid('actual_id')
      .notNull()
      .references(() => actuals.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id),

    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    action: surplusActionEnum('action').notNull(),

    targetSavingsGoalId: uuid('target_savings_goal_id').references(() => savingsGoals.id),
    targetCategoryId: uuid('target_category_id').references(() => categories.id),

    isActioned: boolean('is_actioned').default(false),
    actionedAt: timestamp('actioned_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    actualIdx: index('surplus_allocations_actual_idx').on(table.actualId),
  }),
)

// ============================================================================
// DEBTS
// ============================================================================

export const debts = pgTable(
  'debts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    linkedAccountId: uuid('linked_account_id').references(() => accounts.id),

    name: varchar('name', { length: 100 }).notNull(),
    debtType: debtTypeEnum('debt_type').notNull(),
    creditor: varchar('creditor', { length: 100 }),

    originalAmount: decimal('original_amount', { precision: 15, scale: 2 }).notNull(),
    currentBalance: decimal('current_balance', { precision: 15, scale: 2 }).notNull(),

    interestRate: decimal('interest_rate', { precision: 5, scale: 2 }),
    interestType: varchar('interest_type', { length: 20 }).default('compound'),

    minimumPayment: decimal('minimum_payment', { precision: 15, scale: 2 }),
    fixedPayment: decimal('fixed_payment', { precision: 15, scale: 2 }),
    paymentDay: smallint('payment_day'),

    startDate: date('start_date'),
    expectedPayoffDate: date('expected_payoff_date'),

    isActive: boolean('is_active').notNull().default(true),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('debts_user_idx').on(table.userId),
    userActiveIdx: index('debts_user_active_idx').on(table.userId, table.isActive),
  }),
)

// ============================================================================
// DEBT PAYMENTS
// ============================================================================

export const debtPayments = pgTable(
  'debt_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    debtId: uuid('debt_id')
      .notNull()
      .references(() => debts.id, { onDelete: 'cascade' }),
    transactionId: uuid('transaction_id').references(() => transactions.id),

    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    principalAmount: decimal('principal_amount', { precision: 15, scale: 2 }),
    interestAmount: decimal('interest_amount', { precision: 15, scale: 2 }),

    paymentDate: date('payment_date').notNull(),
    balanceAfter: decimal('balance_after', { precision: 15, scale: 2 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    debtIdx: index('debt_payments_debt_idx').on(table.debtId),
    dateIdx: index('debt_payments_date_idx').on(table.paymentDate),
  }),
)

// ============================================================================
// SAVINGS GOALS
// ============================================================================

export const savingsGoals = pgTable(
  'savings_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    linkedAccountId: uuid('linked_account_id').references(() => accounts.id),

    name: varchar('name', { length: 100 }).notNull(),
    goalType: savingsGoalTypeEnum('goal_type').notNull(),

    targetAmount: decimal('target_amount', { precision: 15, scale: 2 }),
    currentAmount: decimal('current_amount', { precision: 15, scale: 2 }).default('0'),

    targetDate: date('target_date'),
    targetMonthsOfExpenses: smallint('target_months_of_expenses'),

    monthlyContribution: decimal('monthly_contribution', { precision: 15, scale: 2 }),

    priority: smallint('priority').notNull().default(1),

    isActive: boolean('is_active').notNull().default(true),
    isCompleted: boolean('is_completed').default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('savings_goals_user_idx').on(table.userId),
    userActiveIdx: index('savings_goals_user_active_idx').on(table.userId, table.isActive),
    userPriorityIdx: index('savings_goals_user_priority_idx').on(table.userId, table.priority),
  }),
)

// ============================================================================
// SAVINGS CONTRIBUTIONS
// ============================================================================

export const savingsContributions = pgTable(
  'savings_contributions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    savingsGoalId: uuid('savings_goal_id')
      .notNull()
      .references(() => savingsGoals.id, { onDelete: 'cascade' }),
    transactionId: uuid('transaction_id').references(() => transactions.id),

    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    contributionDate: date('contribution_date').notNull(),

    source: varchar('source', { length: 50 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    goalIdx: index('savings_contributions_goal_idx').on(table.savingsGoalId),
  }),
)

// ============================================================================
// TASKS
// ============================================================================

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    taskType: taskTypeEnum('task_type').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),

    priority: taskPriorityEnum('priority').notNull().default('medium'),
    status: taskStatusEnum('status').notNull().default('pending'),

    dueDate: date('due_date'),
    dueTime: time('due_time'),

    snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),

    isRecurring: boolean('is_recurring').default(false),
    recurringSourceId: uuid('recurring_source_id'),

    relatedEntityType: varchar('related_entity_type', { length: 50 }),
    relatedEntityId: uuid('related_entity_id'),

    actionPath: varchar('action_path', { length: 200 }),

    completedAt: timestamp('completed_at', { withTimezone: true }),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),

    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userStatusIdx: index('tasks_user_status_idx').on(table.userId, table.status),
    userDueIdx: index('tasks_user_due_idx').on(table.userId, table.dueDate),
    userPriorityIdx: index('tasks_user_priority_idx').on(table.userId, table.priority),
  }),
)

// ============================================================================
// CATEGORIZATION RULES
// ============================================================================

export const categorizationRules = pgTable(
  'categorization_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),

    merchantExact: varchar('merchant_exact', { length: 200 }),
    merchantPattern: varchar('merchant_pattern', { length: 200 }),
    descriptionPattern: varchar('description_pattern', { length: 200 }),

    amountMin: decimal('amount_min', { precision: 15, scale: 2 }),
    amountMax: decimal('amount_max', { precision: 15, scale: 2 }),

    priority: smallint('priority').default(50),
    confidence: decimal('confidence', { precision: 3, scale: 2 }).default('1.00'),

    timesApplied: integer('times_applied').default(0),
    timesCorrected: integer('times_corrected').default(0),

    isActive: boolean('is_active').notNull().default(true),
    isGlobal: boolean('is_global').default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('categorization_rules_user_idx').on(table.userId),
    merchantExactIdx: index('categorization_rules_merchant_exact_idx').on(table.merchantExact),
    globalIdx: index('categorization_rules_global_idx').on(table.isGlobal),
  }),
)

// ============================================================================
// STATEMENT IMPORTS
// ============================================================================

export const statementImports = pgTable(
  'statement_imports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),

    filename: varchar('filename', { length: 255 }),
    fileType: varchar('file_type', { length: 10 }),
    fileUrl: varchar('file_url', { length: 500 }),

    statementStartDate: date('statement_start_date'),
    statementEndDate: date('statement_end_date'),
    openingBalance: decimal('opening_balance', { precision: 15, scale: 2 }),
    closingBalance: decimal('closing_balance', { precision: 15, scale: 2 }),

    transactionsImported: integer('transactions_imported').default(0),
    transactionsDuplicates: integer('transactions_duplicates').default(0),
    transactionsFailed: integer('transactions_failed').default(0),

    status: importStatusEnum('status').notNull().default('processing'),
    errorMessage: text('error_message'),

    importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('statement_imports_user_idx').on(table.userId),
    accountIdx: index('statement_imports_account_idx').on(table.accountId),
  }),
)

// ============================================================================
// DUPLICATE RULES
// ============================================================================

export const duplicateRules = pgTable(
  'duplicate_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    merchantPattern: varchar('merchant_pattern', { length: 200 }),
    amount: decimal('amount', { precision: 15, scale: 2 }),

    action: varchar('action', { length: 20 }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('duplicate_rules_user_idx').on(table.userId),
  }),
)

// ============================================================================
// MERCHANT MAPPINGS
// ============================================================================

export const merchantMappings = pgTable(
  'merchant_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

    originalName: varchar('original_name', { length: 200 }).notNull(),
    normalizedName: varchar('normalized_name', { length: 200 }).notNull(),

    isGlobal: boolean('is_global').default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    originalNameIdx: index('merchant_mappings_original_name_idx').on(table.originalName),
    userIdx: index('merchant_mappings_user_idx').on(table.userId),
  }),
)

// ============================================================================
// NET WORTH SNAPSHOTS
// ============================================================================

export const netWorthSnapshots = pgTable(
  'net_worth_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    snapshotDate: date('snapshot_date').notNull(),

    totalAssets: decimal('total_assets', { precision: 15, scale: 2 }).notNull(),
    totalLiabilities: decimal('total_liabilities', { precision: 15, scale: 2 }).notNull(),
    netWorth: decimal('net_worth', { precision: 15, scale: 2 }).notNull(),

    totalCashSpend: decimal('total_cash_spend', { precision: 15, scale: 2 }),
    totalCreditAvailable: decimal('total_credit_available', { precision: 15, scale: 2 }),
    totalSavings: decimal('total_savings', { precision: 15, scale: 2 }),
    totalDebt: decimal('total_debt', { precision: 15, scale: 2 }),

    breakdown: jsonb('breakdown'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userDateIdx: unique('net_worth_snapshots_user_date_idx').on(table.userId, table.snapshotDate),
    userIdx: index('net_worth_snapshots_user_idx').on(table.userId),
  }),
)

// ============================================================================
// DAILY TRACKER CACHE
// ============================================================================

export const dailyTrackerCache = pgTable(
  'daily_tracker_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    date: date('date').notNull(),

    expectedIncome: decimal('expected_income', { precision: 15, scale: 2 }).default('0'),
    expectedDebtPayments: decimal('expected_debt_payments', { precision: 15, scale: 2 }).default(
      '0',
    ),
    expectedExpenses: decimal('expected_expenses', { precision: 15, scale: 2 }).default('0'),
    predictedSpend: decimal('predicted_spend', { precision: 15, scale: 2 }).default('0'),
    manualOverride: decimal('manual_override', { precision: 15, scale: 2 }),
    runningBalance: decimal('running_balance', { precision: 15, scale: 2 }).default('0'),

    hasAlerts: boolean('has_alerts').default(false),
    alerts: jsonb('alerts'),

    isPayday: boolean('is_payday').default(false),

    incomeDetails: jsonb('income_details'),
    debtDetails: jsonb('debt_details'),
    expenseDetails: jsonb('expense_details'),

    calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userDateIdx: unique('daily_tracker_cache_user_date_idx').on(table.userId, table.date),
    userIdx: index('daily_tracker_cache_user_idx').on(table.userId),
  }),
)

// ============================================================================
// CHAT MESSAGES
// ============================================================================

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    role: varchar('role', { length: 20 }).notNull(),
    content: text('content').notNull(),

    intent: varchar('intent', { length: 50 }),
    entities: jsonb('entities'),

    actionTaken: varchar('action_taken', { length: 100 }),
    actionResult: jsonb('action_result'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('chat_messages_user_idx').on(table.userId),
    userDateIdx: index('chat_messages_user_date_idx').on(table.userId, table.createdAt),
  }),
)

// ============================================================================
// AI INSIGHTS
// ============================================================================

export const aiInsights = pgTable(
  'ai_insights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    insightType: varchar('insight_type', { length: 50 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    content: text('content').notNull(),

    relatedEntityType: varchar('related_entity_type', { length: 50 }),
    relatedEntityId: uuid('related_entity_id'),

    priority: smallint('priority').default(5),

    isRead: boolean('is_read').default(false),
    isDismissed: boolean('is_dismissed').default(false),

    validUntil: timestamp('valid_until', { withTimezone: true }),

    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('ai_insights_user_idx').on(table.userId),
    userUnreadIdx: index('ai_insights_user_unread_idx').on(table.userId, table.isRead),
  }),
)

// ============================================================================
// FAQ
// ============================================================================

export const faqItems = pgTable(
  'faq_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    question: varchar('question', { length: 500 }).notNull(),
    answer: text('answer').notNull(),

    category: varchar('category', { length: 50 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),

    displayOrder: smallint('display_order').default(0),
    isActive: boolean('is_active').default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index('faq_items_category_idx').on(table.category),
    slugIdx: index('faq_items_slug_idx').on(table.slug),
  }),
)

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many, one }) => ({
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
  accounts: many(accounts),
  categories: many(categories),
  transactions: many(transactions),
  recurringTransactions: many(recurringTransactions),
  incomes: many(incomes),
  budgets: many(budgets),
  actuals: many(actuals),
  debts: many(debts),
  savingsGoals: many(savingsGoals),
  tasks: many(tasks),
  categorizationRules: many(categorizationRules),
  statementImports: many(statementImports),
  netWorthSnapshots: many(netWorthSnapshots),
  chatMessages: many(chatMessages),
  aiInsights: many(aiInsights),
}))

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  recurringTransactions: many(recurringTransactions),
  incomes: many(incomes),
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  transactions: many(transactions),
  budgetItems: many(budgetItems),
  categorizationRules: many(categorizationRules),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  recurring: one(recurringTransactions, {
    fields: [transactions.recurringId],
    references: [recurringTransactions.id],
  }),
  transferToAccount: one(accounts, {
    fields: [transactions.transferToAccountId],
    references: [accounts.id],
  }),
  parentTransaction: one(transactions, {
    fields: [transactions.parentTransactionId],
    references: [transactions.id],
  }),
  statementImport: one(statementImports, {
    fields: [transactions.importId],
    references: [statementImports.id],
  }),
}))

export const recurringTransactionsRelations = relations(
  recurringTransactions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [recurringTransactions.userId],
      references: [users.id],
    }),
    account: one(accounts, {
      fields: [recurringTransactions.accountId],
      references: [accounts.id],
    }),
    category: one(categories, {
      fields: [recurringTransactions.categoryId],
      references: [categories.id],
    }),
    transactions: many(transactions),
  }),
)

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  budgetItems: many(budgetItems),
  budgetIncomes: many(budgetIncomes),
  plannedOneOffs: many(plannedOneOffs),
  actual: one(actuals, {
    fields: [budgets.id],
    references: [actuals.budgetId],
  }),
}))

export const actualsRelations = relations(actuals, ({ one, many }) => ({
  user: one(users, {
    fields: [actuals.userId],
    references: [users.id],
  }),
  budget: one(budgets, {
    fields: [actuals.budgetId],
    references: [budgets.id],
  }),
  actualCategories: many(actualCategories),
  balanceConfirmations: many(accountBalanceConfirmations),
  surplusAllocations: many(surplusAllocations),
}))

export const debtsRelations = relations(debts, ({ one, many }) => ({
  user: one(users, {
    fields: [debts.userId],
    references: [users.id],
  }),
  linkedAccount: one(accounts, {
    fields: [debts.linkedAccountId],
    references: [accounts.id],
  }),
  payments: many(debtPayments),
}))

export const savingsGoalsRelations = relations(savingsGoals, ({ one, many }) => ({
  user: one(users, {
    fields: [savingsGoals.userId],
    references: [users.id],
  }),
  linkedAccount: one(accounts, {
    fields: [savingsGoals.linkedAccountId],
    references: [accounts.id],
  }),
  contributions: many(savingsContributions),
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}))
