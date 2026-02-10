import type { Transaction } from '@fin/core/types'
import type { CreateTransactionInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestTransaction(overrides: Partial<Transaction> = {}): Transaction {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    accountId: nextId(),
    categoryId: null,
    amount: '100.00',
    currency: 'ZAR',
    transactionDate: '2025-01-15',
    postedDate: null,
    description: 'Test Transaction',
    merchantOriginal: null,
    merchantNormalized: null,
    notes: null,
    transactionType: 'debit',
    source: 'manual',
    externalId: null,
    isRecurringInstance: false,
    recurringId: null,
    transferPairId: null,
    transferToAccountId: null,
    isSplit: false,
    parentTransactionId: null,
    categorizationConfidence: null,
    categorizationMethod: null,
    isAiCategorized: false,
    isReviewed: true,
    importId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestTransactionInput(
  overrides: Partial<CreateTransactionInput> = {},
): CreateTransactionInput {
  return {
    accountId: '00000000-0000-0000-0000-000000000001',
    amount: '100.00',
    transactionDate: '2025-01-15',
    description: 'Test Transaction',
    transactionType: 'debit',
    ...overrides,
  }
}

export function resetTransactionFactoryCounters(): void {
  counter = 0
}
