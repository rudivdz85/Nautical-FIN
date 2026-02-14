import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { TransactionsPageClient } from '@/app/(auth)/transactions/transactions-page-client'
import { apiClient } from '@/lib/api-client'
import type { Account, Category, Transaction } from '@fin/core'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error {
    code: string
    status: number
    constructor(code: string, message: string, status: number) {
      super(message)
      this.code = code
      this.status = status
      this.name = 'ApiError'
    }
  },
}))

vi.mock('@/app/(auth)/transactions/transaction-form', () => ({
  TransactionForm: () => <div data-testid="transaction-form" />,
}))

vi.mock('@/app/(auth)/transactions/transfer-form', () => ({
  TransferForm: () => <div data-testid="transfer-form" />,
}))

vi.mock('@/app/(auth)/transactions/transaction-delete-dialog', () => ({
  TransactionDeleteDialog: () => <div data-testid="transaction-delete-dialog" />,
}))

const mockAccount: Account = {
  id: 'acc-1',
  userId: 'user-1',
  name: 'FNB Cheque',
  accountType: 'cheque',
  classification: 'spending',
  institution: 'FNB',
  accountNumberMasked: null,
  currency: 'ZAR',
  currentBalance: '15000.00',
  balanceAsOfDate: null,
  creditLimit: null,
  isActive: true,
  isFirstAccount: false,
  syncMethod: null,
  bankSyncEnabled: false,
  bankSyncLastAt: null,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Account

const mockCategory: Category = {
  id: 'cat-1',
  userId: 'user-1',
  name: 'Groceries',
  categoryType: 'expense',
  parentId: null,
  icon: null,
  color: null,
  isSystem: false,
  isHidden: false,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Category

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-1',
    userId: 'user-1',
    accountId: 'acc-1',
    categoryId: null,
    amount: '500.00',
    currency: 'ZAR',
    transactionDate: '2025-03-10',
    postedDate: null,
    description: 'Woolworths',
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
  } as Transaction
}

const mockGet = vi.mocked(apiClient.get)

describe('TransactionsPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page title', async () => {
    mockGet.mockResolvedValueOnce([])
    render(<TransactionsPageClient accounts={[mockAccount]} categories={[mockCategory]} />)
    expect(screen.getByText('Transactions')).toBeInTheDocument()
  })

  it('shows empty state when no transactions', async () => {
    mockGet.mockResolvedValueOnce([])
    render(<TransactionsPageClient accounts={[mockAccount]} categories={[mockCategory]} />)

    await waitFor(() => {
      expect(screen.getByText('No transactions yet')).toBeInTheDocument()
    })
  })

  it('renders transaction descriptions', async () => {
    const transactions = [
      makeTransaction({ description: 'Woolworths' }),
      makeTransaction({ id: 'txn-2', description: 'Checkers' }),
    ]
    mockGet.mockResolvedValueOnce(transactions)
    render(<TransactionsPageClient accounts={[mockAccount]} categories={[mockCategory]} />)

    await waitFor(() => {
      expect(screen.getByText('Woolworths')).toBeInTheDocument()
      expect(screen.getByText('Checkers')).toBeInTheDocument()
    })
  })

  it('renders summary cards', async () => {
    mockGet.mockResolvedValueOnce([])
    render(<TransactionsPageClient accounts={[mockAccount]} categories={[mockCategory]} />)
    expect(screen.getByText('Inflows')).toBeInTheDocument()
    expect(screen.getByText('Outflows')).toBeInTheDocument()
    expect(screen.getByText('Net')).toBeInTheDocument()
  })

  it('renders filter controls', async () => {
    mockGet.mockResolvedValueOnce([])
    render(<TransactionsPageClient accounts={[mockAccount]} categories={[mockCategory]} />)
    expect(screen.getByText('Add')).toBeInTheDocument()
  })
})
