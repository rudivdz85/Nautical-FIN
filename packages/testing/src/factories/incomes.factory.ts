import type { Income } from '@fin/core/types'
import type { CreateIncomeInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestIncome(overrides: Partial<Income> = {}): Income {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    accountId: nextId(),
    recurringId: null,
    name: 'Salary',
    amount: '25000.00',
    frequency: 'monthly',
    expectedDay: 25,
    isConfirmed: true,
    confirmationRequiredMonthly: false,
    nextExpected: '2025-02-25',
    lastReceived: null,
    isPrimarySalary: true,
    isActive: true,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestIncomeInput(
  overrides: Partial<CreateIncomeInput> = {},
): CreateIncomeInput {
  return {
    accountId: '00000000-0000-0000-0000-000000000001',
    name: 'Salary',
    amount: '25000.00',
    frequency: 'monthly',
    expectedDay: 25,
    ...overrides,
  }
}

export function resetIncomeFactoryCounters(): void {
  counter = 0
}
