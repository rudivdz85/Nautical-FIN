import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardPageClient } from '@/app/(auth)/dashboard/dashboard-page-client'
import type { Budget, Transaction, SavingsGoal, Task } from '@fin/core'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue([]),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
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

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'budget-1',
    userId: 'user-1',
    year: 2025,
    month: 3,
    status: 'active',
    totalPlannedIncome: '10000.00',
    totalPlannedExpenses: '8000.00',
    unallocatedAmount: '2000.00',
    financialMonthStartDay: 25,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Budget
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-1',
    userId: 'user-1',
    accountId: 'acc-1',
    categoryId: null,
    description: 'Test Transaction',
    amount: '500.00',
    transactionType: 'debit',
    transactionDate: '2025-03-10',
    source: 'manual',
    merchantNormalized: null,
    aiCategoryConfidence: null,
    aiCategoryStatus: null,
    duplicateHash: null,
    isReconciled: false,
    notes: null,
    statementImportId: null,
    recurringTransactionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Transaction
}

function makeGoal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Emergency Fund',
    goalType: 'emergency',
    targetAmount: '50000.00',
    currentAmount: '15000.00',
    monthlyContribution: '2000.00',
    linkedAccountId: null,
    targetDate: null,
    isActive: true,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SavingsGoal
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    userId: 'user-1',
    title: 'Review budget',
    description: 'Check your March budget',
    taskType: 'review',
    priority: 'medium',
    status: 'pending',
    dueDate: '2025-03-15',
    snoozedUntil: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Task
}

const defaultProps = {
  netWorth: 100000,
  availableToSpend: 5000,
  totalSavings: 25000,
  totalDebt: 30000,
  activeBudget: null as Budget | null,
  recentTransactions: [] as Transaction[],
  savingsGoals: [] as SavingsGoal[],
  pendingTasks: [] as Task[],
  unreadInsights: [],
  netWorthSnapshots: [],
  categories: [],
  monthlyActuals: [],
}

describe('DashboardPageClient', () => {
  describe('metric cards', () => {
    it('renders net worth', () => {
      render(<DashboardPageClient {...defaultProps} />)
      expect(screen.getByText('Net Worth')).toBeInTheDocument()
    })

    it('renders available to spend', () => {
      render(<DashboardPageClient {...defaultProps} />)
      expect(screen.getByText('Available to Spend')).toBeInTheDocument()
    })

    it('renders total savings', () => {
      render(<DashboardPageClient {...defaultProps} />)
      expect(screen.getByText('Total Savings')).toBeInTheDocument()
    })

    it('renders total debt', () => {
      render(<DashboardPageClient {...defaultProps} />)
      expect(screen.getByText('Total Debt')).toBeInTheDocument()
    })
  })

  describe('budget section', () => {
    it('shows empty state when no active budget', () => {
      render(<DashboardPageClient {...defaultProps} activeBudget={null} />)
      expect(screen.getByText('No active budget this month.')).toBeInTheDocument()
    })

    it('shows budget details when active budget exists', () => {
      const budget = makeBudget()
      render(<DashboardPageClient {...defaultProps} activeBudget={budget} />)
      expect(screen.getByText('Monthly Budget')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  describe('recent transactions', () => {
    it('shows empty state when no transactions', () => {
      render(<DashboardPageClient {...defaultProps} />)
      expect(screen.getByText('No recent transactions.')).toBeInTheDocument()
    })

    it('renders transaction descriptions', () => {
      const transactions = [
        makeTransaction({ description: 'Woolworths' }),
        makeTransaction({ id: 'txn-2', description: 'Checkers' }),
      ]
      render(<DashboardPageClient {...defaultProps} recentTransactions={transactions} />)
      expect(screen.getByText('Woolworths')).toBeInTheDocument()
      expect(screen.getByText('Checkers')).toBeInTheDocument()
    })
  })

  describe('savings goals', () => {
    it('shows empty state when no goals', () => {
      render(<DashboardPageClient {...defaultProps} />)
      expect(screen.getByText('No active savings goals.')).toBeInTheDocument()
    })

    it('renders goal names and amounts', () => {
      const goals = [makeGoal({ name: 'Emergency Fund' })]
      render(<DashboardPageClient {...defaultProps} savingsGoals={goals} />)
      expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
    })
  })

  describe('tasks', () => {
    it('shows empty state when no tasks', () => {
      render(<DashboardPageClient {...defaultProps} />)
      expect(screen.getByText('No pending tasks.')).toBeInTheDocument()
    })

    it('renders task titles', () => {
      const tasks = [makeTask({ title: 'Review budget' })]
      render(<DashboardPageClient {...defaultProps} pendingTasks={tasks} />)
      expect(screen.getByText('Review budget')).toBeInTheDocument()
    })
  })

  it('renders the Snapshot and Analyze buttons', () => {
    render(<DashboardPageClient {...defaultProps} />)
    expect(screen.getByText('Snapshot')).toBeInTheDocument()
    expect(screen.getByText('Analyze')).toBeInTheDocument()
  })
})
