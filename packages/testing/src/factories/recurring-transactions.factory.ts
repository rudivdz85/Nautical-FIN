import type { RecurringTransaction } from '@fin/core/types'
import type { CreateRecurringTransactionInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestRecurringTransaction(
  overrides: Partial<RecurringTransaction> = {},
): RecurringTransaction {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    accountId: nextId(),
    categoryId: null,
    name: 'Monthly Rent',
    description: null,
    amountType: 'fixed',
    amount: '5000.00',
    amountMax: null,
    frequency: 'monthly',
    dayOfMonth: 1,
    dayOfWeek: null,
    startDate: '2025-01-01',
    nextOccurrence: '2025-02-01',
    lastOccurrence: null,
    transactionType: 'debit',
    isActive: true,
    requiresConfirmation: false,
    merchantPattern: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestRecurringTransactionInput(
  overrides: Partial<CreateRecurringTransactionInput> = {},
): CreateRecurringTransactionInput {
  return {
    accountId: '00000000-0000-0000-0000-000000000001',
    name: 'Monthly Rent',
    amountType: 'fixed',
    amount: '5000.00',
    frequency: 'monthly',
    dayOfMonth: 1,
    startDate: '2025-01-01',
    transactionType: 'debit',
    ...overrides,
  }
}

export function resetRecurringTransactionFactoryCounters(): void {
  counter = 0
}
