import type { Debt, DebtPayment } from '@fin/core/types'
import type { CreateDebtInput, CreateDebtPaymentInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestDebt(overrides: Partial<Debt> = {}): Debt {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    linkedAccountId: null,
    name: 'Home Loan',
    debtType: 'home_loan',
    creditor: 'Bank',
    originalAmount: '1000000.00',
    currentBalance: '950000.00',
    interestRate: '10.50',
    interestType: 'compound',
    minimumPayment: '8500.00',
    fixedPayment: null,
    paymentDay: 1,
    startDate: '2023-01-01',
    expectedPayoffDate: '2043-01-01',
    isActive: true,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestDebtInput(
  overrides: Partial<CreateDebtInput> = {},
): CreateDebtInput {
  return {
    name: 'Home Loan',
    debtType: 'home_loan',
    originalAmount: '1000000.00',
    currentBalance: '950000.00',
    ...overrides,
  }
}

export function createTestDebtPayment(overrides: Partial<DebtPayment> = {}): DebtPayment {
  const id = overrides.id ?? nextId()
  return {
    id,
    debtId: nextId(),
    transactionId: null,
    amount: '8500.00',
    principalAmount: '5000.00',
    interestAmount: '3500.00',
    paymentDate: '2025-02-01',
    balanceAfter: '941500.00',
    createdAt: new Date(),
    ...overrides,
  }
}

export function createTestDebtPaymentInput(
  overrides: Partial<CreateDebtPaymentInput> = {},
): CreateDebtPaymentInput {
  return {
    amount: '8500.00',
    paymentDate: '2025-02-01',
    ...overrides,
  }
}

export function resetDebtFactoryCounters(): void {
  counter = 0
}
