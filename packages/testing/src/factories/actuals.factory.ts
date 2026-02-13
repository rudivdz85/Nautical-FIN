import type {
  Actual,
  ActualCategory,
  BalanceConfirmation,
  SurplusAllocation,
} from '@fin/core/types'
import type { CreateActualInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestActual(overrides: Partial<Actual> = {}): Actual {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    budgetId: null,
    year: 2025,
    month: 2,
    status: 'open',
    totalIncome: '25000.00',
    totalExpenses: '18000.00',
    netSavings: '7000.00',
    reconciledAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestActualInput(
  overrides: Partial<CreateActualInput> = {},
): CreateActualInput {
  return {
    year: 2025,
    month: 2,
    ...overrides,
  }
}

export function createTestActualCategory(
  overrides: Partial<ActualCategory> = {},
): ActualCategory {
  const id = overrides.id ?? nextId()
  return {
    id,
    actualId: nextId(),
    categoryId: nextId(),
    totalAmount: '5000.00',
    transactionCount: 15,
    budgetedAmount: '4500.00',
    variance: '500.00',
    variancePercentage: '11.11',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestBalanceConfirmation(
  overrides: Partial<BalanceConfirmation> = {},
): BalanceConfirmation {
  const id = overrides.id ?? nextId()
  return {
    id,
    actualId: nextId(),
    accountId: nextId(),
    expectedBalance: '10000.00',
    confirmedBalance: null,
    difference: null,
    isConfirmed: false,
    confirmedAt: null,
    notes: null,
    createdAt: new Date(),
    ...overrides,
  }
}

export function createTestSurplusAllocation(
  overrides: Partial<SurplusAllocation> = {},
): SurplusAllocation {
  const id = overrides.id ?? nextId()
  return {
    id,
    actualId: nextId(),
    categoryId: null,
    amount: '2000.00',
    action: 'savings',
    targetSavingsGoalId: null,
    targetCategoryId: null,
    isActioned: false,
    actionedAt: null,
    createdAt: new Date(),
    ...overrides,
  }
}

export function resetActualFactoryCounters(): void {
  counter = 0
}
