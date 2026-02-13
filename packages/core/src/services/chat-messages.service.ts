import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { chatMessagesRepository } from '../repositories/chat-messages.repository'
import { createChatMessageSchema } from '../validation/chat-messages'
import type { ChatMessage } from '../types/chat-messages'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export const chatMessagesService = {
  async list(
    db: Database,
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<ChatMessage[]> {
    const safeLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
    const safeOffset = Math.max(offset ?? 0, 0)
    return chatMessagesRepository.findByUserId(db, userId, safeLimit, safeOffset)
  },

  async getById(db: Database, id: string, userId: string): Promise<ChatMessage> {
    const message = await chatMessagesRepository.findById(db, id, userId)
    if (!message) {
      throw new NotFoundError('ChatMessage', id)
    }
    return message
  },

  async create(db: Database, userId: string, input: unknown): Promise<ChatMessage> {
    const parsed = createChatMessageSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid chat message data', parsed.error.issues)
    }

    const data = parsed.data

    return chatMessagesRepository.create(db, {
      userId,
      role: data.role,
      content: data.content,
      intent: data.intent ?? null,
      entities: data.entities ?? null,
      actionTaken: data.actionTaken ?? null,
      actionResult: data.actionResult ?? null,
    })
  },

  async clearHistory(db: Database, userId: string): Promise<number> {
    return chatMessagesRepository.deleteByUserId(db, userId)
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await chatMessagesRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('ChatMessage', id)
    }
  },
}

function buildValidationError(
  message: string,
  issues: { path: (string | number)[]; message: string }[],
): ValidationError {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of issues) {
    const path = issue.path.join('.')
    if (!fieldErrors[path]) {
      fieldErrors[path] = []
    }
    fieldErrors[path].push(issue.message)
  }
  return new ValidationError(message, fieldErrors)
}
