import { eq, and, desc } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { aiInsights } from '../db/schema'
import type { AiInsight, NewAiInsight } from '../types/ai-insights'

type Database = NeonHttpDatabase

export const aiInsightsRepository = {
  async findByUserId(db: Database, userId: string): Promise<AiInsight[]> {
    return db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.userId, userId))
      .orderBy(desc(aiInsights.createdAt))
  },

  async findUnreadByUserId(db: Database, userId: string): Promise<AiInsight[]> {
    return db
      .select()
      .from(aiInsights)
      .where(
        and(
          eq(aiInsights.userId, userId),
          eq(aiInsights.isRead, false),
          eq(aiInsights.isDismissed, false),
        ),
      )
      .orderBy(desc(aiInsights.createdAt))
  },

  async findById(db: Database, id: string, userId: string): Promise<AiInsight | undefined> {
    const results = await db
      .select()
      .from(aiInsights)
      .where(and(eq(aiInsights.id, id), eq(aiInsights.userId, userId)))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewAiInsight): Promise<AiInsight> {
    const results = await db.insert(aiInsights).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<Pick<NewAiInsight, 'isRead' | 'isDismissed'>>,
  ): Promise<AiInsight | undefined> {
    const results = await db
      .update(aiInsights)
      .set(data)
      .where(and(eq(aiInsights.id, id), eq(aiInsights.userId, userId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(aiInsights)
      .where(and(eq(aiInsights.id, id), eq(aiInsights.userId, userId)))
      .returning({ id: aiInsights.id })

    return results.length > 0
  },
}
