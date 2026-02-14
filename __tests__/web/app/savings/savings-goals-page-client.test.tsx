import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SavingsGoalsPageClient } from '@/app/(auth)/savings/savings-goals-page-client'
import type { SavingsGoal, Account } from '@fin/core'

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

vi.mock('@/app/(auth)/savings/savings-goal-form', () => ({
  SavingsGoalForm: () => <div data-testid="savings-goal-form" />,
}))

vi.mock('@/app/(auth)/savings/savings-goal-delete-dialog', () => ({
  SavingsGoalDeleteDialog: () => <div data-testid="savings-goal-delete-dialog" />,
}))

vi.mock('@/app/(auth)/savings/savings-goal-detail-sheet', () => ({
  SavingsGoalDetailSheet: () => <div data-testid="savings-goal-detail-sheet" />,
}))

function makeGoal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: 'goal-1',
    userId: 'user-1',
    linkedAccountId: null,
    name: 'Emergency Fund',
    goalType: 'emergency',
    targetAmount: '50000.00',
    currentAmount: '15000.00',
    targetDate: null,
    targetMonthsOfExpenses: null,
    monthlyContribution: '2000.00',
    priority: 1,
    isActive: true,
    isCompleted: false,
    completedAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SavingsGoal
}

const defaultProps = {
  initialGoals: [] as SavingsGoal[],
  accounts: [] as Account[],
}

describe('SavingsGoalsPageClient', () => {
  it('renders the page title', () => {
    render(<SavingsGoalsPageClient {...defaultProps} />)
    expect(screen.getByText('Savings Goals')).toBeInTheDocument()
  })

  it('shows empty state when no goals', () => {
    render(<SavingsGoalsPageClient {...defaultProps} />)
    expect(screen.getByText('No savings goals yet')).toBeInTheDocument()
  })

  it('renders the Add Goal button', () => {
    render(<SavingsGoalsPageClient {...defaultProps} />)
    expect(screen.getByText('Add Goal')).toBeInTheDocument()
  })

  it('renders goal names in the table', () => {
    const goals = [
      makeGoal({ name: 'Rainy Day Fund', goalType: 'emergency' }),
      makeGoal({ id: 'goal-2', name: 'Holiday', goalType: 'specific' }),
    ]
    render(<SavingsGoalsPageClient {...defaultProps} initialGoals={goals} />)
    expect(screen.getByText('Rainy Day Fund')).toBeInTheDocument()
    expect(screen.getByText('Holiday')).toBeInTheDocument()
  })

  it('renders summary cards with data', () => {
    const goals = [makeGoal()]
    render(<SavingsGoalsPageClient {...defaultProps} initialGoals={goals} />)
    expect(screen.getByText('Total Saved')).toBeInTheDocument()
    expect(screen.getByText('Monthly Target')).toBeInTheDocument()
  })

  it('renders goal type', () => {
    const goals = [makeGoal({ name: 'My Savings', goalType: 'general' })]
    render(<SavingsGoalsPageClient {...defaultProps} initialGoals={goals} />)
    expect(screen.getByText('General Savings')).toBeInTheDocument()
  })
})
