import { eq, and, asc } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { faqItems } from '../db/schema'
import type { FaqItem, NewFaqItem } from '../types/faq-items'

type Database = NeonHttpDatabase

export const faqItemsRepository = {
  async findAll(db: Database): Promise<FaqItem[]> {
    return db
      .select()
      .from(faqItems)
      .where(eq(faqItems.isActive, true))
      .orderBy(asc(faqItems.category), asc(faqItems.displayOrder))
  },

  async findAllIncludingInactive(db: Database): Promise<FaqItem[]> {
    return db
      .select()
      .from(faqItems)
      .orderBy(asc(faqItems.category), asc(faqItems.displayOrder))
  },

  async findByCategory(db: Database, category: string): Promise<FaqItem[]> {
    return db
      .select()
      .from(faqItems)
      .where(and(eq(faqItems.category, category), eq(faqItems.isActive, true)))
      .orderBy(asc(faqItems.displayOrder))
  },

  async findBySlug(db: Database, slug: string): Promise<FaqItem | undefined> {
    const results = await db
      .select()
      .from(faqItems)
      .where(eq(faqItems.slug, slug))
      .limit(1)

    return results[0]
  },

  async findById(db: Database, id: string): Promise<FaqItem | undefined> {
    const results = await db
      .select()
      .from(faqItems)
      .where(eq(faqItems.id, id))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewFaqItem): Promise<FaqItem> {
    const results = await db.insert(faqItems).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    data: Partial<Omit<NewFaqItem, 'id'>>,
  ): Promise<FaqItem | undefined> {
    const results = await db
      .update(faqItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(faqItems.id, id))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string): Promise<boolean> {
    const results = await db
      .delete(faqItems)
      .where(eq(faqItems.id, id))
      .returning({ id: faqItems.id })

    return results.length > 0
  },
}
