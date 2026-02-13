import { describe, it, expect, vi, beforeEach } from 'vitest'
import { netWorthSnapshotsService } from '../../../packages/core/src/services/net-worth-snapshots.service'
import { netWorthSnapshotsRepository } from '../../../packages/core/src/repositories/net-worth-snapshots.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { NetWorthSnapshot } from '../../../packages/core/src/types/net-worth-snapshots'

vi.mock('../../../packages/core/src/repositories/net-worth-snapshots.repository', () => ({
  netWorthSnapshotsRepository: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    findByDate: vi.fn(),
    findLatest: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof netWorthSnapshotsService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_SNAPSHOT_ID = '22222222-2222-2222-2222-222222222222'

function makeSnapshot(overrides: Partial<NetWorthSnapshot> = {}): NetWorthSnapshot {
  return {
    id: TEST_SNAPSHOT_ID,
    userId: TEST_USER_ID,
    snapshotDate: '2025-02-01',
    totalAssets: '50000.00',
    totalLiabilities: '20000.00',
    netWorth: '30000.00',
    totalCashSpend: null,
    totalCreditAvailable: null,
    totalSavings: null,
    totalDebt: null,
    breakdown: null,
    createdAt: new Date(),
    ...overrides,
  }
}

describe('netWorthSnapshotsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns snapshots for user', async () => {
      const snapshots = [makeSnapshot()]
      vi.mocked(netWorthSnapshotsRepository.findByUserId).mockResolvedValue(snapshots)

      const result = await netWorthSnapshotsService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(snapshots)
    })
  })

  describe('getById', () => {
    it('returns snapshot when found', async () => {
      const snapshot = makeSnapshot()
      vi.mocked(netWorthSnapshotsRepository.findById).mockResolvedValue(snapshot)

      const result = await netWorthSnapshotsService.getById(mockDb, TEST_SNAPSHOT_ID, TEST_USER_ID)

      expect(result.id).toBe(TEST_SNAPSHOT_ID)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(netWorthSnapshotsRepository.findById).mockResolvedValue(undefined)

      await expect(
        netWorthSnapshotsService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('getLatest', () => {
    it('returns latest snapshot', async () => {
      const snapshot = makeSnapshot()
      vi.mocked(netWorthSnapshotsRepository.findLatest).mockResolvedValue(snapshot)

      const result = await netWorthSnapshotsService.getLatest(mockDb, TEST_USER_ID)

      expect(result).toEqual(snapshot)
    })

    it('returns null when no snapshots exist', async () => {
      vi.mocked(netWorthSnapshotsRepository.findLatest).mockResolvedValue(undefined)

      const result = await netWorthSnapshotsService.getLatest(mockDb, TEST_USER_ID)

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('creates a snapshot', async () => {
      const snapshot = makeSnapshot()
      vi.mocked(netWorthSnapshotsRepository.findByDate).mockResolvedValue(undefined)
      vi.mocked(netWorthSnapshotsRepository.create).mockResolvedValue(snapshot)

      const result = await netWorthSnapshotsService.create(mockDb, TEST_USER_ID, {
        snapshotDate: '2025-02-01',
        totalAssets: '50000.00',
        totalLiabilities: '20000.00',
        netWorth: '30000.00',
      })

      expect(result).toEqual(snapshot)
      expect(netWorthSnapshotsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          snapshotDate: '2025-02-01',
          totalAssets: '50000.00',
          totalLiabilities: '20000.00',
          netWorth: '30000.00',
        }),
      )
    })

    it('creates a snapshot with all optional fields', async () => {
      vi.mocked(netWorthSnapshotsRepository.findByDate).mockResolvedValue(undefined)
      vi.mocked(netWorthSnapshotsRepository.create).mockResolvedValue(
        makeSnapshot({
          totalCashSpend: '15000.00',
          totalCreditAvailable: '10000.00',
          totalSavings: '25000.00',
          totalDebt: '20000.00',
        }),
      )

      await netWorthSnapshotsService.create(mockDb, TEST_USER_ID, {
        snapshotDate: '2025-02-01',
        totalAssets: '50000.00',
        totalLiabilities: '20000.00',
        netWorth: '30000.00',
        totalCashSpend: '15000.00',
        totalCreditAvailable: '10000.00',
        totalSavings: '25000.00',
        totalDebt: '20000.00',
        breakdown: { cheque: '15000.00', savings: '25000.00', credit: '-10000.00' },
      })

      expect(netWorthSnapshotsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          totalCashSpend: '15000.00',
          totalCreditAvailable: '10000.00',
          totalSavings: '25000.00',
          totalDebt: '20000.00',
        }),
      )
    })

    it('throws ValidationError for duplicate snapshot date', async () => {
      vi.mocked(netWorthSnapshotsRepository.findByDate).mockResolvedValue(makeSnapshot())

      await expect(
        netWorthSnapshotsService.create(mockDb, TEST_USER_ID, {
          snapshotDate: '2025-02-01',
          totalAssets: '50000.00',
          totalLiabilities: '20000.00',
          netWorth: '30000.00',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid date format', async () => {
      await expect(
        netWorthSnapshotsService.create(mockDb, TEST_USER_ID, {
          snapshotDate: '01/02/2025',
          totalAssets: '50000.00',
          totalLiabilities: '20000.00',
          netWorth: '30000.00',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid amount format', async () => {
      await expect(
        netWorthSnapshotsService.create(mockDb, TEST_USER_ID, {
          snapshotDate: '2025-02-01',
          totalAssets: 'abc',
          totalLiabilities: '20000.00',
          netWorth: '30000.00',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for missing required fields', async () => {
      await expect(
        netWorthSnapshotsService.create(mockDb, TEST_USER_ID, {
          snapshotDate: '2025-02-01',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('delete', () => {
    it('deletes a snapshot', async () => {
      vi.mocked(netWorthSnapshotsRepository.delete).mockResolvedValue(true)

      await expect(
        netWorthSnapshotsService.delete(mockDb, TEST_SNAPSHOT_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when snapshot does not exist', async () => {
      vi.mocked(netWorthSnapshotsRepository.delete).mockResolvedValue(false)

      await expect(
        netWorthSnapshotsService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
