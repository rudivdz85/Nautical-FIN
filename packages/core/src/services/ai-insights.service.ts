import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { aiInsightsRepository } from '../repositories/ai-insights.repository'
import { createAiInsightSchema, updateAiInsightSchema } from '../validation/ai-insights'
import type { AiInsight } from '../types/ai-insights'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const aiInsightsService = {
  async list(db: Database, userId: string): Promise<AiInsight[]> {
    return aiInsightsRepository.findByUserId(db, userId)
  },

  async listUnread(db: Database, userId: string): Promise<AiInsight[]> {
    return aiInsightsRepository.findUnreadByUserId(db, userId)
  },

  async getById(db: Database, id: string, userId: string): Promise<AiInsight> {
    const insight = await aiInsightsRepository.findById(db, id, userId)
    if (!insight) {
      throw new NotFoundError('AiInsight', id)
    }
    return insight
  },

  async create(db: Database, userId: string, input: unknown): Promise<AiInsight> {
    const parsed = createAiInsightSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid AI insight data', parsed.error.issues)
    }

    const data = parsed.data

    return aiInsightsRepository.create(db, {
      userId,
      insightType: data.insightType,
      title: data.title,
      content: data.content,
      relatedEntityType: data.relatedEntityType ?? null,
      relatedEntityId: data.relatedEntityId ?? null,
      priority: data.priority ?? 5,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      metadata: data.metadata ?? null,
    })
  },

  async update(db: Database, id: string, userId: string, input: unknown): Promise<AiInsight> {
    const parsed = updateAiInsightSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid AI insight data', parsed.error.issues)
    }

    const existing = await aiInsightsRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('AiInsight', id)
    }

    const updated = await aiInsightsRepository.update(db, id, userId, parsed.data)
    return updated!
  },

  async markAsRead(db: Database, id: string, userId: string): Promise<AiInsight> {
    const existing = await aiInsightsRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('AiInsight', id)
    }

    const updated = await aiInsightsRepository.update(db, id, userId, { isRead: true })
    return updated!
  },

  async dismiss(db: Database, id: string, userId: string): Promise<AiInsight> {
    const existing = await aiInsightsRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('AiInsight', id)
    }

    const updated = await aiInsightsRepository.update(db, id, userId, { isDismissed: true })
    return updated!
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await aiInsightsRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('AiInsight', id)
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
