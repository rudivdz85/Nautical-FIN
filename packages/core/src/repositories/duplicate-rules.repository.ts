import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { duplicateRules } from '../db/schema'
import type { DuplicateRule, NewDuplicateRule } from '../types/duplicate-rules'

type Database = NeonHttpDatabase

export const duplicateRulesRepository = {
  async findByUserId(db: Database, userId: string): Promise<DuplicateRule[]> {
    return db
      .select()
      .from(duplicateRules)
      .where(eq(duplicateRules.userId, userId))
      .orderBy(duplicateRules.createdAt)
  },

  async findById(db: Database, id: string, userId: string): Promise<DuplicateRule | undefined> {
    const results = await db
      .select()
      .from(duplicateRules)
      .where(and(eq(duplicateRules.id, id), eq(duplicateRules.userId, userId)))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewDuplicateRule): Promise<DuplicateRule> {
    const results = await db.insert(duplicateRules).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<Pick<DuplicateRule, 'merchantPattern' | 'amount' | 'action'>>,
  ): Promise<DuplicateRule | undefined> {
    const results = await db
      .update(duplicateRules)
      .set(data)
      .where(and(eq(duplicateRules.id, id), eq(duplicateRules.userId, userId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(duplicateRules)
      .where(and(eq(duplicateRules.id, id), eq(duplicateRules.userId, userId)))
      .returning({ id: duplicateRules.id })

    return results.length > 0
  },
}
