import type { SavingsGoal, SavingsContribution } from '@fin/core/types'
import type { CreateSavingsGoalInput, CreateSavingsContributionInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestSavingsGoal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    linkedAccountId: null,
    name: 'Emergency Fund',
    goalType: 'emergency',
    targetAmount: '50000.00',
    currentAmount: '10000.00',
    targetDate: '2026-12-31',
    targetMonthsOfExpenses: 3,
    monthlyContribution: '2000.00',
    priority: 1,
    isActive: true,
    isCompleted: false,
    completedAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestSavingsGoalInput(
  overrides: Partial<CreateSavingsGoalInput> = {},
): CreateSavingsGoalInput {
  return {
    name: 'Emergency Fund',
    goalType: 'emergency',
    targetAmount: '50000.00',
    ...overrides,
  }
}

export function createTestSavingsContribution(
  overrides: Partial<SavingsContribution> = {},
): SavingsContribution {
  const id = overrides.id ?? nextId()
  return {
    id,
    savingsGoalId: nextId(),
    transactionId: null,
    amount: '2000.00',
    contributionDate: '2025-02-01',
    source: null,
    createdAt: new Date(),
    ...overrides,
  }
}

export function createTestSavingsContributionInput(
  overrides: Partial<CreateSavingsContributionInput> = {},
): CreateSavingsContributionInput {
  return {
    amount: '2000.00',
    contributionDate: '2025-02-01',
    ...overrides,
  }
}

export function resetSavingsGoalFactoryCounters(): void {
  counter = 0
}
