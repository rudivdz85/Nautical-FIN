import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { actuals } from '../db/schema'
import type { Actual, NewActual } from '../types/actuals'

type Database = NeonHttpDatabase

export const actualsRepository = {
  async findByUserId(db: Database, userId: string): Promise<Actual[]> {
    return db
      .select()
      .from(actuals)
      .where(eq(actuals.userId, userId))
      .orderBy(actuals.year, actuals.month)
  },

  async findById(db: Database, id: string, userId: string): Promise<Actual | undefined> {
    const results = await db
      .select()
      .from(actuals)
      .where(and(eq(actuals.id, id), eq(actuals.userId, userId)))
      .limit(1)

    return results[0]
  },

  async findByUserAndMonth(
    db: Database,
    userId: string,
    year: number,
    month: number,
  ): Promise<Actual | undefined> {
    const results = await db
      .select()
      .from(actuals)
      .where(
        and(
          eq(actuals.userId, userId),
          eq(actuals.year, year),
          eq(actuals.month, month),
        ),
      )
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewActual): Promise<Actual> {
    const results = await db.insert(actuals).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<
      Pick<
        Actual,
        'status' | 'totalIncome' | 'totalExpenses' | 'netSavings' | 'reconciledAt' | 'notes'
      >
    >,
  ): Promise<Actual | undefined> {
    const results = await db
      .update(actuals)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(actuals.id, id), eq(actuals.userId, userId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(actuals)
      .where(and(eq(actuals.id, id), eq(actuals.userId, userId)))
      .returning({ id: actuals.id })

    return results.length > 0
  },
}
