import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { merchantMappingsRepository } from '../repositories/merchant-mappings.repository'
import {
  createMerchantMappingSchema,
  updateMerchantMappingSchema,
} from '../validation/merchant-mappings'
import type { MerchantMapping } from '../types/merchant-mappings'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const merchantMappingsService = {
  async list(db: Database, userId: string): Promise<MerchantMapping[]> {
    return merchantMappingsRepository.findByUserId(db, userId)
  },

  async getById(db: Database, id: string, userId: string): Promise<MerchantMapping> {
    const mapping = await merchantMappingsRepository.findById(db, id, userId)
    if (!mapping) {
      throw new NotFoundError('MerchantMapping', id)
    }
    return mapping
  },

  async create(db: Database, userId: string, input: unknown): Promise<MerchantMapping> {
    const parsed = createMerchantMappingSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid merchant mapping data', parsed.error.issues)
    }

    const data = parsed.data

    const existing = await merchantMappingsRepository.findByOriginalName(
      db, userId, data.originalName,
    )
    if (existing) {
      throw new ValidationError('A mapping for this original name already exists', {
        originalName: ['Duplicate merchant mapping'],
      })
    }

    return merchantMappingsRepository.create(db, {
      userId,
      originalName: data.originalName,
      normalizedName: data.normalizedName,
      isGlobal: data.isGlobal,
    })
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    input: unknown,
  ): Promise<MerchantMapping> {
    const parsed = updateMerchantMappingSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid merchant mapping data', parsed.error.issues)
    }

    const existing = await merchantMappingsRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('MerchantMapping', id)
    }

    const updated = await merchantMappingsRepository.update(db, id, userId, parsed.data)
    if (!updated) {
      throw new NotFoundError('MerchantMapping', id)
    }

    return updated
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await merchantMappingsRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('MerchantMapping', id)
    }
  },

  async resolve(db: Database, userId: string, originalName: string): Promise<string> {
    const mapping = await merchantMappingsRepository.findByOriginalName(db, userId, originalName)
    return mapping ? mapping.normalizedName : originalName
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
