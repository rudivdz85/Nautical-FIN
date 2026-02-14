import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActualsPageClient } from '@/app/(auth)/actuals/actuals-page-client'
import type { Actual, Account, Category } from '@fin/core'

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

vi.mock('@/app/(auth)/actuals/actual-form', () => ({
  ActualForm: () => <div data-testid="actual-form" />,
}))

vi.mock('@/app/(auth)/actuals/actual-delete-dialog', () => ({
  ActualDeleteDialog: () => <div data-testid="actual-delete-dialog" />,
}))

vi.mock('@/app/(auth)/actuals/actual-detail-sheet', () => ({
  ActualDetailSheet: () => <div data-testid="actual-detail-sheet" />,
}))

function makeActual(overrides: Partial<Actual> = {}): Actual {
  return {
    id: 'actual-1',
    userId: 'user-1',
    budgetId: null,
    year: 2025,
    month: 3,
    status: 'open',
    totalIncome: '30000.00',
    totalExpenses: '22000.00',
    netSavings: '8000.00',
    reconciledAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Actual
}

const defaultProps = {
  initialActuals: [] as Actual[],
  accounts: [] as Account[],
  categories: [] as Category[],
}

describe('ActualsPageClient', () => {
  it('renders the page title', () => {
    render(<ActualsPageClient {...defaultProps} />)
    expect(screen.getByText('Actuals & Retro')).toBeInTheDocument()
  })

  it('shows empty state when no actuals', () => {
    render(<ActualsPageClient {...defaultProps} />)
    expect(screen.getByText('No month-end reviews yet')).toBeInTheDocument()
  })

  it('renders the Start Review button', () => {
    render(<ActualsPageClient {...defaultProps} />)
    expect(screen.getByText('Start Review')).toBeInTheDocument()
  })

  it('renders actual rows in the table', () => {
    const actuals = [
      makeActual({ status: 'open' }),
      makeActual({ id: 'actual-2', year: 2025, month: 2, status: 'closed' }),
    ]
    render(<ActualsPageClient {...defaultProps} initialActuals={actuals} />)
    expect(screen.getByText('March 2025')).toBeInTheDocument()
    expect(screen.getByText('February 2025')).toBeInTheDocument()
  })

  it('renders summary cards', () => {
    const actuals = [makeActual()]
    render(<ActualsPageClient {...defaultProps} initialActuals={actuals} />)
    expect(screen.getByText('Open Reviews')).toBeInTheDocument()
    expect(screen.getByText('Total Income')).toBeInTheDocument()
    expect(screen.getByText('Total Expenses')).toBeInTheDocument()
  })

  it('renders status badges', () => {
    const actuals = [makeActual({ status: 'open' })]
    render(<ActualsPageClient {...defaultProps} initialActuals={actuals} />)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })
})
