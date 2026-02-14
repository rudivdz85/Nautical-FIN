import { eq, and, between, desc, sql, inArray } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { transactions } from '../db/schema'
import type { Transaction, NewTransaction, TransactionFilters } from '../types/transactions'

type Database = NeonHttpDatabase

export const transactionsRepository = {
  async findByUserId(
    db: Database,
    userId: string,
    filters: TransactionFilters = {},
  ): Promise<Transaction[]> {
    const conditions = [eq(transactions.userId, userId)]

    if (filters.accountId) {
      conditions.push(eq(transactions.accountId, filters.accountId))
    }
    if (filters.categoryId) {
      conditions.push(eq(transactions.categoryId, filters.categoryId))
    }
    if (filters.transactionType) {
      conditions.push(eq(transactions.transactionType, filters.transactionType))
    }
    if (filters.source) {
      conditions.push(eq(transactions.source, filters.source))
    }
    if (filters.isReviewed !== undefined) {
      conditions.push(eq(transactions.isReviewed, filters.isReviewed))
    }
    if (filters.startDate && filters.endDate) {
      conditions.push(
        between(transactions.transactionDate, filters.startDate, filters.endDate),
      )
    } else if (filters.startDate) {
      conditions.push(
        sql`${transactions.transactionDate} >= ${filters.startDate}`,
      )
    } else if (filters.endDate) {
      conditions.push(
        sql`${transactions.transactionDate} <= ${filters.endDate}`,
      )
    }

    return db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
  },

  async findById(db: Database, id: string, userId: string): Promise<Transaction | undefined> {
    const results = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .limit(1)

    return results[0]
  },

  async findByTransferPairId(db: Database, transferPairId: string): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.transferPairId, transferPairId))
  },

  async create(db: Database, data: NewTransaction): Promise<Transaction> {
    const results = await db.insert(transactions).values(data).returning()

    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<
      Pick<
        Transaction,
        | 'categoryId'
        | 'amount'
        | 'transactionDate'
        | 'postedDate'
        | 'description'
        | 'merchantOriginal'
        | 'merchantNormalized'
        | 'notes'
        | 'isReviewed'
      >
    >,
  ): Promise<Transaction | undefined> {
    const results = await db
      .update(transactions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning({ id: transactions.id })

    return results.length > 0
  },

  async findByDateAndAmount(
    db: Database,
    accountId: string,
    transactionDate: string,
    amount: string,
  ): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(transactions.transactionDate, transactionDate),
          eq(transactions.amount, amount),
        ),
      )
  },

  async bulkUpdateCategory(
    db: Database,
    ids: string[],
    userId: string,
    categoryId: string,
  ): Promise<number> {
    const results = await db
      .update(transactions)
      .set({ categoryId, isReviewed: true, updatedAt: new Date() })
      .where(
        and(
          inArray(transactions.id, ids),
          eq(transactions.userId, userId),
        ),
      )
      .returning({ id: transactions.id })

    return results.length
  },

  async deleteByTransferPairId(db: Database, transferPairId: string): Promise<number> {
    const results = await db
      .delete(transactions)
      .where(eq(transactions.transferPairId, transferPairId))
      .returning({ id: transactions.id })

    return results.length
  },
}
