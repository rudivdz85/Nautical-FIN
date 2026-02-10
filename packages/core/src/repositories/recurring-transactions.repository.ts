import { eq, and, lte } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { recurringTransactions } from '../db/schema'
import type {
  RecurringTransaction,
  NewRecurringTransaction,
} from '../types/recurring-transactions'

type Database = NeonHttpDatabase

export const recurringTransactionsRepository = {
  async findByUserId(db: Database, userId: string): Promise<RecurringTransaction[]> {
    return db
      .select()
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.isActive, true)))
      .orderBy(recurringTransactions.nextOccurrence)
  },

  async findAllByUserId(db: Database, userId: string): Promise<RecurringTransaction[]> {
    return db
      .select()
      .from(recurringTransactions)
      .where(eq(recurringTransactions.userId, userId))
      .orderBy(recurringTransactions.nextOccurrence)
  },

  async findById(
    db: Database,
    id: string,
    userId: string,
  ): Promise<RecurringTransaction | undefined> {
    const results = await db
      .select()
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
      .limit(1)

    return results[0]
  },

  async findDue(db: Database, userId: string, asOfDate: string): Promise<RecurringTransaction[]> {
    return db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.userId, userId),
          eq(recurringTransactions.isActive, true),
          lte(recurringTransactions.nextOccurrence, asOfDate),
        ),
      )
      .orderBy(recurringTransactions.nextOccurrence)
  },

  async create(db: Database, data: NewRecurringTransaction): Promise<RecurringTransaction> {
    const results = await db.insert(recurringTransactions).values(data).returning()

    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<
      Pick<
        RecurringTransaction,
        | 'categoryId'
        | 'name'
        | 'description'
        | 'amount'
        | 'amountMax'
        | 'dayOfMonth'
        | 'dayOfWeek'
        | 'requiresConfirmation'
        | 'merchantPattern'
        | 'isActive'
        | 'nextOccurrence'
        | 'lastOccurrence'
      >
    >,
  ): Promise<RecurringTransaction | undefined> {
    const results = await db
      .update(recurringTransactions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(recurringTransactions)
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
      .returning({ id: recurringTransactions.id })

    return results.length > 0
  },
}
