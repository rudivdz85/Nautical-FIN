import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecurringPageClient } from '@/app/(auth)/recurring/recurring-page-client'
import type { RecurringTransaction, Account, Category } from '@fin/core'

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

vi.mock('@/app/(auth)/recurring/recurring-form', () => ({
  RecurringForm: () => <div data-testid="recurring-form" />,
}))

vi.mock('@/app/(auth)/recurring/recurring-deactivate-dialog', () => ({
  RecurringDeactivateDialog: () => <div data-testid="recurring-deactivate-dialog" />,
}))

vi.mock('@/app/(auth)/recurring/recurring-generate-dialog', () => ({
  RecurringGenerateDialog: () => <div data-testid="recurring-generate-dialog" />,
}))

function makeRecurring(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  return {
    id: 'rec-1',
    userId: 'user-1',
    accountId: 'acc-1',
    categoryId: null,
    name: 'Netflix',
    description: null,
    amountType: 'fixed',
    amount: '199.00',
    amountMax: null,
    frequency: 'monthly',
    dayOfMonth: 15,
    dayOfWeek: null,
    startDate: '2024-01-15',
    nextOccurrence: '2025-04-15',
    lastOccurrence: '2025-03-15',
    transactionType: 'debit',
    isActive: true,
    requiresConfirmation: false,
    merchantPattern: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as RecurringTransaction
}

const defaultProps = {
  initialRecurring: [] as RecurringTransaction[],
  accounts: [] as Account[],
  categories: [] as Category[],
}

describe('RecurringPageClient', () => {
  it('renders the page title', () => {
    render(<RecurringPageClient {...defaultProps} />)
    expect(screen.getByText('Recurring Transactions')).toBeInTheDocument()
  })

  it('shows empty state when no recurring transactions', () => {
    render(<RecurringPageClient {...defaultProps} />)
    expect(screen.getByText('No recurring transactions yet')).toBeInTheDocument()
  })

  it('renders the Add Recurring button', () => {
    render(<RecurringPageClient {...defaultProps} />)
    expect(screen.getByText('Add Recurring')).toBeInTheDocument()
  })

  it('renders recurring transaction names in the table', () => {
    const recurring = [
      makeRecurring({ name: 'Netflix' }),
      makeRecurring({ id: 'rec-2', name: 'Gym Membership' }),
    ]
    render(<RecurringPageClient {...defaultProps} initialRecurring={recurring} />)
    expect(screen.getByText('Netflix')).toBeInTheDocument()
    expect(screen.getByText('Gym Membership')).toBeInTheDocument()
  })

  it('renders summary cards', () => {
    const recurring = [makeRecurring()]
    render(<RecurringPageClient {...defaultProps} initialRecurring={recurring} />)
    expect(screen.getByText('Active Recurring')).toBeInTheDocument()
    expect(screen.getByText('Est. Monthly Debits')).toBeInTheDocument()
  })

  it('renders frequency', () => {
    const recurring = [makeRecurring({ frequency: 'monthly' })]
    render(<RecurringPageClient {...defaultProps} initialRecurring={recurring} />)
    expect(screen.getByText('Monthly')).toBeInTheDocument()
  })
})
