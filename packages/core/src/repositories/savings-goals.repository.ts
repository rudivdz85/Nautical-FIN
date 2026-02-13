import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { savingsGoals } from '../db/schema'
import type { SavingsGoal, NewSavingsGoal } from '../types/savings-goals'

type Database = NeonHttpDatabase

export const savingsGoalsRepository = {
  async findByUserId(db: Database, userId: string): Promise<SavingsGoal[]> {
    return db
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.isActive, true)))
      .orderBy(savingsGoals.priority)
  },

  async findAllByUserId(db: Database, userId: string): Promise<SavingsGoal[]> {
    return db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.userId, userId))
      .orderBy(savingsGoals.priority)
  },

  async findById(db: Database, id: string, userId: string): Promise<SavingsGoal | undefined> {
    const results = await db
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewSavingsGoal): Promise<SavingsGoal> {
    const results = await db.insert(savingsGoals).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<
      Pick<
        SavingsGoal,
        | 'linkedAccountId'
        | 'name'
        | 'targetAmount'
        | 'currentAmount'
        | 'targetDate'
        | 'targetMonthsOfExpenses'
        | 'monthlyContribution'
        | 'priority'
        | 'isActive'
        | 'isCompleted'
        | 'completedAt'
        | 'notes'
      >
    >,
  ): Promise<SavingsGoal | undefined> {
    const results = await db
      .update(savingsGoals)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(savingsGoals)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
      .returning({ id: savingsGoals.id })

    return results.length > 0
  },
}
