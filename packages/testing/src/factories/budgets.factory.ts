import type { Budget, BudgetItem, BudgetIncome, PlannedOneOff } from '@fin/core/types'
import type { CreateBudgetInput, CreateBudgetItemInput, CreateBudgetIncomeInput, CreatePlannedOneOffInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestBudget(overrides: Partial<Budget> = {}): Budget {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    year: 2025,
    month: 2,
    status: 'draft',
    totalPlannedIncome: '0',
    totalPlannedExpenses: '0',
    totalPlannedSavings: '0',
    totalPlannedDebtPayments: '0',
    unallocatedAmount: '0',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestBudgetInput(
  overrides: Partial<CreateBudgetInput> = {},
): CreateBudgetInput {
  return {
    year: 2025,
    month: 2,
    ...overrides,
  }
}

export function createTestBudgetItem(overrides: Partial<BudgetItem> = {}): BudgetItem {
  const id = overrides.id ?? nextId()
  return {
    id,
    budgetId: nextId(),
    categoryId: nextId(),
    plannedAmount: '1000.00',
    rolloverAmount: '0',
    surplusAction: 'rollover',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestBudgetItemInput(
  overrides: Partial<CreateBudgetItemInput> = {},
): CreateBudgetItemInput {
  return {
    categoryId: '00000000-0000-0000-0000-000000000001',
    plannedAmount: '1000.00',
    ...overrides,
  }
}

export function createTestBudgetIncome(overrides: Partial<BudgetIncome> = {}): BudgetIncome {
  const id = overrides.id ?? nextId()
  return {
    id,
    budgetId: nextId(),
    incomeId: null,
    name: 'Salary',
    expectedAmount: '25000.00',
    expectedDate: null,
    isConfirmed: false,
    actualAmount: null,
    actualDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestBudgetIncomeInput(
  overrides: Partial<CreateBudgetIncomeInput> = {},
): CreateBudgetIncomeInput {
  return {
    name: 'Salary',
    expectedAmount: '25000.00',
    ...overrides,
  }
}

export function createTestPlannedOneOff(overrides: Partial<PlannedOneOff> = {}): PlannedOneOff {
  const id = overrides.id ?? nextId()
  return {
    id,
    budgetId: nextId(),
    accountId: nextId(),
    categoryId: null,
    description: 'Car Service',
    amount: '3500.00',
    expectedDate: '2025-02-15',
    isReserved: true,
    reminderDaysBefore: 14,
    reminderThreshold: '1000',
    lastReminderSent: null,
    lastReminderType: null,
    isCompleted: false,
    actualTransactionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestPlannedOneOffInput(
  overrides: Partial<CreatePlannedOneOffInput> = {},
): CreatePlannedOneOffInput {
  return {
    accountId: '00000000-0000-0000-0000-000000000001',
    description: 'Car Service',
    amount: '3500.00',
    expectedDate: '2025-02-15',
    ...overrides,
  }
}

export function resetBudgetFactoryCounters(): void {
  counter = 0
}
