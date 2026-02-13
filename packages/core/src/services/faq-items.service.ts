import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { faqItemsRepository } from '../repositories/faq-items.repository'
import { createFaqItemSchema, updateFaqItemSchema } from '../validation/faq-items'
import type { FaqItem } from '../types/faq-items'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const faqItemsService = {
  async list(db: Database): Promise<FaqItem[]> {
    return faqItemsRepository.findAll(db)
  },

  async listAll(db: Database): Promise<FaqItem[]> {
    return faqItemsRepository.findAllIncludingInactive(db)
  },

  async listByCategory(db: Database, category: string): Promise<FaqItem[]> {
    return faqItemsRepository.findByCategory(db, category)
  },

  async getBySlug(db: Database, slug: string): Promise<FaqItem> {
    const item = await faqItemsRepository.findBySlug(db, slug)
    if (!item) {
      throw new NotFoundError('FaqItem', slug)
    }
    return item
  },

  async getById(db: Database, id: string): Promise<FaqItem> {
    const item = await faqItemsRepository.findById(db, id)
    if (!item) {
      throw new NotFoundError('FaqItem', id)
    }
    return item
  },

  async create(db: Database, input: unknown): Promise<FaqItem> {
    const parsed = createFaqItemSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid FAQ item data', parsed.error.issues)
    }

    const data = parsed.data

    const existing = await faqItemsRepository.findBySlug(db, data.slug)
    if (existing) {
      throw new ValidationError('A FAQ item with this slug already exists', {
        slug: ['Duplicate slug'],
      })
    }

    return faqItemsRepository.create(db, {
      question: data.question,
      answer: data.answer,
      category: data.category,
      slug: data.slug,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
    })
  },

  async update(db: Database, id: string, input: unknown): Promise<FaqItem> {
    const parsed = updateFaqItemSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid FAQ item data', parsed.error.issues)
    }

    const data = parsed.data

    const existing = await faqItemsRepository.findById(db, id)
    if (!existing) {
      throw new NotFoundError('FaqItem', id)
    }

    if (data.slug && data.slug !== existing.slug) {
      const duplicate = await faqItemsRepository.findBySlug(db, data.slug)
      if (duplicate) {
        throw new ValidationError('A FAQ item with this slug already exists', {
          slug: ['Duplicate slug'],
        })
      }
    }

    const updated = await faqItemsRepository.update(db, id, data)
    return updated!
  },

  async delete(db: Database, id: string): Promise<void> {
    const deleted = await faqItemsRepository.delete(db, id)
    if (!deleted) {
      throw new NotFoundError('FaqItem', id)
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
