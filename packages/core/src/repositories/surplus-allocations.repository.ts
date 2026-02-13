import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { surplusAllocations } from '../db/schema'
import type { SurplusAllocation, NewSurplusAllocation } from '../types/actuals'

type Database = NeonHttpDatabase

export const surplusAllocationsRepository = {
  async findByActualId(db: Database, actualId: string): Promise<SurplusAllocation[]> {
    return db
      .select()
      .from(surplusAllocations)
      .where(eq(surplusAllocations.actualId, actualId))
  },

  async findById(
    db: Database,
    id: string,
    actualId: string,
  ): Promise<SurplusAllocation | undefined> {
    const results = await db
      .select()
      .from(surplusAllocations)
      .where(
        and(
          eq(surplusAllocations.id, id),
          eq(surplusAllocations.actualId, actualId),
        ),
      )
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewSurplusAllocation): Promise<SurplusAllocation> {
    const results = await db.insert(surplusAllocations).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    actualId: string,
    data: Partial<Pick<SurplusAllocation, 'isActioned' | 'actionedAt'>>,
  ): Promise<SurplusAllocation | undefined> {
    const results = await db
      .update(surplusAllocations)
      .set(data)
      .where(
        and(
          eq(surplusAllocations.id, id),
          eq(surplusAllocations.actualId, actualId),
        ),
      )
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, actualId: string): Promise<boolean> {
    const results = await db
      .delete(surplusAllocations)
      .where(
        and(
          eq(surplusAllocations.id, id),
          eq(surplusAllocations.actualId, actualId),
        ),
      )
      .returning({ id: surplusAllocations.id })

    return results.length > 0
  },
}
