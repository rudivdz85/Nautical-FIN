import { describe, it, expect, vi, beforeEach } from 'vitest'
import { duplicateRulesService } from '../../../packages/core/src/services/duplicate-rules.service'
import { duplicateRulesRepository } from '../../../packages/core/src/repositories/duplicate-rules.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { DuplicateRule } from '../../../packages/core/src/types/duplicate-rules'

vi.mock('../../../packages/core/src/repositories/duplicate-rules.repository', () => ({
  duplicateRulesRepository: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof duplicateRulesService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_RULE_ID = '22222222-2222-2222-2222-222222222222'

function makeRule(overrides: Partial<DuplicateRule> = {}): DuplicateRule {
  return {
    id: TEST_RULE_ID,
    userId: TEST_USER_ID,
    merchantPattern: 'CHECKERS*',
    amount: null,
    action: 'skip',
    createdAt: new Date(),
    ...overrides,
  }
}

describe('duplicateRulesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns rules for user', async () => {
      const rules = [makeRule()]
      vi.mocked(duplicateRulesRepository.findByUserId).mockResolvedValue(rules)

      const result = await duplicateRulesService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(rules)
    })
  })

  describe('getById', () => {
    it('returns rule when found', async () => {
      const rule = makeRule()
      vi.mocked(duplicateRulesRepository.findById).mockResolvedValue(rule)

      const result = await duplicateRulesService.getById(mockDb, TEST_RULE_ID, TEST_USER_ID)

      expect(result.id).toBe(TEST_RULE_ID)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(duplicateRulesRepository.findById).mockResolvedValue(undefined)

      await expect(
        duplicateRulesService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a rule with merchantPattern', async () => {
      const rule = makeRule()
      vi.mocked(duplicateRulesRepository.create).mockResolvedValue(rule)

      const result = await duplicateRulesService.create(mockDb, TEST_USER_ID, {
        merchantPattern: 'CHECKERS*',
        action: 'skip',
      })

      expect(result).toEqual(rule)
      expect(duplicateRulesRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          merchantPattern: 'CHECKERS*',
          action: 'skip',
        }),
      )
    })

    it('creates a rule with amount', async () => {
      const rule = makeRule({ merchantPattern: null, amount: '50.00' })
      vi.mocked(duplicateRulesRepository.create).mockResolvedValue(rule)

      await duplicateRulesService.create(mockDb, TEST_USER_ID, {
        amount: '50.00',
        action: 'allow',
      })

      expect(duplicateRulesRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          amount: '50.00',
          action: 'allow',
        }),
      )
    })

    it('creates a rule with flag action', async () => {
      const rule = makeRule({ action: 'flag' })
      vi.mocked(duplicateRulesRepository.create).mockResolvedValue(rule)

      const result = await duplicateRulesService.create(mockDb, TEST_USER_ID, {
        merchantPattern: 'CHECKERS*',
        action: 'flag',
      })

      expect(result.action).toBe('flag')
    })

    it('throws ValidationError when no matching criterion provided', async () => {
      await expect(
        duplicateRulesService.create(mockDb, TEST_USER_ID, {
          action: 'skip',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid action', async () => {
      await expect(
        duplicateRulesService.create(mockDb, TEST_USER_ID, {
          merchantPattern: 'CHECKERS*',
          action: 'invalid',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid amount format', async () => {
      await expect(
        duplicateRulesService.create(mockDb, TEST_USER_ID, {
          amount: 'abc',
          action: 'skip',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('update', () => {
    it('updates rule action', async () => {
      const existing = makeRule()
      const updated = makeRule({ action: 'allow' })
      vi.mocked(duplicateRulesRepository.findById).mockResolvedValue(existing)
      vi.mocked(duplicateRulesRepository.update).mockResolvedValue(updated)

      const result = await duplicateRulesService.update(
        mockDb, TEST_RULE_ID, TEST_USER_ID, { action: 'allow' },
      )

      expect(result.action).toBe('allow')
    })

    it('updates merchant pattern', async () => {
      const existing = makeRule()
      const updated = makeRule({ merchantPattern: 'WOOLWORTHS*' })
      vi.mocked(duplicateRulesRepository.findById).mockResolvedValue(existing)
      vi.mocked(duplicateRulesRepository.update).mockResolvedValue(updated)

      const result = await duplicateRulesService.update(
        mockDb, TEST_RULE_ID, TEST_USER_ID, { merchantPattern: 'WOOLWORTHS*' },
      )

      expect(result.merchantPattern).toBe('WOOLWORTHS*')
    })

    it('throws NotFoundError when rule does not exist', async () => {
      vi.mocked(duplicateRulesRepository.findById).mockResolvedValue(undefined)

      await expect(
        duplicateRulesService.update(mockDb, 'nonexistent', TEST_USER_ID, { action: 'allow' }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        duplicateRulesService.update(mockDb, TEST_RULE_ID, TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('delete', () => {
    it('deletes a rule', async () => {
      vi.mocked(duplicateRulesRepository.delete).mockResolvedValue(true)

      await expect(
        duplicateRulesService.delete(mockDb, TEST_RULE_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when rule does not exist', async () => {
      vi.mocked(duplicateRulesRepository.delete).mockResolvedValue(false)

      await expect(
        duplicateRulesService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
