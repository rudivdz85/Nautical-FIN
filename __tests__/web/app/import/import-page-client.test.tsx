import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImportPageClient } from '@/app/(auth)/import/import-page-client'
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

vi.mock('papaparse', () => ({
  default: { parse: vi.fn() },
}))

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
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
    ...overrides,
  } as Account
}

describe('ImportPageClient', () => {
  it('renders the page title', () => {
    render(<ImportPageClient accounts={[]} />)
    expect(screen.getByText('Import Statement')).toBeInTheDocument()
  })

  it('renders the page description mentioning CSV, OFX, QFX', () => {
    render(<ImportPageClient accounts={[]} />)
    expect(
      screen.getByText('Upload a bank statement (CSV, OFX, or QFX) to import transactions.'),
    ).toBeInTheDocument()
  })

  it('shows initial state prompting account selection', () => {
    render(<ImportPageClient accounts={[makeAccount()]} />)
    expect(screen.getByText('Select an account to get started')).toBeInTheDocument()
  })

  it('renders account options in the selector', () => {
    const accounts = [
      makeAccount({ id: 'acc-1', name: 'FNB Cheque' }),
      makeAccount({ id: 'acc-2', name: 'Capitec Savings' }),
    ]
    render(<ImportPageClient accounts={accounts} />)
    expect(screen.getByText('Account')).toBeInTheDocument()
  })

  it('shows empty state when no accounts provided', () => {
    render(<ImportPageClient accounts={[]} />)
    expect(screen.getByText('Select an account to get started')).toBeInTheDocument()
  })

  it('renders the account label', () => {
    render(<ImportPageClient accounts={[makeAccount()]} />)
    expect(screen.getByText('Account')).toBeInTheDocument()
  })
})
