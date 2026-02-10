import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { categories } from '../db/schema'
import type { Category, NewCategory, CategoryType } from '../types/categories'

type Database = NeonHttpDatabase

export const categoriesRepository = {
  async findByUserId(db: Database, userId: string): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.displayOrder)
  },

  async findByUserIdAndType(
    db: Database,
    userId: string,
    categoryType: CategoryType,
  ): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.categoryType, categoryType)))
      .orderBy(categories.displayOrder)
  },

  async findSystemCategories(db: Database): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(eq(categories.isSystem, true))
      .orderBy(categories.displayOrder)
  },

  async findById(db: Database, id: string): Promise<Category | undefined> {
    const results = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1)

    return results[0]
  },

  async findByIdAndUserId(
    db: Database,
    id: string,
    userId: string,
  ): Promise<Category | undefined> {
    const results = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewCategory): Promise<Category> {
    const results = await db.insert(categories).values(data).returning()

    return results[0]!
  },

  async bulkCreate(db: Database, data: NewCategory[]): Promise<Category[]> {
    if (data.length === 0) return []

    return db.insert(categories).values(data).returning()
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'isHidden' | 'displayOrder'>>,
  ): Promise<Category | undefined> {
    const results = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning({ id: categories.id })

    return results.length > 0
  },
}
