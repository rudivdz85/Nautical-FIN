import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DebtsPageClient } from '@/app/(auth)/debts/debts-page-client'
import type { Debt, Account } from '@fin/core'

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

vi.mock('@/app/(auth)/debts/debt-form', () => ({
  DebtForm: () => <div data-testid="debt-form" />,
}))

vi.mock('@/app/(auth)/debts/debt-delete-dialog', () => ({
  DebtDeleteDialog: () => <div data-testid="debt-delete-dialog" />,
}))

vi.mock('@/app/(auth)/debts/debt-detail-sheet', () => ({
  DebtDetailSheet: () => <div data-testid="debt-detail-sheet" />,
}))

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: 'debt-1',
    userId: 'user-1',
    linkedAccountId: null,
    name: 'Home Loan',
    debtType: 'home_loan',
    creditor: 'ABSA',
    originalAmount: '1500000.00',
    currentBalance: '1200000.00',
    interestRate: '11.75',
    interestType: 'compound',
    minimumPayment: '14000.00',
    fixedPayment: '15000.00',
    paymentDay: 1,
    startDate: '2020-01-01',
    expectedPayoffDate: '2040-01-01',
    isActive: true,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Debt
}

const defaultProps = {
  initialDebts: [] as Debt[],
  accounts: [] as Account[],
}

describe('DebtsPageClient', () => {
  it('renders the page title', () => {
    render(<DebtsPageClient {...defaultProps} />)
    expect(screen.getByText('Debts')).toBeInTheDocument()
  })

  it('shows empty state when no debts', () => {
    render(<DebtsPageClient {...defaultProps} />)
    expect(screen.getByText('No debts yet')).toBeInTheDocument()
  })

  it('renders the Add Debt button', () => {
    render(<DebtsPageClient {...defaultProps} />)
    expect(screen.getByText('Add Debt')).toBeInTheDocument()
  })

  it('renders debt names in the table', () => {
    const debts = [
      makeDebt({ name: 'ABSA Mortgage' }),
      makeDebt({ id: 'debt-2', name: 'Car Finance', debtType: 'vehicle' }),
    ]
    render(<DebtsPageClient {...defaultProps} initialDebts={debts} />)
    expect(screen.getByText('ABSA Mortgage')).toBeInTheDocument()
    expect(screen.getByText('Car Finance')).toBeInTheDocument()
  })

  it('renders summary cards with data', () => {
    const debts = [makeDebt()]
    render(<DebtsPageClient {...defaultProps} initialDebts={debts} />)
    expect(screen.getByText('Total Outstanding')).toBeInTheDocument()
    expect(screen.getByText('Total Monthly Payments')).toBeInTheDocument()
  })

  it('renders debt type', () => {
    const debts = [makeDebt({ debtType: 'credit_card' })]
    render(<DebtsPageClient {...defaultProps} initialDebts={debts} />)
    expect(screen.getByText('Credit Card')).toBeInTheDocument()
  })
})
