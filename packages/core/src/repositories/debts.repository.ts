import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { debts } from '../db/schema'
import type { Debt, NewDebt } from '../types/debts'

type Database = NeonHttpDatabase

export const debtsRepository = {
  async findByUserId(db: Database, userId: string): Promise<Debt[]> {
    return db
      .select()
      .from(debts)
      .where(and(eq(debts.userId, userId), eq(debts.isActive, true)))
      .orderBy(debts.createdAt)
  },

  async findAllByUserId(db: Database, userId: string): Promise<Debt[]> {
    return db
      .select()
      .from(debts)
      .where(eq(debts.userId, userId))
      .orderBy(debts.createdAt)
  },

  async findById(db: Database, id: string, userId: string): Promise<Debt | undefined> {
    const results = await db
      .select()
      .from(debts)
      .where(and(eq(debts.id, id), eq(debts.userId, userId)))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewDebt): Promise<Debt> {
    const results = await db.insert(debts).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<
      Pick<
        Debt,
        | 'linkedAccountId'
        | 'name'
        | 'creditor'
        | 'currentBalance'
        | 'interestRate'
        | 'interestType'
        | 'minimumPayment'
        | 'fixedPayment'
        | 'paymentDay'
        | 'expectedPayoffDate'
        | 'isActive'
        | 'notes'
      >
    >,
  ): Promise<Debt | undefined> {
    const results = await db
      .update(debts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(debts.id, id), eq(debts.userId, userId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(debts)
      .where(and(eq(debts.id, id), eq(debts.userId, userId)))
      .returning({ id: debts.id })

    return results.length > 0
  },
}
