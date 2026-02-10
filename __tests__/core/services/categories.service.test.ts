import { describe, it, expect, vi, beforeEach } from 'vitest'
import { categoriesService } from '../../../packages/core/src/services/categories.service'
import { categoriesRepository } from '../../../packages/core/src/repositories/categories.repository'
import { NotFoundError, ValidationError, ForbiddenError } from '../../../packages/core/src/errors/index'
import type { Category } from '../../../packages/core/src/types/categories'

vi.mock('../../../packages/core/src/repositories/categories.repository', () => ({
  categoriesRepository: {
    findByUserId: vi.fn(),
    findByUserIdAndType: vi.fn(),
    findById: vi.fn(),
    findByIdAndUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof categoriesService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    userId: TEST_USER_ID,
    name: 'Groceries',
    categoryType: 'expense',
    parentId: null,
    icon: 'shopping-cart',
    color: null,
    isSystem: true,
    isHidden: false,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('categoriesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns all categories for user', async () => {
      const categories = [makeCategory(), makeCategory({ id: '33333333-3333-3333-3333-333333333333', name: 'Salary', categoryType: 'income' })]
      vi.mocked(categoriesRepository.findByUserId).mockResolvedValue(categories)

      const result = await categoriesService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(categories)
      expect(categoriesRepository.findByUserId).toHaveBeenCalledWith(mockDb, TEST_USER_ID)
    })

    it('filters by type when provided', async () => {
      const expenses = [makeCategory()]
      vi.mocked(categoriesRepository.findByUserIdAndType).mockResolvedValue(expenses)

      const result = await categoriesService.list(mockDb, TEST_USER_ID, 'expense')

      expect(result).toEqual(expenses)
      expect(categoriesRepository.findByUserIdAndType).toHaveBeenCalledWith(mockDb, TEST_USER_ID, 'expense')
    })

    it('returns empty array when no categories', async () => {
      vi.mocked(categoriesRepository.findByUserId).mockResolvedValue([])

      const result = await categoriesService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual([])
    })
  })

  describe('getById', () => {
    it('returns category when found', async () => {
      const category = makeCategory()
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(category)

      const result = await categoriesService.getById(mockDb, category.id, TEST_USER_ID)

      expect(result).toEqual(category)
    })

    it('throws NotFoundError when category does not exist', async () => {
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(undefined)

      await expect(
        categoriesService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a custom expense category', async () => {
      const created = makeCategory({ isSystem: false, name: 'Hobbies' })
      vi.mocked(categoriesRepository.create).mockResolvedValue(created)

      const result = await categoriesService.create(mockDb, TEST_USER_ID, {
        name: 'Hobbies',
        categoryType: 'expense',
        icon: 'gamepad',
      })

      expect(result).toEqual(created)
      expect(categoriesRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          name: 'Hobbies',
          categoryType: 'expense',
          isSystem: false,
          icon: 'gamepad',
        }),
      )
    })

    it('creates a custom income category', async () => {
      const created = makeCategory({ isSystem: false, name: 'Rental Income', categoryType: 'income' })
      vi.mocked(categoriesRepository.create).mockResolvedValue(created)

      const result = await categoriesService.create(mockDb, TEST_USER_ID, {
        name: 'Rental Income',
        categoryType: 'income',
      })

      expect(result).toEqual(created)
    })

    it('creates a sub-category when parentId is valid', async () => {
      const parent = makeCategory({ id: '44444444-4444-4444-4444-444444444444', categoryType: 'expense' })
      const child = makeCategory({ isSystem: false, name: 'Fuel', parentId: parent.id })
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(parent)
      vi.mocked(categoriesRepository.create).mockResolvedValue(child)

      const result = await categoriesService.create(mockDb, TEST_USER_ID, {
        name: 'Fuel',
        categoryType: 'expense',
        parentId: parent.id,
      })

      expect(result.parentId).toBe(parent.id)
    })

    it('throws NotFoundError when parent category does not exist', async () => {
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(undefined)

      await expect(
        categoriesService.create(mockDb, TEST_USER_ID, {
          name: 'Sub',
          categoryType: 'expense',
          parentId: '44444444-4444-4444-4444-444444444444',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when parent type does not match', async () => {
      const parent = makeCategory({ id: '44444444-4444-4444-4444-444444444444', categoryType: 'income' })
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(parent)

      await expect(
        categoriesService.create(mockDb, TEST_USER_ID, {
          name: 'Sub',
          categoryType: 'expense',
          parentId: parent.id,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for missing name', async () => {
      await expect(
        categoriesService.create(mockDb, TEST_USER_ID, {
          name: '',
          categoryType: 'expense',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid color format', async () => {
      await expect(
        categoriesService.create(mockDb, TEST_USER_ID, {
          name: 'Test',
          categoryType: 'expense',
          color: 'red',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('accepts valid hex color', async () => {
      const created = makeCategory({ isSystem: false, color: '#FF5733' })
      vi.mocked(categoriesRepository.create).mockResolvedValue(created)

      const result = await categoriesService.create(mockDb, TEST_USER_ID, {
        name: 'Colored',
        categoryType: 'expense',
        color: '#FF5733',
      })

      expect(result.color).toBe('#FF5733')
    })
  })

  describe('update', () => {
    it('updates a custom category name', async () => {
      const existing = makeCategory({ isSystem: false })
      const updated = makeCategory({ isSystem: false, name: 'Updated Name' })
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(existing)
      vi.mocked(categoriesRepository.update).mockResolvedValue(updated)

      const result = await categoriesService.update(mockDb, existing.id, TEST_USER_ID, {
        name: 'Updated Name',
      })

      expect(result.name).toBe('Updated Name')
    })

    it('allows hiding a system category', async () => {
      const existing = makeCategory({ isSystem: true })
      const updated = makeCategory({ isSystem: true, isHidden: true })
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(existing)
      vi.mocked(categoriesRepository.update).mockResolvedValue(updated)

      const result = await categoriesService.update(mockDb, existing.id, TEST_USER_ID, {
        isHidden: true,
      })

      expect(result.isHidden).toBe(true)
    })

    it('allows updating icon/color on system categories', async () => {
      const existing = makeCategory({ isSystem: true })
      const updated = makeCategory({ isSystem: true, icon: 'new-icon', color: '#123456' })
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(existing)
      vi.mocked(categoriesRepository.update).mockResolvedValue(updated)

      const result = await categoriesService.update(mockDb, existing.id, TEST_USER_ID, {
        icon: 'new-icon',
        color: '#123456',
      })

      expect(result.icon).toBe('new-icon')
      expect(result.color).toBe('#123456')
    })

    it('throws ForbiddenError when renaming system category', async () => {
      const existing = makeCategory({ isSystem: true })
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(existing)

      await expect(
        categoriesService.update(mockDb, existing.id, TEST_USER_ID, {
          name: 'New Name',
        }),
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when category does not exist', async () => {
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(undefined)

      await expect(
        categoriesService.update(mockDb, 'nonexistent', TEST_USER_ID, { name: 'X' }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        categoriesService.update(mockDb, 'some-id', TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('delete', () => {
    it('deletes a custom category', async () => {
      const existing = makeCategory({ isSystem: false })
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(existing)
      vi.mocked(categoriesRepository.delete).mockResolvedValue(true)

      await expect(
        categoriesService.delete(mockDb, existing.id, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws ForbiddenError when deleting system category', async () => {
      const existing = makeCategory({ isSystem: true })
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(existing)

      await expect(
        categoriesService.delete(mockDb, existing.id, TEST_USER_ID),
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when category does not exist', async () => {
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(undefined)

      await expect(
        categoriesService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
