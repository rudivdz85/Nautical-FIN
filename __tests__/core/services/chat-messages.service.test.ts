import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chatMessagesService } from '../../../packages/core/src/services/chat-messages.service'
import { chatMessagesRepository } from '../../../packages/core/src/repositories/chat-messages.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { ChatMessage } from '../../../packages/core/src/types/chat-messages'

vi.mock('../../../packages/core/src/repositories/chat-messages.repository', () => ({
  chatMessagesRepository: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    deleteByUserId: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof chatMessagesService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_MESSAGE_ID = '22222222-2222-2222-2222-222222222222'

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: TEST_MESSAGE_ID,
    userId: TEST_USER_ID,
    role: 'user',
    content: 'How much did I spend on groceries?',
    intent: null,
    entities: null,
    actionTaken: null,
    actionResult: null,
    createdAt: new Date(),
    ...overrides,
  }
}

describe('chatMessagesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns messages with default pagination', async () => {
      const messages = [makeMessage(), makeMessage({ id: 'msg-2', role: 'assistant' })]
      vi.mocked(chatMessagesRepository.findByUserId).mockResolvedValue(messages)

      const result = await chatMessagesService.list(mockDb, TEST_USER_ID)

      expect(result).toHaveLength(2)
      expect(chatMessagesRepository.findByUserId).toHaveBeenCalledWith(
        mockDb, TEST_USER_ID, 50, 0,
      )
    })

    it('respects custom limit and offset', async () => {
      vi.mocked(chatMessagesRepository.findByUserId).mockResolvedValue([])

      await chatMessagesService.list(mockDb, TEST_USER_ID, 10, 20)

      expect(chatMessagesRepository.findByUserId).toHaveBeenCalledWith(
        mockDb, TEST_USER_ID, 10, 20,
      )
    })

    it('caps limit at 100', async () => {
      vi.mocked(chatMessagesRepository.findByUserId).mockResolvedValue([])

      await chatMessagesService.list(mockDb, TEST_USER_ID, 200)

      expect(chatMessagesRepository.findByUserId).toHaveBeenCalledWith(
        mockDb, TEST_USER_ID, 100, 0,
      )
    })

    it('enforces minimum limit of 1', async () => {
      vi.mocked(chatMessagesRepository.findByUserId).mockResolvedValue([])

      await chatMessagesService.list(mockDb, TEST_USER_ID, 0)

      expect(chatMessagesRepository.findByUserId).toHaveBeenCalledWith(
        mockDb, TEST_USER_ID, 1, 0,
      )
    })

    it('enforces minimum offset of 0', async () => {
      vi.mocked(chatMessagesRepository.findByUserId).mockResolvedValue([])

      await chatMessagesService.list(mockDb, TEST_USER_ID, 10, -5)

      expect(chatMessagesRepository.findByUserId).toHaveBeenCalledWith(
        mockDb, TEST_USER_ID, 10, 0,
      )
    })
  })

  describe('getById', () => {
    it('returns message when found', async () => {
      vi.mocked(chatMessagesRepository.findById).mockResolvedValue(makeMessage())

      const result = await chatMessagesService.getById(mockDb, TEST_MESSAGE_ID, TEST_USER_ID)

      expect(result.id).toBe(TEST_MESSAGE_ID)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(chatMessagesRepository.findById).mockResolvedValue(undefined)

      await expect(
        chatMessagesService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a user message', async () => {
      const message = makeMessage()
      vi.mocked(chatMessagesRepository.create).mockResolvedValue(message)

      const result = await chatMessagesService.create(mockDb, TEST_USER_ID, {
        role: 'user',
        content: 'How much did I spend on groceries?',
      })

      expect(result).toEqual(message)
      expect(chatMessagesRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          role: 'user',
          content: 'How much did I spend on groceries?',
        }),
      )
    })

    it('creates an assistant message with intent and action', async () => {
      const message = makeMessage({
        role: 'assistant',
        content: 'You spent R1,200 on groceries this month.',
        intent: 'query_spending',
        actionTaken: 'query_transactions',
        actionResult: { total: '1200.00', category: 'Groceries' },
      })
      vi.mocked(chatMessagesRepository.create).mockResolvedValue(message)

      await chatMessagesService.create(mockDb, TEST_USER_ID, {
        role: 'assistant',
        content: 'You spent R1,200 on groceries this month.',
        intent: 'query_spending',
        actionTaken: 'query_transactions',
        actionResult: { total: '1200.00', category: 'Groceries' },
      })

      expect(chatMessagesRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          role: 'assistant',
          intent: 'query_spending',
          actionTaken: 'query_transactions',
          actionResult: { total: '1200.00', category: 'Groceries' },
        }),
      )
    })

    it('throws ValidationError for empty content', async () => {
      await expect(
        chatMessagesService.create(mockDb, TEST_USER_ID, {
          role: 'user',
          content: '',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid role', async () => {
      await expect(
        chatMessagesService.create(mockDb, TEST_USER_ID, {
          role: 'invalid',
          content: 'Hello',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for missing content', async () => {
      await expect(
        chatMessagesService.create(mockDb, TEST_USER_ID, {
          role: 'user',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('clearHistory', () => {
    it('deletes all messages for user', async () => {
      vi.mocked(chatMessagesRepository.deleteByUserId).mockResolvedValue(25)

      const result = await chatMessagesService.clearHistory(mockDb, TEST_USER_ID)

      expect(result).toBe(25)
      expect(chatMessagesRepository.deleteByUserId).toHaveBeenCalledWith(mockDb, TEST_USER_ID)
    })

    it('returns 0 when no messages exist', async () => {
      vi.mocked(chatMessagesRepository.deleteByUserId).mockResolvedValue(0)

      const result = await chatMessagesService.clearHistory(mockDb, TEST_USER_ID)

      expect(result).toBe(0)
    })
  })

  describe('delete', () => {
    it('deletes a message', async () => {
      vi.mocked(chatMessagesRepository.delete).mockResolvedValue(true)

      await expect(
        chatMessagesService.delete(mockDb, TEST_MESSAGE_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when message does not exist', async () => {
      vi.mocked(chatMessagesRepository.delete).mockResolvedValue(false)

      await expect(
        chatMessagesService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
