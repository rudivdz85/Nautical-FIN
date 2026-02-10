import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { accounts } from '../db/schema'
import type { Account, NewAccount } from '../types/accounts'

type Database = NeonHttpDatabase

export const accountsRepository = {
  async findByUserId(db: Database, userId: string): Promise<Account[]> {
    return db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
      .orderBy(accounts.displayOrder)
  },

  async findById(db: Database, id: string, userId: string): Promise<Account | undefined> {
    const results = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewAccount): Promise<Account> {
    const results = await db.insert(accounts).values(data).returning()

    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<Omit<NewAccount, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<Account | undefined> {
    const results = await db
      .update(accounts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning()

    return results[0]
  },

  async softDelete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .update(accounts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning({ id: accounts.id })

    return results.length > 0
  },

  async countByUserId(db: Database, userId: string): Promise<number> {
    const results = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))

    return results.length
  },
}
