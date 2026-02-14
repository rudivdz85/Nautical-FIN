import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IncomesPageClient } from '@/app/(auth)/incomes/incomes-page-client'
import type { Income, Account } from '@fin/core'

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

vi.mock('@/app/(auth)/incomes/income-form', () => ({
  IncomeForm: () => <div data-testid="income-form" />,
}))

vi.mock('@/app/(auth)/incomes/income-delete-dialog', () => ({
  IncomeDeleteDialog: () => <div data-testid="income-delete-dialog" />,
}))

function makeIncome(overrides: Partial<Income> = {}): Income {
  return {
    id: 'income-1',
    userId: 'user-1',
    accountId: 'acc-1',
    recurringId: null,
    name: 'Monthly Salary',
    amount: '45000.00',
    frequency: 'monthly',
    expectedDay: 25,
    isConfirmed: true,
    confirmationRequiredMonthly: true,
    nextExpected: '2025-04-25',
    lastReceived: '2025-03-25',
    isPrimarySalary: true,
    isActive: true,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Income
}

const defaultProps = {
  initialIncomes: [] as Income[],
  accounts: [] as Account[],
}

describe('IncomesPageClient', () => {
  it('renders the page title', () => {
    render(<IncomesPageClient {...defaultProps} />)
    expect(screen.getByText('Incomes')).toBeInTheDocument()
  })

  it('shows empty state when no incomes', () => {
    render(<IncomesPageClient {...defaultProps} />)
    expect(screen.getByText('No income sources yet')).toBeInTheDocument()
  })

  it('renders the Add Income button', () => {
    render(<IncomesPageClient {...defaultProps} />)
    expect(screen.getByText('Add Income')).toBeInTheDocument()
  })

  it('renders income names in the table', () => {
    const incomes = [
      makeIncome({ name: 'Monthly Salary' }),
      makeIncome({ id: 'income-2', name: 'Freelance', isPrimarySalary: false }),
    ]
    render(<IncomesPageClient {...defaultProps} initialIncomes={incomes} />)
    expect(screen.getByText('Monthly Salary')).toBeInTheDocument()
    expect(screen.getByText('Freelance')).toBeInTheDocument()
  })

  it('renders summary cards', () => {
    const incomes = [makeIncome()]
    render(<IncomesPageClient {...defaultProps} initialIncomes={incomes} />)
    expect(screen.getByText('Active Sources')).toBeInTheDocument()
    expect(screen.getByText('Est. Monthly Income')).toBeInTheDocument()
    expect(screen.getByText('Primary Salary')).toBeInTheDocument()
  })

  it('shows Primary badge for primary salary', () => {
    const incomes = [makeIncome({ isPrimarySalary: true })]
    render(<IncomesPageClient {...defaultProps} initialIncomes={incomes} />)
    expect(screen.getByText('Primary')).toBeInTheDocument()
  })
})
