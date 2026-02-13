import type { DailyTrackerEntry } from '@fin/core/types'
import type { CreateDailyTrackerEntryInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestDailyTrackerEntry(
  overrides: Partial<DailyTrackerEntry> = {},
): DailyTrackerEntry {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    date: '2025-02-15',
    expectedIncome: '0',
    expectedDebtPayments: '0',
    expectedExpenses: '0',
    predictedSpend: '150.00',
    manualOverride: null,
    runningBalance: '5000.00',
    hasAlerts: false,
    alerts: null,
    isPayday: false,
    incomeDetails: null,
    debtDetails: null,
    expenseDetails: null,
    calculatedAt: new Date(),
    ...overrides,
  }
}

export function createTestDailyTrackerEntryInput(
  overrides: Partial<CreateDailyTrackerEntryInput> = {},
): CreateDailyTrackerEntryInput {
  return {
    date: '2025-02-15',
    runningBalance: '5000.00',
    ...overrides,
  }
}

export function resetDailyTrackerFactoryCounters(): void {
  counter = 0
}
