import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { budgets } from '../db/schema'
import type { Budget, NewBudget } from '../types/budgets'

type Database = NeonHttpDatabase

export const budgetsRepository = {
  async findByUserId(db: Database, userId: string): Promise<Budget[]> {
    return db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId))
      .orderBy(budgets.year, budgets.month)
  },

  async findById(db: Database, id: string, userId: string): Promise<Budget | undefined> {
    const results = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .limit(1)

    return results[0]
  },

  async findByUserAndMonth(
    db: Database,
    userId: string,
    year: number,
    month: number,
  ): Promise<Budget | undefined> {
    const results = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.year, year),
          eq(budgets.month, month),
        ),
      )
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewBudget): Promise<Budget> {
    const results = await db.insert(budgets).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<
      Pick<
        Budget,
        | 'status'
        | 'totalPlannedIncome'
        | 'totalPlannedExpenses'
        | 'totalPlannedSavings'
        | 'totalPlannedDebtPayments'
        | 'unallocatedAmount'
        | 'notes'
      >
    >,
  ): Promise<Budget | undefined> {
    const results = await db
      .update(budgets)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .returning({ id: budgets.id })

    return results.length > 0
  },
}
