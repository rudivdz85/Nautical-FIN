import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { categorizationRulesRepository } from '../repositories/categorization-rules.repository'
import { categoriesRepository } from '../repositories/categories.repository'
import {
  createCategorizationRuleSchema,
  updateCategorizationRuleSchema,
} from '../validation/categorization-rules'
import type { CategorizationRule } from '../types/categorization-rules'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const categorizationRulesService = {
  async list(db: Database, userId: string): Promise<CategorizationRule[]> {
    return categorizationRulesRepository.findByUserId(db, userId)
  },

  async listAll(db: Database, userId: string): Promise<CategorizationRule[]> {
    return categorizationRulesRepository.findAllByUserId(db, userId)
  },

  async getById(
    db: Database,
    id: string,
    userId: string,
  ): Promise<CategorizationRule> {
    const rule = await categorizationRulesRepository.findById(db, id, userId)
    if (!rule) {
      throw new NotFoundError('CategorizationRule', id)
    }
    return rule
  },

  async create(
    db: Database,
    userId: string,
    input: unknown,
  ): Promise<CategorizationRule> {
    const parsed = createCategorizationRuleSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid categorization rule data', parsed.error.issues)
    }

    const data = parsed.data

    const category = await categoriesRepository.findByIdAndUserId(db, data.categoryId, userId)
    if (!category) {
      throw new NotFoundError('Category', data.categoryId)
    }

    return categorizationRulesRepository.create(db, {
      userId,
      categoryId: data.categoryId,
      merchantExact: data.merchantExact ?? null,
      merchantPattern: data.merchantPattern ?? null,
      descriptionPattern: data.descriptionPattern ?? null,
      amountMin: data.amountMin ?? null,
      amountMax: data.amountMax ?? null,
      priority: data.priority,
      confidence: data.confidence,
      isGlobal: data.isGlobal,
    })
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    input: unknown,
  ): Promise<CategorizationRule> {
    const parsed = updateCategorizationRuleSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid categorization rule data', parsed.error.issues)
    }

    const existing = await categorizationRulesRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('CategorizationRule', id)
    }

    const data = parsed.data

    if (data.categoryId) {
      const category = await categoriesRepository.findByIdAndUserId(db, data.categoryId, userId)
      if (!category) {
        throw new NotFoundError('Category', data.categoryId)
      }
    }

    const updated = await categorizationRulesRepository.update(db, id, userId, data)
    if (!updated) {
      throw new NotFoundError('CategorizationRule', id)
    }

    return updated
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await categorizationRulesRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('CategorizationRule', id)
    }
  },

  async recordApplied(db: Database, id: string, userId: string): Promise<void> {
    await categorizationRulesRepository.incrementApplied(db, id, userId)
  },

  async recordCorrected(db: Database, id: string, userId: string): Promise<void> {
    await categorizationRulesRepository.incrementCorrected(db, id, userId)
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
