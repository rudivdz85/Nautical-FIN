import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { merchantMappings } from '../db/schema'
import type { MerchantMapping, NewMerchantMapping } from '../types/merchant-mappings'

type Database = NeonHttpDatabase

export const merchantMappingsRepository = {
  async findByUserId(db: Database, userId: string): Promise<MerchantMapping[]> {
    return db
      .select()
      .from(merchantMappings)
      .where(eq(merchantMappings.userId, userId))
      .orderBy(merchantMappings.originalName)
  },

  async findById(db: Database, id: string, userId: string): Promise<MerchantMapping | undefined> {
    const results = await db
      .select()
      .from(merchantMappings)
      .where(and(eq(merchantMappings.id, id), eq(merchantMappings.userId, userId)))
      .limit(1)

    return results[0]
  },

  async findByOriginalName(
    db: Database,
    userId: string,
    originalName: string,
  ): Promise<MerchantMapping | undefined> {
    const results = await db
      .select()
      .from(merchantMappings)
      .where(
        and(
          eq(merchantMappings.userId, userId),
          eq(merchantMappings.originalName, originalName),
        ),
      )
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewMerchantMapping): Promise<MerchantMapping> {
    const results = await db.insert(merchantMappings).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<Pick<MerchantMapping, 'normalizedName' | 'isGlobal'>>,
  ): Promise<MerchantMapping | undefined> {
    const results = await db
      .update(merchantMappings)
      .set(data)
      .where(and(eq(merchantMappings.id, id), eq(merchantMappings.userId, userId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(merchantMappings)
      .where(and(eq(merchantMappings.id, id), eq(merchantMappings.userId, userId)))
      .returning({ id: merchantMappings.id })

    return results.length > 0
  },
}
