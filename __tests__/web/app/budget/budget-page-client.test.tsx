import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetPageClient } from '@/app/(auth)/budget/budget-page-client'
import type { Budget, Account, Category } from '@fin/core'

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

vi.mock('@/app/(auth)/budget/budget-form', () => ({
  BudgetForm: () => <div data-testid="budget-form" />,
}))

vi.mock('@/app/(auth)/budget/budget-delete-dialog', () => ({
  BudgetDeleteDialog: () => <div data-testid="budget-delete-dialog" />,
}))

vi.mock('@/app/(auth)/budget/budget-detail-sheet', () => ({
  BudgetDetailSheet: () => <div data-testid="budget-detail-sheet" />,
}))

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'budget-1',
    userId: 'user-1',
    year: 2025,
    month: 3,
    status: 'active',
    totalPlannedIncome: '30000.00',
    totalPlannedExpenses: '20000.00',
    totalPlannedSavings: '5000.00',
    totalPlannedDebtPayments: '3000.00',
    unallocatedAmount: '2000.00',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Budget
}

const defaultProps = {
  initialBudgets: [] as Budget[],
  accounts: [] as Account[],
  categories: [] as Category[],
}

describe('BudgetPageClient', () => {
  it('renders the page title', () => {
    render(<BudgetPageClient {...defaultProps} />)
    expect(screen.getByText('Budget')).toBeInTheDocument()
  })

  it('shows empty state when no budgets', () => {
    render(<BudgetPageClient {...defaultProps} />)
    expect(screen.getByText('No budgets yet')).toBeInTheDocument()
  })

  it('renders the Create Budget button', () => {
    render(<BudgetPageClient {...defaultProps} />)
    expect(screen.getByText('Create Budget')).toBeInTheDocument()
  })

  it('renders budget rows in the table', () => {
    const budgets = [
      makeBudget({ status: 'active' }),
      makeBudget({ id: 'budget-2', year: 2025, month: 2, status: 'closed' }),
    ]
    render(<BudgetPageClient {...defaultProps} initialBudgets={budgets} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders summary cards', () => {
    const budgets = [makeBudget()]
    render(<BudgetPageClient {...defaultProps} initialBudgets={budgets} />)
    expect(screen.getByText('Active Budgets')).toBeInTheDocument()
  })

  it('renders month display for budgets', () => {
    const budgets = [makeBudget({ year: 2025, month: 3 })]
    render(<BudgetPageClient {...defaultProps} initialBudgets={budgets} />)
    expect(screen.getByText('March 2025')).toBeInTheDocument()
  })
})
