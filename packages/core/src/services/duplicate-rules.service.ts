import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { duplicateRulesRepository } from '../repositories/duplicate-rules.repository'
import {
  createDuplicateRuleSchema,
  updateDuplicateRuleSchema,
} from '../validation/duplicate-rules'
import type { DuplicateRule } from '../types/duplicate-rules'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const duplicateRulesService = {
  async list(db: Database, userId: string): Promise<DuplicateRule[]> {
    return duplicateRulesRepository.findByUserId(db, userId)
  },

  async getById(db: Database, id: string, userId: string): Promise<DuplicateRule> {
    const rule = await duplicateRulesRepository.findById(db, id, userId)
    if (!rule) {
      throw new NotFoundError('DuplicateRule', id)
    }
    return rule
  },

  async create(db: Database, userId: string, input: unknown): Promise<DuplicateRule> {
    const parsed = createDuplicateRuleSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid duplicate rule data', parsed.error.issues)
    }

    const data = parsed.data

    return duplicateRulesRepository.create(db, {
      userId,
      merchantPattern: data.merchantPattern ?? null,
      amount: data.amount ?? null,
      action: data.action,
    })
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    input: unknown,
  ): Promise<DuplicateRule> {
    const parsed = updateDuplicateRuleSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid duplicate rule data', parsed.error.issues)
    }

    const existing = await duplicateRulesRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('DuplicateRule', id)
    }

    const updated = await duplicateRulesRepository.update(db, id, userId, parsed.data)
    if (!updated) {
      throw new NotFoundError('DuplicateRule', id)
    }

    return updated
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await duplicateRulesRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('DuplicateRule', id)
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
