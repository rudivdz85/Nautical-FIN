import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { budgetItems } from '../db/schema'
import type { BudgetItem, NewBudgetItem } from '../types/budgets'

type Database = NeonHttpDatabase

export const budgetItemsRepository = {
  async findByBudgetId(db: Database, budgetId: string): Promise<BudgetItem[]> {
    return db
      .select()
      .from(budgetItems)
      .where(eq(budgetItems.budgetId, budgetId))
      .orderBy(budgetItems.createdAt)
  },

  async findById(db: Database, id: string, budgetId: string): Promise<BudgetItem | undefined> {
    const results = await db
      .select()
      .from(budgetItems)
      .where(and(eq(budgetItems.id, id), eq(budgetItems.budgetId, budgetId)))
      .limit(1)

    return results[0]
  },

  async findByBudgetAndCategory(
    db: Database,
    budgetId: string,
    categoryId: string,
  ): Promise<BudgetItem | undefined> {
    const results = await db
      .select()
      .from(budgetItems)
      .where(
        and(
          eq(budgetItems.budgetId, budgetId),
          eq(budgetItems.categoryId, categoryId),
        ),
      )
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewBudgetItem): Promise<BudgetItem> {
    const results = await db.insert(budgetItems).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    budgetId: string,
    data: Partial<Pick<BudgetItem, 'plannedAmount' | 'rolloverAmount' | 'surplusAction'>>,
  ): Promise<BudgetItem | undefined> {
    const results = await db
      .update(budgetItems)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(budgetItems.id, id), eq(budgetItems.budgetId, budgetId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, budgetId: string): Promise<boolean> {
    const results = await db
      .delete(budgetItems)
      .where(and(eq(budgetItems.id, id), eq(budgetItems.budgetId, budgetId)))
      .returning({ id: budgetItems.id })

    return results.length > 0
  },
}
