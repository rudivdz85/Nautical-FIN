import { describe, it, expect, vi, beforeEach } from 'vitest'
import { aiInsightsService } from '../../../packages/core/src/services/ai-insights.service'
import { aiInsightsRepository } from '../../../packages/core/src/repositories/ai-insights.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { AiInsight } from '../../../packages/core/src/types/ai-insights'

vi.mock('../../../packages/core/src/repositories/ai-insights.repository', () => ({
  aiInsightsRepository: {
    findByUserId: vi.fn(),
    findUnreadByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof aiInsightsService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_INSIGHT_ID = '22222222-2222-2222-2222-222222222222'

function makeInsight(overrides: Partial<AiInsight> = {}): AiInsight {
  return {
    id: TEST_INSIGHT_ID,
    userId: TEST_USER_ID,
    insightType: 'monthly_checkin',
    title: 'Monthly Check-In: February 2025',
    content: 'You spent 15% less on dining out this month.',
    relatedEntityType: null,
    relatedEntityId: null,
    priority: 5,
    isRead: false,
    isDismissed: false,
    validUntil: null,
    metadata: null,
    createdAt: new Date(),
    ...overrides,
  }
}

describe('aiInsightsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns all insights for user', async () => {
      const insights = [makeInsight(), makeInsight({ id: 'insight-2' })]
      vi.mocked(aiInsightsRepository.findByUserId).mockResolvedValue(insights)

      const result = await aiInsightsService.list(mockDb, TEST_USER_ID)

      expect(result).toHaveLength(2)
      expect(aiInsightsRepository.findByUserId).toHaveBeenCalledWith(mockDb, TEST_USER_ID)
    })
  })

  describe('listUnread', () => {
    it('returns unread insights for user', async () => {
      const insights = [makeInsight()]
      vi.mocked(aiInsightsRepository.findUnreadByUserId).mockResolvedValue(insights)

      const result = await aiInsightsService.listUnread(mockDb, TEST_USER_ID)

      expect(result).toHaveLength(1)
      expect(aiInsightsRepository.findUnreadByUserId).toHaveBeenCalledWith(mockDb, TEST_USER_ID)
    })
  })

  describe('getById', () => {
    it('returns insight when found', async () => {
      vi.mocked(aiInsightsRepository.findById).mockResolvedValue(makeInsight())

      const result = await aiInsightsService.getById(mockDb, TEST_INSIGHT_ID, TEST_USER_ID)

      expect(result.id).toBe(TEST_INSIGHT_ID)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(aiInsightsRepository.findById).mockResolvedValue(undefined)

      await expect(
        aiInsightsService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates an insight', async () => {
      const insight = makeInsight()
      vi.mocked(aiInsightsRepository.create).mockResolvedValue(insight)

      const result = await aiInsightsService.create(mockDb, TEST_USER_ID, {
        insightType: 'monthly_checkin',
        title: 'Monthly Check-In: February 2025',
        content: 'You spent 15% less on dining out this month.',
      })

      expect(result).toEqual(insight)
      expect(aiInsightsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          insightType: 'monthly_checkin',
          priority: 5,
        }),
      )
    })

    it('creates an insight with metadata and related entity', async () => {
      const entityId = '33333333-3333-3333-3333-333333333333'
      vi.mocked(aiInsightsRepository.create).mockResolvedValue(
        makeInsight({
          relatedEntityType: 'budget',
          relatedEntityId: entityId,
          metadata: { month: '2025-02' },
        }),
      )

      await aiInsightsService.create(mockDb, TEST_USER_ID, {
        insightType: 'budget_warning',
        title: 'Budget Warning',
        content: 'You are 90% through your grocery budget.',
        relatedEntityType: 'budget',
        relatedEntityId: entityId,
        priority: 8,
        metadata: { month: '2025-02' },
      })

      expect(aiInsightsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          relatedEntityType: 'budget',
          relatedEntityId: entityId,
          priority: 8,
          metadata: { month: '2025-02' },
        }),
      )
    })

    it('throws ValidationError for missing title', async () => {
      await expect(
        aiInsightsService.create(mockDb, TEST_USER_ID, {
          insightType: 'monthly_checkin',
          content: 'Some content',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for empty content', async () => {
      await expect(
        aiInsightsService.create(mockDb, TEST_USER_ID, {
          insightType: 'monthly_checkin',
          title: 'A Title',
          content: '',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid priority', async () => {
      await expect(
        aiInsightsService.create(mockDb, TEST_USER_ID, {
          insightType: 'monthly_checkin',
          title: 'A Title',
          content: 'Some content',
          priority: 15,
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('update', () => {
    it('updates isRead field', async () => {
      const existing = makeInsight()
      const updated = makeInsight({ isRead: true })
      vi.mocked(aiInsightsRepository.findById).mockResolvedValue(existing)
      vi.mocked(aiInsightsRepository.update).mockResolvedValue(updated)

      const result = await aiInsightsService.update(
        mockDb, TEST_INSIGHT_ID, TEST_USER_ID,
        { isRead: true },
      )

      expect(result.isRead).toBe(true)
    })

    it('throws NotFoundError when insight does not exist', async () => {
      vi.mocked(aiInsightsRepository.findById).mockResolvedValue(undefined)

      await expect(
        aiInsightsService.update(mockDb, 'nonexistent', TEST_USER_ID, { isRead: true }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        aiInsightsService.update(mockDb, TEST_INSIGHT_ID, TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('markAsRead', () => {
    it('marks insight as read', async () => {
      const existing = makeInsight()
      const updated = makeInsight({ isRead: true })
      vi.mocked(aiInsightsRepository.findById).mockResolvedValue(existing)
      vi.mocked(aiInsightsRepository.update).mockResolvedValue(updated)

      const result = await aiInsightsService.markAsRead(mockDb, TEST_INSIGHT_ID, TEST_USER_ID)

      expect(result.isRead).toBe(true)
      expect(aiInsightsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_INSIGHT_ID, TEST_USER_ID, { isRead: true },
      )
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(aiInsightsRepository.findById).mockResolvedValue(undefined)

      await expect(
        aiInsightsService.markAsRead(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('dismiss', () => {
    it('dismisses an insight', async () => {
      const existing = makeInsight()
      const updated = makeInsight({ isDismissed: true })
      vi.mocked(aiInsightsRepository.findById).mockResolvedValue(existing)
      vi.mocked(aiInsightsRepository.update).mockResolvedValue(updated)

      const result = await aiInsightsService.dismiss(mockDb, TEST_INSIGHT_ID, TEST_USER_ID)

      expect(result.isDismissed).toBe(true)
      expect(aiInsightsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_INSIGHT_ID, TEST_USER_ID, { isDismissed: true },
      )
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(aiInsightsRepository.findById).mockResolvedValue(undefined)

      await expect(
        aiInsightsService.dismiss(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('deletes an insight', async () => {
      vi.mocked(aiInsightsRepository.delete).mockResolvedValue(true)

      await expect(
        aiInsightsService.delete(mockDb, TEST_INSIGHT_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when insight does not exist', async () => {
      vi.mocked(aiInsightsRepository.delete).mockResolvedValue(false)

      await expect(
        aiInsightsService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
