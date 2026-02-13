import { eq, and, desc } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { debtPayments } from '../db/schema'
import type { DebtPayment, NewDebtPayment } from '../types/debts'

type Database = NeonHttpDatabase

export const debtPaymentsRepository = {
  async findByDebtId(db: Database, debtId: string): Promise<DebtPayment[]> {
    return db
      .select()
      .from(debtPayments)
      .where(eq(debtPayments.debtId, debtId))
      .orderBy(desc(debtPayments.paymentDate))
  },

  async findById(db: Database, id: string, debtId: string): Promise<DebtPayment | undefined> {
    const results = await db
      .select()
      .from(debtPayments)
      .where(and(eq(debtPayments.id, id), eq(debtPayments.debtId, debtId)))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewDebtPayment): Promise<DebtPayment> {
    const results = await db.insert(debtPayments).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    debtId: string,
    data: Partial<
      Pick<DebtPayment, 'amount' | 'principalAmount' | 'interestAmount' | 'paymentDate'>
    >,
  ): Promise<DebtPayment | undefined> {
    const results = await db
      .update(debtPayments)
      .set(data)
      .where(and(eq(debtPayments.id, id), eq(debtPayments.debtId, debtId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, debtId: string): Promise<boolean> {
    const results = await db
      .delete(debtPayments)
      .where(and(eq(debtPayments.id, id), eq(debtPayments.debtId, debtId)))
      .returning({ id: debtPayments.id })

    return results.length > 0
  },
}
