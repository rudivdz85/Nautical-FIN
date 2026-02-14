import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dailyTrackerService } from '../../../packages/core/src/services/daily-tracker.service'
import { dailyTrackerRepository } from '../../../packages/core/src/repositories/daily-tracker.repository'
import { recurringTransactionsRepository } from '../../../packages/core/src/repositories/recurring-transactions.repository'
import { budgetsRepository } from '../../../packages/core/src/repositories/budgets.repository'
import { accountsRepository } from '../../../packages/core/src/repositories/accounts.repository'
import { transactionsRepository } from '../../../packages/core/src/repositories/transactions.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { DailyTrackerEntry } from '../../../packages/core/src/types/daily-tracker'

vi.mock('../../../packages/core/src/repositories/daily-tracker.repository', () => ({
  dailyTrackerRepository: {
    findByUserAndDateRange: vi.fn(),
    findByUserAndDate: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteByUserAndDateRange: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/recurring-transactions.repository', () => ({
  recurringTransactionsRepository: {
    findByUserId: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/budgets.repository', () => ({
  budgetsRepository: {
    findByUserId: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/accounts.repository', () => ({
  accountsRepository: {
    findByUserId: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/transactions.repository', () => ({
  transactionsRepository: {
    findByUserId: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof dailyTrackerService.getRange>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_ENTRY_ID = '22222222-2222-2222-2222-222222222222'

function makeEntry(overrides: Partial<DailyTrackerEntry> = {}): DailyTrackerEntry {
  return {
    id: TEST_ENTRY_ID,
    userId: TEST_USER_ID,
    date: '2025-02-15',
    expectedIncome: '0',
    expectedDebtPayments: '0',
    expectedExpenses: '0',
    predictedSpend: '150.00',
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

describe('dailyTrackerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRange', () => {
    it('returns entries for date range', async () => {
      const entries = [makeEntry(), makeEntry({ id: 'entry-2', date: '2025-02-16' })]
      vi.mocked(dailyTrackerRepository.findByUserAndDateRange).mockResolvedValue(entries)

      const result = await dailyTrackerService.getRange(
        mockDb, TEST_USER_ID, '2025-02-15', '2025-02-16',
      )

      expect(result).toHaveLength(2)
      expect(dailyTrackerRepository.findByUserAndDateRange).toHaveBeenCalledWith(
        mockDb, TEST_USER_ID, '2025-02-15', '2025-02-16',
      )
    })
  })

  describe('getByDate', () => {
    it('returns entry for specific date', async () => {
      const entry = makeEntry()
      vi.mocked(dailyTrackerRepository.findByUserAndDate).mockResolvedValue(entry)

      const result = await dailyTrackerService.getByDate(mockDb, TEST_USER_ID, '2025-02-15')

      expect(result).toEqual(entry)
    })

    it('returns null when no entry exists', async () => {
      vi.mocked(dailyTrackerRepository.findByUserAndDate).mockResolvedValue(undefined)

      const result = await dailyTrackerService.getByDate(mockDb, TEST_USER_ID, '2025-02-15')

      expect(result).toBeNull()
    })
  })

  describe('getById', () => {
    it('returns entry when found', async () => {
      vi.mocked(dailyTrackerRepository.findById).mockResolvedValue(makeEntry())

      const result = await dailyTrackerService.getById(mockDb, TEST_ENTRY_ID, TEST_USER_ID)

      expect(result.id).toBe(TEST_ENTRY_ID)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(dailyTrackerRepository.findById).mockResolvedValue(undefined)

      await expect(
        dailyTrackerService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates an entry', async () => {
      const entry = makeEntry()
      vi.mocked(dailyTrackerRepository.findByUserAndDate).mockResolvedValue(undefined)
      vi.mocked(dailyTrackerRepository.create).mockResolvedValue(entry)

      const result = await dailyTrackerService.create(mockDb, TEST_USER_ID, {
        date: '2025-02-15',
        runningBalance: '5000.00',
        predictedSpend: '150.00',
      })

      expect(result).toEqual(entry)
      expect(dailyTrackerRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          date: '2025-02-15',
          runningBalance: '5000.00',
          predictedSpend: '150.00',
        }),
      )
    })

    it('creates a payday entry with income details', async () => {
      vi.mocked(dailyTrackerRepository.findByUserAndDate).mockResolvedValue(undefined)
      vi.mocked(dailyTrackerRepository.create).mockResolvedValue(
        makeEntry({ isPayday: true, expectedIncome: '25000.00' }),
      )

      await dailyTrackerService.create(mockDb, TEST_USER_ID, {
        date: '2025-02-25',
        isPayday: true,
        expectedIncome: '25000.00',
        runningBalance: '30000.00',
        incomeDetails: { salary: '25000.00' },
      })

      expect(dailyTrackerRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          isPayday: true,
          expectedIncome: '25000.00',
        }),
      )
    })

    it('throws ValidationError for duplicate date', async () => {
      vi.mocked(dailyTrackerRepository.findByUserAndDate).mockResolvedValue(makeEntry())

      await expect(
        dailyTrackerService.create(mockDb, TEST_USER_ID, {
          date: '2025-02-15',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid date format', async () => {
      await expect(
        dailyTrackerService.create(mockDb, TEST_USER_ID, {
          date: '15/02/2025',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid amount format', async () => {
      await expect(
        dailyTrackerService.create(mockDb, TEST_USER_ID, {
          date: '2025-02-15',
          runningBalance: 'abc',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('update', () => {
    it('updates entry fields', async () => {
      const existing = makeEntry()
      const updated = makeEntry({ manualOverride: '200.00' })
      vi.mocked(dailyTrackerRepository.findById).mockResolvedValue(existing)
      vi.mocked(dailyTrackerRepository.update).mockResolvedValue(updated)

      const result = await dailyTrackerService.update(
        mockDb, TEST_ENTRY_ID, TEST_USER_ID,
        { manualOverride: '200.00' },
      )

      expect(result.manualOverride).toBe('200.00')
    })

    it('throws NotFoundError when entry does not exist', async () => {
      vi.mocked(dailyTrackerRepository.findById).mockResolvedValue(undefined)

      await expect(
        dailyTrackerService.update(mockDb, 'nonexistent', TEST_USER_ID, {
          runningBalance: '1000.00',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        dailyTrackerService.update(mockDb, TEST_ENTRY_ID, TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('clearRange', () => {
    it('deletes entries in date range', async () => {
      vi.mocked(dailyTrackerRepository.deleteByUserAndDateRange).mockResolvedValue(30)

      const result = await dailyTrackerService.clearRange(
        mockDb, TEST_USER_ID, '2025-02-01', '2025-03-02',
      )

      expect(result).toBe(30)
    })
  })

  describe('delete', () => {
    it('deletes an entry', async () => {
      vi.mocked(dailyTrackerRepository.delete).mockResolvedValue(true)

      await expect(
        dailyTrackerService.delete(mockDb, TEST_ENTRY_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when entry does not exist', async () => {
      vi.mocked(dailyTrackerRepository.delete).mockResolvedValue(false)

      await expect(
        dailyTrackerService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('generateRange', () => {
    function setupGenerateMocks({
      recurring = [],
      budgets = [],
      accounts = [],
      recentTxns = [],
    }: {
      recurring?: Array<Record<string, unknown>>
      budgets?: Array<Record<string, unknown>>
      accounts?: Array<Record<string, unknown>>
      recentTxns?: Array<Record<string, unknown>>
    } = {}) {
      vi.mocked(recurringTransactionsRepository.findByUserId).mockResolvedValue(recurring as never)
      vi.mocked(budgetsRepository.findByUserId).mockResolvedValue(budgets as never)
      vi.mocked(accountsRepository.findByUserId).mockResolvedValue(accounts as never)
      vi.mocked(transactionsRepository.findByUserId).mockResolvedValue(recentTxns as never)
      vi.mocked(dailyTrackerRepository.deleteByUserAndDateRange).mockResolvedValue(0)

      let callCount = 0
      vi.mocked(dailyTrackerRepository.create).mockImplementation((_db, data) => {
        callCount++
        return Promise.resolve(makeEntry({
          id: `gen-${callCount}`,
          ...(data as Partial<DailyTrackerEntry>),
        }))
      })
    }

    it('generates entries for each day in range', async () => {
      setupGenerateMocks()

      const result = await dailyTrackerService.generateRange(
        mockDb, TEST_USER_ID, '2025-02-10', '2025-02-16',
      )

      expect(result).toHaveLength(7)
      expect(dailyTrackerRepository.create).toHaveBeenCalledTimes(7)
    })

    it('clears existing entries before generating', async () => {
      setupGenerateMocks()
      vi.mocked(dailyTrackerRepository.deleteByUserAndDateRange).mockResolvedValue(5)

      await dailyTrackerService.generateRange(
        mockDb, TEST_USER_ID, '2025-02-10', '2025-02-16',
      )

      expect(dailyTrackerRepository.deleteByUserAndDateRange).toHaveBeenCalledWith(
        mockDb, TEST_USER_ID, '2025-02-10', '2025-02-16',
      )
    })

    it('marks paydays based on recurring income', async () => {
      setupGenerateMocks({
        recurring: [
          {
            id: 'rec-1',
            name: 'Salary',
            transactionType: 'credit',
            frequency: 'monthly',
            dayOfMonth: 25,
            dayOfWeek: null,
            amount: '30000.00',
            amountMax: null,
          },
        ],
      })

      const result = await dailyTrackerService.generateRange(
        mockDb, TEST_USER_ID, '2025-02-23', '2025-02-27',
      )

      const payday = result.find((e) => e.date === '2025-02-25')
      const nonPayday = result.find((e) => e.date === '2025-02-23')

      expect(payday?.isPayday).toBe(true)
      expect(payday?.expectedIncome).toBe('30000.00')
      expect(nonPayday?.isPayday).toBe(false)
      expect(nonPayday?.expectedIncome).toBe('0.00')
    })

    it('computes running balance correctly', async () => {
      setupGenerateMocks({
        accounts: [
          { id: 'acc-1', classification: 'spending', currentBalance: '10000.00', accountType: 'cheque', creditLimit: null },
        ],
      })

      const result = await dailyTrackerService.generateRange(
        mockDb, TEST_USER_ID, '2025-02-10', '2025-02-12',
      )

      expect(result).toHaveLength(3)
      // Starting balance 10000, no income/expenses/debt, no historical spend → balance stays 10000
      for (const entry of result) {
        expect(parseFloat(entry.runningBalance ?? '0')).toBe(10000)
      }
    })

    it('handles no budget and no recurring transactions', async () => {
      setupGenerateMocks()

      const result = await dailyTrackerService.generateRange(
        mockDb, TEST_USER_ID, '2025-02-10', '2025-02-10',
      )

      expect(result).toHaveLength(1)
      expect(result[0]?.expectedIncome).toBe('0.00')
      expect(result[0]?.expectedExpenses).toBe('0.00')
      expect(result[0]?.expectedDebtPayments).toBe('0.00')
      expect(result[0]?.isPayday).toBe(false)
    })

    it('uses budget for daily expense allocation', async () => {
      setupGenerateMocks({
        budgets: [
          { id: 'bud-1', status: 'active', totalPlannedExpenses: '28000.00' },
        ],
      })

      const result = await dailyTrackerService.generateRange(
        mockDb, TEST_USER_ID, '2025-02-15', '2025-02-15',
      )

      // Feb 2025 has 28 days, so daily expense = 28000 / 28 = 1000
      expect(parseFloat(result[0]?.expectedExpenses ?? '0')).toBeCloseTo(1000, 0)
    })

    it('sets alerts when running balance goes negative', async () => {
      setupGenerateMocks({
        budgets: [
          { id: 'bud-1', status: 'active', totalPlannedExpenses: '300000.00' },
        ],
      })

      const result = await dailyTrackerService.generateRange(
        mockDb, TEST_USER_ID, '2025-02-15', '2025-02-15',
      )

      expect(result[0]?.hasAlerts).toBe(true)
      expect(result[0]?.alerts).toBeTruthy()
    })
  })
})
