import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { categorizationRules } from '../db/schema'
import type { CategorizationRule, NewCategorizationRule } from '../types/categorization-rules'

type Database = NeonHttpDatabase

export const categorizationRulesRepository = {
  async findByUserId(db: Database, userId: string): Promise<CategorizationRule[]> {
    return db
      .select()
      .from(categorizationRules)
      .where(and(eq(categorizationRules.userId, userId), eq(categorizationRules.isActive, true)))
      .orderBy(categorizationRules.priority)
  },

  async findAllByUserId(db: Database, userId: string): Promise<CategorizationRule[]> {
    return db
      .select()
      .from(categorizationRules)
      .where(eq(categorizationRules.userId, userId))
      .orderBy(categorizationRules.priority)
  },

  async findById(db: Database, id: string, userId: string): Promise<CategorizationRule | undefined> {
    const results = await db
      .select()
      .from(categorizationRules)
      .where(and(eq(categorizationRules.id, id), eq(categorizationRules.userId, userId)))
      .limit(1)

    return results[0]
  },

  async findByMerchantExact(
    db: Database,
    userId: string,
    merchantExact: string,
  ): Promise<CategorizationRule[]> {
    return db
      .select()
      .from(categorizationRules)
      .where(
        and(
          eq(categorizationRules.userId, userId),
          eq(categorizationRules.merchantExact, merchantExact),
          eq(categorizationRules.isActive, true),
        ),
      )
      .orderBy(categorizationRules.priority)
  },

  async create(db: Database, data: NewCategorizationRule): Promise<CategorizationRule> {
    const results = await db.insert(categorizationRules).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<
      Pick<
        CategorizationRule,
        | 'categoryId'
        | 'merchantExact'
        | 'merchantPattern'
        | 'descriptionPattern'
        | 'amountMin'
        | 'amountMax'
        | 'priority'
        | 'confidence'
        | 'isActive'
        | 'isGlobal'
        | 'timesApplied'
        | 'timesCorrected'
      >
    >,
  ): Promise<CategorizationRule | undefined> {
    const results = await db
      .update(categorizationRules)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(categorizationRules.id, id), eq(categorizationRules.userId, userId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(categorizationRules)
      .where(and(eq(categorizationRules.id, id), eq(categorizationRules.userId, userId)))
      .returning({ id: categorizationRules.id })

    return results.length > 0
  },

  async incrementApplied(db: Database, id: string, userId: string): Promise<void> {
    const rule = await db
      .select()
      .from(categorizationRules)
      .where(and(eq(categorizationRules.id, id), eq(categorizationRules.userId, userId)))
      .limit(1)

    if (rule[0]) {
      await db
        .update(categorizationRules)
        .set({
          timesApplied: (rule[0].timesApplied ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(categorizationRules.id, id))
    }
  },

  async incrementCorrected(db: Database, id: string, userId: string): Promise<void> {
    const rule = await db
      .select()
      .from(categorizationRules)
      .where(and(eq(categorizationRules.id, id), eq(categorizationRules.userId, userId)))
      .limit(1)

    if (rule[0]) {
      await db
        .update(categorizationRules)
        .set({
          timesCorrected: (rule[0].timesCorrected ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(categorizationRules.id, id))
    }
  },
}
