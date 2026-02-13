import { describe, it, expect, vi, beforeEach } from 'vitest'
import { faqItemsService } from '../../../packages/core/src/services/faq-items.service'
import { faqItemsRepository } from '../../../packages/core/src/repositories/faq-items.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { FaqItem } from '../../../packages/core/src/types/faq-items'

vi.mock('../../../packages/core/src/repositories/faq-items.repository', () => ({
  faqItemsRepository: {
    findAll: vi.fn(),
    findAllIncludingInactive: vi.fn(),
    findByCategory: vi.fn(),
    findBySlug: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof faqItemsService.list>[0]
const TEST_FAQ_ID = '11111111-1111-1111-1111-111111111111'

function makeItem(overrides: Partial<FaqItem> = {}): FaqItem {
  return {
    id: TEST_FAQ_ID,
    question: 'How does budgeting work?',
    answer: 'You create a monthly budget and track spending against it.',
    category: 'budgets',
    slug: 'how-does-budgeting-work',
    displayOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('faqItemsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns active FAQ items', async () => {
      const items = [makeItem(), makeItem({ id: 'faq-2', slug: 'another-faq' })]
      vi.mocked(faqItemsRepository.findAll).mockResolvedValue(items)

      const result = await faqItemsService.list(mockDb)

      expect(result).toHaveLength(2)
      expect(faqItemsRepository.findAll).toHaveBeenCalledWith(mockDb)
    })
  })

  describe('listAll', () => {
    it('returns all FAQ items including inactive', async () => {
      const items = [makeItem(), makeItem({ id: 'faq-2', isActive: false })]
      vi.mocked(faqItemsRepository.findAllIncludingInactive).mockResolvedValue(items)

      const result = await faqItemsService.listAll(mockDb)

      expect(result).toHaveLength(2)
    })
  })

  describe('listByCategory', () => {
    it('returns FAQ items filtered by category', async () => {
      const items = [makeItem()]
      vi.mocked(faqItemsRepository.findByCategory).mockResolvedValue(items)

      const result = await faqItemsService.listByCategory(mockDb, 'budgets')

      expect(result).toHaveLength(1)
      expect(faqItemsRepository.findByCategory).toHaveBeenCalledWith(mockDb, 'budgets')
    })
  })

  describe('getBySlug', () => {
    it('returns item when found', async () => {
      vi.mocked(faqItemsRepository.findBySlug).mockResolvedValue(makeItem())

      const result = await faqItemsService.getBySlug(mockDb, 'how-does-budgeting-work')

      expect(result.slug).toBe('how-does-budgeting-work')
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(faqItemsRepository.findBySlug).mockResolvedValue(undefined)

      await expect(
        faqItemsService.getBySlug(mockDb, 'nonexistent'),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('getById', () => {
    it('returns item when found', async () => {
      vi.mocked(faqItemsRepository.findById).mockResolvedValue(makeItem())

      const result = await faqItemsService.getById(mockDb, TEST_FAQ_ID)

      expect(result.id).toBe(TEST_FAQ_ID)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(faqItemsRepository.findById).mockResolvedValue(undefined)

      await expect(
        faqItemsService.getById(mockDb, 'nonexistent'),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a FAQ item', async () => {
      const item = makeItem()
      vi.mocked(faqItemsRepository.findBySlug).mockResolvedValue(undefined)
      vi.mocked(faqItemsRepository.create).mockResolvedValue(item)

      const result = await faqItemsService.create(mockDb, {
        question: 'How does budgeting work?',
        answer: 'You create a monthly budget and track spending against it.',
        category: 'budgets',
        slug: 'how-does-budgeting-work',
      })

      expect(result).toEqual(item)
      expect(faqItemsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          question: 'How does budgeting work?',
          slug: 'how-does-budgeting-work',
          displayOrder: 0,
          isActive: true,
        }),
      )
    })

    it('throws ValidationError for duplicate slug', async () => {
      vi.mocked(faqItemsRepository.findBySlug).mockResolvedValue(makeItem())

      await expect(
        faqItemsService.create(mockDb, {
          question: 'Another question?',
          answer: 'Some answer.',
          category: 'general',
          slug: 'how-does-budgeting-work',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid slug format', async () => {
      await expect(
        faqItemsService.create(mockDb, {
          question: 'Some question?',
          answer: 'Some answer.',
          category: 'general',
          slug: 'Invalid Slug!',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for missing question', async () => {
      await expect(
        faqItemsService.create(mockDb, {
          answer: 'Some answer.',
          category: 'general',
          slug: 'some-slug',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for empty answer', async () => {
      await expect(
        faqItemsService.create(mockDb, {
          question: 'Some question?',
          answer: '',
          category: 'general',
          slug: 'some-slug',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('update', () => {
    it('updates FAQ item fields', async () => {
      const existing = makeItem()
      const updated = makeItem({ question: 'Updated question?' })
      vi.mocked(faqItemsRepository.findById).mockResolvedValue(existing)
      vi.mocked(faqItemsRepository.update).mockResolvedValue(updated)

      const result = await faqItemsService.update(mockDb, TEST_FAQ_ID, {
        question: 'Updated question?',
      })

      expect(result.question).toBe('Updated question?')
    })

    it('validates slug uniqueness on update', async () => {
      const existing = makeItem()
      const duplicate = makeItem({ id: 'other-id', slug: 'taken-slug' })
      vi.mocked(faqItemsRepository.findById).mockResolvedValue(existing)
      vi.mocked(faqItemsRepository.findBySlug).mockResolvedValue(duplicate)

      await expect(
        faqItemsService.update(mockDb, TEST_FAQ_ID, { slug: 'taken-slug' }),
      ).rejects.toThrow(ValidationError)
    })

    it('allows keeping the same slug', async () => {
      const existing = makeItem()
      const updated = makeItem()
      vi.mocked(faqItemsRepository.findById).mockResolvedValue(existing)
      vi.mocked(faqItemsRepository.update).mockResolvedValue(updated)

      const result = await faqItemsService.update(mockDb, TEST_FAQ_ID, {
        slug: 'how-does-budgeting-work',
      })

      expect(result).toEqual(updated)
      expect(faqItemsRepository.findBySlug).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when item does not exist', async () => {
      vi.mocked(faqItemsRepository.findById).mockResolvedValue(undefined)

      await expect(
        faqItemsService.update(mockDb, 'nonexistent', { question: 'Updated?' }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        faqItemsService.update(mockDb, TEST_FAQ_ID, {}),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('delete', () => {
    it('deletes a FAQ item', async () => {
      vi.mocked(faqItemsRepository.delete).mockResolvedValue(true)

      await expect(
        faqItemsService.delete(mockDb, TEST_FAQ_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when item does not exist', async () => {
      vi.mocked(faqItemsRepository.delete).mockResolvedValue(false)

      await expect(
        faqItemsService.delete(mockDb, 'nonexistent'),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
