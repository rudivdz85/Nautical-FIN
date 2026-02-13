import { describe, it, expect, vi, beforeEach } from 'vitest'
import { merchantMappingsService } from '../../../packages/core/src/services/merchant-mappings.service'
import { merchantMappingsRepository } from '../../../packages/core/src/repositories/merchant-mappings.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { MerchantMapping } from '../../../packages/core/src/types/merchant-mappings'

vi.mock('../../../packages/core/src/repositories/merchant-mappings.repository', () => ({
  merchantMappingsRepository: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    findByOriginalName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof merchantMappingsService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_MAPPING_ID = '22222222-2222-2222-2222-222222222222'

function makeMapping(overrides: Partial<MerchantMapping> = {}): MerchantMapping {
  return {
    id: TEST_MAPPING_ID,
    userId: TEST_USER_ID,
    originalName: 'CHECKERS HYPER 1234',
    normalizedName: 'Checkers',
    isGlobal: false,
    createdAt: new Date(),
    ...overrides,
  }
}

describe('merchantMappingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns mappings for user', async () => {
      const mappings = [makeMapping()]
      vi.mocked(merchantMappingsRepository.findByUserId).mockResolvedValue(mappings)

      const result = await merchantMappingsService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(mappings)
    })
  })

  describe('getById', () => {
    it('returns mapping when found', async () => {
      const mapping = makeMapping()
      vi.mocked(merchantMappingsRepository.findById).mockResolvedValue(mapping)

      const result = await merchantMappingsService.getById(mockDb, TEST_MAPPING_ID, TEST_USER_ID)

      expect(result.id).toBe(TEST_MAPPING_ID)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(merchantMappingsRepository.findById).mockResolvedValue(undefined)

      await expect(
        merchantMappingsService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a mapping', async () => {
      const mapping = makeMapping()
      vi.mocked(merchantMappingsRepository.findByOriginalName).mockResolvedValue(undefined)
      vi.mocked(merchantMappingsRepository.create).mockResolvedValue(mapping)

      const result = await merchantMappingsService.create(mockDb, TEST_USER_ID, {
        originalName: 'CHECKERS HYPER 1234',
        normalizedName: 'Checkers',
      })

      expect(result).toEqual(mapping)
      expect(merchantMappingsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          originalName: 'CHECKERS HYPER 1234',
          normalizedName: 'Checkers',
          isGlobal: false,
        }),
      )
    })

    it('throws ValidationError for duplicate original name', async () => {
      vi.mocked(merchantMappingsRepository.findByOriginalName).mockResolvedValue(makeMapping())

      await expect(
        merchantMappingsService.create(mockDb, TEST_USER_ID, {
          originalName: 'CHECKERS HYPER 1234',
          normalizedName: 'Checkers',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for empty original name', async () => {
      await expect(
        merchantMappingsService.create(mockDb, TEST_USER_ID, {
          originalName: '',
          normalizedName: 'Checkers',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for empty normalized name', async () => {
      await expect(
        merchantMappingsService.create(mockDb, TEST_USER_ID, {
          originalName: 'CHECKERS HYPER 1234',
          normalizedName: '',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('creates a global mapping', async () => {
      const mapping = makeMapping({ isGlobal: true })
      vi.mocked(merchantMappingsRepository.findByOriginalName).mockResolvedValue(undefined)
      vi.mocked(merchantMappingsRepository.create).mockResolvedValue(mapping)

      const result = await merchantMappingsService.create(mockDb, TEST_USER_ID, {
        originalName: 'CHECKERS HYPER 1234',
        normalizedName: 'Checkers',
        isGlobal: true,
      })

      expect(result.isGlobal).toBe(true)
    })
  })

  describe('update', () => {
    it('updates normalized name', async () => {
      const existing = makeMapping()
      const updated = makeMapping({ normalizedName: 'Checkers Hyper' })
      vi.mocked(merchantMappingsRepository.findById).mockResolvedValue(existing)
      vi.mocked(merchantMappingsRepository.update).mockResolvedValue(updated)

      const result = await merchantMappingsService.update(
        mockDb, TEST_MAPPING_ID, TEST_USER_ID,
        { normalizedName: 'Checkers Hyper' },
      )

      expect(result.normalizedName).toBe('Checkers Hyper')
    })

    it('throws NotFoundError when mapping does not exist', async () => {
      vi.mocked(merchantMappingsRepository.findById).mockResolvedValue(undefined)

      await expect(
        merchantMappingsService.update(mockDb, 'nonexistent', TEST_USER_ID, {
          normalizedName: 'Updated',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        merchantMappingsService.update(mockDb, TEST_MAPPING_ID, TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })

    it('can toggle global flag', async () => {
      vi.mocked(merchantMappingsRepository.findById).mockResolvedValue(makeMapping())
      vi.mocked(merchantMappingsRepository.update).mockResolvedValue(
        makeMapping({ isGlobal: true }),
      )

      const result = await merchantMappingsService.update(
        mockDb, TEST_MAPPING_ID, TEST_USER_ID,
        { isGlobal: true },
      )

      expect(result.isGlobal).toBe(true)
    })
  })

  describe('delete', () => {
    it('deletes a mapping', async () => {
      vi.mocked(merchantMappingsRepository.delete).mockResolvedValue(true)

      await expect(
        merchantMappingsService.delete(mockDb, TEST_MAPPING_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when mapping does not exist', async () => {
      vi.mocked(merchantMappingsRepository.delete).mockResolvedValue(false)

      await expect(
        merchantMappingsService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('resolve', () => {
    it('returns normalized name when mapping exists', async () => {
      vi.mocked(merchantMappingsRepository.findByOriginalName).mockResolvedValue(
        makeMapping({ normalizedName: 'Checkers' }),
      )

      const result = await merchantMappingsService.resolve(
        mockDb, TEST_USER_ID, 'CHECKERS HYPER 1234',
      )

      expect(result).toBe('Checkers')
    })

    it('returns original name when no mapping exists', async () => {
      vi.mocked(merchantMappingsRepository.findByOriginalName).mockResolvedValue(undefined)

      const result = await merchantMappingsService.resolve(
        mockDb, TEST_USER_ID, 'UNKNOWN MERCHANT',
      )

      expect(result).toBe('UNKNOWN MERCHANT')
    })
  })
})
