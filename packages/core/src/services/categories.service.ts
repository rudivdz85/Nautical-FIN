import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { categoriesRepository } from '../repositories/categories.repository'
import { createCategorySchema, updateCategorySchema } from '../validation/categories'
import type { Category, CategoryType } from '../types/categories'
import { NotFoundError, ValidationError, ForbiddenError } from '../errors/index'

type Database = NeonHttpDatabase

export const categoriesService = {
  async list(db: Database, userId: string, type?: CategoryType): Promise<Category[]> {
    if (type) {
      return categoriesRepository.findByUserIdAndType(db, userId, type)
    }
    return categoriesRepository.findByUserId(db, userId)
  },

  async getById(db: Database, id: string, userId: string): Promise<Category> {
    const category = await categoriesRepository.findByIdAndUserId(db, id, userId)
    if (!category) {
      throw new NotFoundError('Category', id)
    }
    return category
  },

  async create(db: Database, userId: string, input: unknown): Promise<Category> {
    const parsed = createCategorySchema.safeParse(input)
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) {
          fieldErrors[path] = []
        }
        fieldErrors[path].push(issue.message)
      }
      throw new ValidationError('Invalid category data', fieldErrors)
    }

    const data = parsed.data

    if (data.parentId) {
      const parent = await categoriesRepository.findByIdAndUserId(db, data.parentId, userId)
      if (!parent) {
        throw new NotFoundError('Parent category', data.parentId)
      }
      if (parent.categoryType !== data.categoryType) {
        throw new ValidationError('Parent category type must match child category type')
      }
    }

    return categoriesRepository.create(db, {
      userId,
      name: data.name,
      categoryType: data.categoryType,
      parentId: data.parentId,
      icon: data.icon,
      color: data.color,
      isSystem: false,
      displayOrder: data.displayOrder ?? 0,
    })
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    input: unknown,
  ): Promise<Category> {
    const parsed = updateCategorySchema.safeParse(input)
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) {
          fieldErrors[path] = []
        }
        fieldErrors[path].push(issue.message)
      }
      throw new ValidationError('Invalid category data', fieldErrors)
    }

    const existing = await categoriesRepository.findByIdAndUserId(db, id, userId)
    if (!existing) {
      throw new NotFoundError('Category', id)
    }

    if (existing.isSystem && parsed.data.name) {
      throw new ForbiddenError('Cannot rename system categories')
    }

    const updated = await categoriesRepository.update(db, id, userId, parsed.data)
    if (!updated) {
      throw new NotFoundError('Category', id)
    }

    return updated
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const existing = await categoriesRepository.findByIdAndUserId(db, id, userId)
    if (!existing) {
      throw new NotFoundError('Category', id)
    }

    if (existing.isSystem) {
      throw new ForbiddenError('Cannot delete system categories. Hide them instead.')
    }

    const deleted = await categoriesRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('Category', id)
    }
  },
}
