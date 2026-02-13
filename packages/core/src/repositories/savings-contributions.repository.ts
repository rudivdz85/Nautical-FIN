import { eq, and, desc } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { savingsContributions } from '../db/schema'
import type { SavingsContribution, NewSavingsContribution } from '../types/savings-goals'

type Database = NeonHttpDatabase

export const savingsContributionsRepository = {
  async findByGoalId(db: Database, savingsGoalId: string): Promise<SavingsContribution[]> {
    return db
      .select()
      .from(savingsContributions)
      .where(eq(savingsContributions.savingsGoalId, savingsGoalId))
      .orderBy(desc(savingsContributions.contributionDate))
  },

  async findById(
    db: Database,
    id: string,
    savingsGoalId: string,
  ): Promise<SavingsContribution | undefined> {
    const results = await db
      .select()
      .from(savingsContributions)
      .where(
        and(
          eq(savingsContributions.id, id),
          eq(savingsContributions.savingsGoalId, savingsGoalId),
        ),
      )
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewSavingsContribution): Promise<SavingsContribution> {
    const results = await db.insert(savingsContributions).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    savingsGoalId: string,
    data: Partial<Pick<SavingsContribution, 'amount' | 'contributionDate' | 'source'>>,
  ): Promise<SavingsContribution | undefined> {
    const results = await db
      .update(savingsContributions)
      .set(data)
      .where(
        and(
          eq(savingsContributions.id, id),
          eq(savingsContributions.savingsGoalId, savingsGoalId),
        ),
      )
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, savingsGoalId: string): Promise<boolean> {
    const results = await db
      .delete(savingsContributions)
      .where(
        and(
          eq(savingsContributions.id, id),
          eq(savingsContributions.savingsGoalId, savingsGoalId),
        ),
      )
      .returning({ id: savingsContributions.id })

    return results.length > 0
  },
}
