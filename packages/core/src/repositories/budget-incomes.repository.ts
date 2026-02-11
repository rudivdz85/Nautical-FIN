import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { budgetIncomes } from '../db/schema'
import type { BudgetIncome, NewBudgetIncome } from '../types/budgets'

type Database = NeonHttpDatabase

export const budgetIncomesRepository = {
  async findByBudgetId(db: Database, budgetId: string): Promise<BudgetIncome[]> {
    return db
      .select()
      .from(budgetIncomes)
      .where(eq(budgetIncomes.budgetId, budgetId))
      .orderBy(budgetIncomes.createdAt)
  },

  async findById(db: Database, id: string, budgetId: string): Promise<BudgetIncome | undefined> {
    const results = await db
      .select()
      .from(budgetIncomes)
      .where(and(eq(budgetIncomes.id, id), eq(budgetIncomes.budgetId, budgetId)))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewBudgetIncome): Promise<BudgetIncome> {
    const results = await db.insert(budgetIncomes).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    budgetId: string,
    data: Partial<
      Pick<
        BudgetIncome,
        'name' | 'expectedAmount' | 'expectedDate' | 'isConfirmed' | 'actualAmount' | 'actualDate'
      >
    >,
  ): Promise<BudgetIncome | undefined> {
    const results = await db
      .update(budgetIncomes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(budgetIncomes.id, id), eq(budgetIncomes.budgetId, budgetId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, budgetId: string): Promise<boolean> {
    const results = await db
      .delete(budgetIncomes)
      .where(and(eq(budgetIncomes.id, id), eq(budgetIncomes.budgetId, budgetId)))
      .returning({ id: budgetIncomes.id })

    return results.length > 0
  },
}
