import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { plannedOneOffs } from '../db/schema'
import type { PlannedOneOff, NewPlannedOneOff } from '../types/budgets'

type Database = NeonHttpDatabase

export const plannedOneOffsRepository = {
  async findByBudgetId(db: Database, budgetId: string): Promise<PlannedOneOff[]> {
    return db
      .select()
      .from(plannedOneOffs)
      .where(eq(plannedOneOffs.budgetId, budgetId))
      .orderBy(plannedOneOffs.expectedDate)
  },

  async findById(db: Database, id: string, budgetId: string): Promise<PlannedOneOff | undefined> {
    const results = await db
      .select()
      .from(plannedOneOffs)
      .where(and(eq(plannedOneOffs.id, id), eq(plannedOneOffs.budgetId, budgetId)))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewPlannedOneOff): Promise<PlannedOneOff> {
    const results = await db.insert(plannedOneOffs).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    budgetId: string,
    data: Partial<
      Pick<
        PlannedOneOff,
        | 'categoryId'
        | 'description'
        | 'amount'
        | 'expectedDate'
        | 'isReserved'
        | 'reminderDaysBefore'
        | 'reminderThreshold'
        | 'isCompleted'
        | 'actualTransactionId'
      >
    >,
  ): Promise<PlannedOneOff | undefined> {
    const results = await db
      .update(plannedOneOffs)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(plannedOneOffs.id, id), eq(plannedOneOffs.budgetId, budgetId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, budgetId: string): Promise<boolean> {
    const results = await db
      .delete(plannedOneOffs)
      .where(and(eq(plannedOneOffs.id, id), eq(plannedOneOffs.budgetId, budgetId)))
      .returning({ id: plannedOneOffs.id })

    return results.length > 0
  },
}
