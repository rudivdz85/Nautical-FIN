import { describe, it, expect, vi, beforeEach } from 'vitest'
import { categorizationRulesService } from '../../../packages/core/src/services/categorization-rules.service'
import { categorizationRulesRepository } from '../../../packages/core/src/repositories/categorization-rules.repository'
import { categoriesRepository } from '../../../packages/core/src/repositories/categories.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { CategorizationRule } from '../../../packages/core/src/types/categorization-rules'
import type { Category } from '../../../packages/core/src/types/categories'

vi.mock('../../../packages/core/src/repositories/categorization-rules.repository', () => ({
  categorizationRulesRepository: {
    findByUserId: vi.fn(),
    findAllByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    incrementApplied: vi.fn(),
    incrementCorrected: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/categories.repository', () => ({
  categoriesRepository: {
    findByIdAndUserId: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof categorizationRulesService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_RULE_ID = '22222222-2222-2222-2222-222222222222'
const TEST_CATEGORY_ID = '33333333-3333-3333-3333-333333333333'

function makeRule(overrides: Partial<CategorizationRule> = {}): CategorizationRule {
  return {
    id: TEST_RULE_ID,
    userId: TEST_USER_ID,
    categoryId: TEST_CATEGORY_ID,
    merchantExact: 'Checkers',
    merchantPattern: null,
    descriptionPattern: null,
    amountMin: null,
    amountMax: null,
    priority: 50,
    confidence: '1.00',
    timesApplied: 0,
    timesCorrected: 0,
    isActive: true,
    isGlobal: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: TEST_CATEGORY_ID,
    userId: TEST_USER_ID,
    name: 'Groceries',
    categoryType: 'expense',
    icon: null,
    color: null,
    parentId: null,
    isDefault: false,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('categorizationRulesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns active rules for user', async () => {
      const rules = [makeRule()]
      vi.mocked(categorizationRulesRepository.findByUserId).mockResolvedValue(rules)

      const result = await categorizationRulesService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(rules)
    })
  })

  describe('listAll', () => {
    it('returns all rules including inactive', async () => {
      const rules = [makeRule(), makeRule({ isActive: false })]
      vi.mocked(categorizationRulesRepository.findAllByUserId).mockResolvedValue(rules)

      const result = await categorizationRulesService.listAll(mockDb, TEST_USER_ID)

      expect(result).toHaveLength(2)
    })
  })

  describe('getById', () => {
    it('returns rule when found', async () => {
      const rule = makeRule()
      vi.mocked(categorizationRulesRepository.findById).mockResolvedValue(rule)

      const result = await categorizationRulesService.getById(mockDb, TEST_RULE_ID, TEST_USER_ID)

      expect(result.id).toBe(TEST_RULE_ID)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(categorizationRulesRepository.findById).mockResolvedValue(undefined)

      await expect(
        categorizationRulesService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a rule with merchantExact', async () => {
      const rule = makeRule()
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(makeCategory())
      vi.mocked(categorizationRulesRepository.create).mockResolvedValue(rule)

      const result = await categorizationRulesService.create(mockDb, TEST_USER_ID, {
        categoryId: TEST_CATEGORY_ID,
        merchantExact: 'Checkers',
      })

      expect(result).toEqual(rule)
      expect(categorizationRulesRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          categoryId: TEST_CATEGORY_ID,
          merchantExact: 'Checkers',
          priority: 50,
          confidence: '1.00',
        }),
      )
    })

    it('creates a rule with merchantPattern', async () => {
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(makeCategory())
      vi.mocked(categorizationRulesRepository.create).mockResolvedValue(
        makeRule({ merchantExact: null, merchantPattern: 'CHECKERS*' }),
      )

      await categorizationRulesService.create(mockDb, TEST_USER_ID, {
        categoryId: TEST_CATEGORY_ID,
        merchantPattern: 'CHECKERS*',
      })

      expect(categorizationRulesRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          merchantPattern: 'CHECKERS*',
        }),
      )
    })

    it('creates a rule with descriptionPattern', async () => {
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(makeCategory())
      vi.mocked(categorizationRulesRepository.create).mockResolvedValue(
        makeRule({ merchantExact: null, descriptionPattern: 'grocery' }),
      )

      await categorizationRulesService.create(mockDb, TEST_USER_ID, {
        categoryId: TEST_CATEGORY_ID,
        descriptionPattern: 'grocery',
      })

      expect(categorizationRulesRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          descriptionPattern: 'grocery',
        }),
      )
    })

    it('creates a rule with amount range', async () => {
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(makeCategory())
      vi.mocked(categorizationRulesRepository.create).mockResolvedValue(
        makeRule({ amountMin: '100.00', amountMax: '500.00' }),
      )

      await categorizationRulesService.create(mockDb, TEST_USER_ID, {
        categoryId: TEST_CATEGORY_ID,
        merchantExact: 'Checkers',
        amountMin: '100.00',
        amountMax: '500.00',
      })

      expect(categorizationRulesRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          amountMin: '100.00',
          amountMax: '500.00',
        }),
      )
    })

    it('throws NotFoundError when category does not exist', async () => {
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(undefined)

      await expect(
        categorizationRulesService.create(mockDb, TEST_USER_ID, {
          categoryId: TEST_CATEGORY_ID,
          merchantExact: 'Checkers',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no matching criterion provided', async () => {
      await expect(
        categorizationRulesService.create(mockDb, TEST_USER_ID, {
          categoryId: TEST_CATEGORY_ID,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid categoryId format', async () => {
      await expect(
        categorizationRulesService.create(mockDb, TEST_USER_ID, {
          categoryId: 'not-a-uuid',
          merchantExact: 'Checkers',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid amount format', async () => {
      await expect(
        categorizationRulesService.create(mockDb, TEST_USER_ID, {
          categoryId: TEST_CATEGORY_ID,
          merchantExact: 'Checkers',
          amountMin: 'abc',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('update', () => {
    it('updates rule fields', async () => {
      const existing = makeRule()
      const updated = makeRule({ priority: 80 })
      vi.mocked(categorizationRulesRepository.findById).mockResolvedValue(existing)
      vi.mocked(categorizationRulesRepository.update).mockResolvedValue(updated)

      const result = await categorizationRulesService.update(
        mockDb, TEST_RULE_ID, TEST_USER_ID, { priority: 80 },
      )

      expect(result.priority).toBe(80)
    })

    it('validates category exists when updating categoryId', async () => {
      const newCategoryId = '44444444-4444-4444-4444-444444444444'
      vi.mocked(categorizationRulesRepository.findById).mockResolvedValue(makeRule())
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(undefined)

      await expect(
        categorizationRulesService.update(mockDb, TEST_RULE_ID, TEST_USER_ID, {
          categoryId: newCategoryId,
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('allows updating categoryId when category exists', async () => {
      const newCategoryId = '44444444-4444-4444-4444-444444444444'
      vi.mocked(categorizationRulesRepository.findById).mockResolvedValue(makeRule())
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(
        makeCategory({ id: newCategoryId }),
      )
      vi.mocked(categorizationRulesRepository.update).mockResolvedValue(
        makeRule({ categoryId: newCategoryId }),
      )

      const result = await categorizationRulesService.update(
        mockDb, TEST_RULE_ID, TEST_USER_ID, { categoryId: newCategoryId },
      )

      expect(result.categoryId).toBe(newCategoryId)
    })

    it('throws NotFoundError when rule does not exist', async () => {
      vi.mocked(categorizationRulesRepository.findById).mockResolvedValue(undefined)

      await expect(
        categorizationRulesService.update(mockDb, 'nonexistent', TEST_USER_ID, { priority: 80 }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        categorizationRulesService.update(mockDb, TEST_RULE_ID, TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })

    it('can deactivate a rule', async () => {
      vi.mocked(categorizationRulesRepository.findById).mockResolvedValue(makeRule())
      vi.mocked(categorizationRulesRepository.update).mockResolvedValue(
        makeRule({ isActive: false }),
      )

      const result = await categorizationRulesService.update(
        mockDb, TEST_RULE_ID, TEST_USER_ID, { isActive: false },
      )

      expect(result.isActive).toBe(false)
    })
  })

  describe('delete', () => {
    it('deletes a rule', async () => {
      vi.mocked(categorizationRulesRepository.delete).mockResolvedValue(true)

      await expect(
        categorizationRulesService.delete(mockDb, TEST_RULE_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when rule does not exist', async () => {
      vi.mocked(categorizationRulesRepository.delete).mockResolvedValue(false)

      await expect(
        categorizationRulesService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('recordApplied', () => {
    it('increments the applied counter', async () => {
      vi.mocked(categorizationRulesRepository.incrementApplied).mockResolvedValue(undefined)

      await categorizationRulesService.recordApplied(mockDb, TEST_RULE_ID, TEST_USER_ID)

      expect(categorizationRulesRepository.incrementApplied).toHaveBeenCalledWith(
        mockDb, TEST_RULE_ID, TEST_USER_ID,
      )
    })
  })

  describe('recordCorrected', () => {
    it('increments the corrected counter', async () => {
      vi.mocked(categorizationRulesRepository.incrementCorrected).mockResolvedValue(undefined)

      await categorizationRulesService.recordCorrected(mockDb, TEST_RULE_ID, TEST_USER_ID)

      expect(categorizationRulesRepository.incrementCorrected).toHaveBeenCalledWith(
        mockDb, TEST_RULE_ID, TEST_USER_ID,
      )
    })
  })
})
