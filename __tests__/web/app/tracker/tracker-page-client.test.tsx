import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TrackerPageClient } from '@/app/(auth)/tracker/tracker-page-client'
import { apiClient } from '@/lib/api-client'
import { getWeekRange } from '@/lib/format'
import type { DailyTrackerEntry } from '@fin/core'

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

vi.mock('@/app/(auth)/tracker/tracker-day-detail', () => ({
  TrackerDayDetail: () => <div data-testid="tracker-day-detail" />,
}))

const { start: currentWeekStart } = getWeekRange(new Date())

function weekDay(offset: number): string {
  const d = new Date(currentWeekStart + 'T12:00:00')
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0] ?? ''
}

function makeEntry(overrides: Partial<DailyTrackerEntry> = {}): DailyTrackerEntry {
  return {
    id: 'entry-1',
    userId: 'user-1',
    date: currentWeekStart,
    expectedIncome: '0',
    expectedExpenses: '500.00',
    expectedDebtPayments: '0',
    predictedSpend: '100.00',
    manualOverride: null,
    runningBalance: '5000.00',
    hasAlerts: false,
    alerts: null,
    isPayday: false,
    incomeDetails: null,
    debtDetails: null,
    expenseDetails: null,
    calculatedAt: new Date(),
    ...overrides,
  }
}

const mockGet = vi.mocked(apiClient.get)

describe('TrackerPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page title', async () => {
    mockGet.mockResolvedValueOnce([])
    render(<TrackerPageClient />)
    expect(screen.getByText('Daily Tracker')).toBeInTheDocument()
  })

  it('shows empty state when API returns no entries', async () => {
    mockGet.mockResolvedValueOnce([])
    render(<TrackerPageClient />)

    await waitFor(() => {
      expect(screen.getByText('No tracker data for this week')).toBeInTheDocument()
    })
  })

  it('renders entries in the table', async () => {
    const entries = [
      makeEntry({ date: weekDay(0), expectedIncome: '30000.00', isPayday: true }),
      makeEntry({ id: 'entry-2', date: weekDay(1), expectedExpenses: '1000.00' }),
    ]
    mockGet.mockResolvedValueOnce(entries)
    render(<TrackerPageClient />)

    await waitFor(() => {
      expect(screen.getByText('Payday')).toBeInTheDocument()
    })
  })

  it('renders summary cards', async () => {
    mockGet.mockResolvedValueOnce([])
    render(<TrackerPageClient />)
    expect(screen.getByText('Income')).toBeInTheDocument()
    expect(screen.getByText('Expenses')).toBeInTheDocument()
    expect(screen.getByText('Debt Payments')).toBeInTheDocument()
    expect(screen.getByText('Week-End Balance')).toBeInTheDocument()
  })

  it('renders navigation buttons', async () => {
    mockGet.mockResolvedValueOnce([])
    render(<TrackerPageClient />)
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Generate')).toBeInTheDocument()
    expect(screen.getByText('Previous week')).toBeInTheDocument()
    expect(screen.getByText('Next week')).toBeInTheDocument()
  })

  it('fetches new data when navigating weeks', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue([])
    render(<TrackerPageClient />)

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    await user.click(screen.getByText('Next week'))

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2)
    })
  })

  it('shows alert badge for entries with alerts', async () => {
    const entries = [
      makeEntry({ date: weekDay(0), hasAlerts: true, alerts: { lowBalance: true } }),
    ]
    mockGet.mockResolvedValueOnce(entries)
    render(<TrackerPageClient />)

    await waitFor(() => {
      expect(screen.getByText('Alert')).toBeInTheDocument()
    })
  })
})
