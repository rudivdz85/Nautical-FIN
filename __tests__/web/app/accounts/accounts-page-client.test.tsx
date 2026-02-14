import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccountsPageClient } from '@/app/(auth)/accounts/accounts-page-client'
import type { Account } from '@fin/core'

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

vi.mock('@/app/(auth)/accounts/account-form', () => ({
  AccountForm: () => <div data-testid="account-form" />,
}))

vi.mock('@/app/(auth)/accounts/account-delete-dialog', () => ({
  AccountDeleteDialog: () => <div data-testid="account-delete-dialog" />,
}))

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    userId: 'user-1',
    name: 'FNB Cheque',
    accountType: 'cheque',
    classification: 'spending',
    institution: 'FNB',
    accountNumberMasked: '****1234',
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
    ...overrides,
  } as Account
}

describe('AccountsPageClient', () => {
  it('renders the page title', () => {
    render(<AccountsPageClient initialAccounts={[]} />)
    expect(screen.getByText('Accounts')).toBeInTheDocument()
  })

  it('shows empty state when no accounts', () => {
    render(<AccountsPageClient initialAccounts={[]} />)
    expect(screen.getByText('No accounts yet')).toBeInTheDocument()
  })

  it('renders the Add Account button', () => {
    render(<AccountsPageClient initialAccounts={[]} />)
    expect(screen.getByText('Add Account')).toBeInTheDocument()
  })

  it('renders account names in the table', () => {
    const accounts = [
      makeAccount({ name: 'FNB Cheque' }),
      makeAccount({ id: 'acc-2', name: 'Capitec Savings', accountType: 'savings' }),
    ]
    render(<AccountsPageClient initialAccounts={accounts} />)
    expect(screen.getByText('FNB Cheque')).toBeInTheDocument()
    expect(screen.getByText('Capitec Savings')).toBeInTheDocument()
  })

  it('renders account institutions', () => {
    const accounts = [makeAccount({ institution: 'First National Bank' })]
    render(<AccountsPageClient initialAccounts={accounts} />)
    expect(screen.getByText('First National Bank')).toBeInTheDocument()
  })

  it('renders account type badges', () => {
    const accounts = [makeAccount({ accountType: 'credit_card' })]
    render(<AccountsPageClient initialAccounts={accounts} />)
    expect(screen.getByText('Credit Card')).toBeInTheDocument()
  })
})
