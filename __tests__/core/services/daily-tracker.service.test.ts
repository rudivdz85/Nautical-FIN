import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dailyTrackerService } from '../../../packages/core/src/services/daily-tracker.service'
import { dailyTrackerRepository } from '../../../packages/core/src/repositories/daily-tracker.repository'
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
})
