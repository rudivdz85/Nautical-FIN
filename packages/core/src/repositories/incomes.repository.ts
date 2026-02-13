import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { incomes } from '../db/schema'
import type { Income, NewIncome } from '../types/incomes'

type Database = NeonHttpDatabase

export const incomesRepository = {
  async findByUserId(db: Database, userId: string): Promise<Income[]> {
    return db
      .select()
      .from(incomes)
      .where(and(eq(incomes.userId, userId), eq(incomes.isActive, true)))
      .orderBy(incomes.createdAt)
  },

  async findAllByUserId(db: Database, userId: string): Promise<Income[]> {
    return db
      .select()
      .from(incomes)
      .where(eq(incomes.userId, userId))
      .orderBy(incomes.createdAt)
  },

  async findById(db: Database, id: string, userId: string): Promise<Income | undefined> {
    const results = await db
      .select()
      .from(incomes)
      .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
      .limit(1)

    return results[0]
  },

  async findPrimarySalary(db: Database, userId: string): Promise<Income | undefined> {
    const results = await db
      .select()
      .from(incomes)
      .where(
        and(
          eq(incomes.userId, userId),
          eq(incomes.isPrimarySalary, true),
          eq(incomes.isActive, true),
        ),
      )
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewIncome): Promise<Income> {
    const results = await db.insert(incomes).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<
      Pick<
        Income,
        | 'name'
        | 'amount'
        | 'expectedDay'
        | 'isConfirmed'
        | 'confirmationRequiredMonthly'
        | 'isPrimarySalary'
        | 'isActive'
        | 'nextExpected'
        | 'lastReceived'
        | 'notes'
      >
    >,
  ): Promise<Income | undefined> {
    const results = await db
      .update(incomes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(incomes)
      .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
      .returning({ id: incomes.id })

    return results.length > 0
  },
}
