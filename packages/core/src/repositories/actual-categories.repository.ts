import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { actualCategories } from '../db/schema'
import type { ActualCategory, NewActualCategory } from '../types/actuals'

type Database = NeonHttpDatabase

export const actualCategoriesRepository = {
  async findByActualId(db: Database, actualId: string): Promise<ActualCategory[]> {
    return db
      .select()
      .from(actualCategories)
      .where(eq(actualCategories.actualId, actualId))
  },

  async findById(
    db: Database,
    id: string,
    actualId: string,
  ): Promise<ActualCategory | undefined> {
    const results = await db
      .select()
      .from(actualCategories)
      .where(
        and(eq(actualCategories.id, id), eq(actualCategories.actualId, actualId)),
      )
      .limit(1)

    return results[0]
  },

  async findByActualAndCategory(
    db: Database,
    actualId: string,
    categoryId: string,
  ): Promise<ActualCategory | undefined> {
    const results = await db
      .select()
      .from(actualCategories)
      .where(
        and(
          eq(actualCategories.actualId, actualId),
          eq(actualCategories.categoryId, categoryId),
        ),
      )
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewActualCategory): Promise<ActualCategory> {
    const results = await db.insert(actualCategories).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    actualId: string,
    data: Partial<
      Pick<
        ActualCategory,
        'totalAmount' | 'transactionCount' | 'budgetedAmount' | 'variance' | 'variancePercentage'
      >
    >,
  ): Promise<ActualCategory | undefined> {
    const results = await db
      .update(actualCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(actualCategories.id, id), eq(actualCategories.actualId, actualId)),
      )
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, actualId: string): Promise<boolean> {
    const results = await db
      .delete(actualCategories)
      .where(
        and(eq(actualCategories.id, id), eq(actualCategories.actualId, actualId)),
      )
      .returning({ id: actualCategories.id })

    return results.length > 0
  },
}
