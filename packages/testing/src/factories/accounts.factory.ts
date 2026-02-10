import type { Account, NewAccount, CreateAccountInput } from '@fin/core/types'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestAccount(overrides: Partial<Account> = {}): Account {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    name: 'Test Cheque Account',
    accountType: 'cheque',
    classification: 'spending',
    institution: 'Test Bank',
    accountNumberMasked: '****1234',
    currency: 'ZAR',
    currentBalance: '0',
    balanceAsOfDate: null,
    creditLimit: null,
    isActive: true,
    isFirstAccount: false,
    syncMethod: 'manual',
    bankSyncEnabled: false,
    bankSyncLastAt: null,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestAccountInput(
  overrides: Partial<CreateAccountInput> = {},
): CreateAccountInput {
  return {
    name: 'Test Account',
    accountType: 'cheque',
    currency: 'ZAR',
    currentBalance: '0',
    ...overrides,
  }
}

export function resetFactoryCounters(): void {
  counter = 0
}
