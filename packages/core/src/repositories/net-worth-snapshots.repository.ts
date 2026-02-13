import { eq, and, desc } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { netWorthSnapshots } from '../db/schema'
import type { NetWorthSnapshot, NewNetWorthSnapshot } from '../types/net-worth-snapshots'

type Database = NeonHttpDatabase

export const netWorthSnapshotsRepository = {
  async findByUserId(db: Database, userId: string): Promise<NetWorthSnapshot[]> {
    return db
      .select()
      .from(netWorthSnapshots)
      .where(eq(netWorthSnapshots.userId, userId))
      .orderBy(desc(netWorthSnapshots.snapshotDate))
  },

  async findById(db: Database, id: string, userId: string): Promise<NetWorthSnapshot | undefined> {
    const results = await db
      .select()
      .from(netWorthSnapshots)
      .where(and(eq(netWorthSnapshots.id, id), eq(netWorthSnapshots.userId, userId)))
      .limit(1)

    return results[0]
  },

  async findByDate(
    db: Database,
    userId: string,
    snapshotDate: string,
  ): Promise<NetWorthSnapshot | undefined> {
    const results = await db
      .select()
      .from(netWorthSnapshots)
      .where(
        and(
          eq(netWorthSnapshots.userId, userId),
          eq(netWorthSnapshots.snapshotDate, snapshotDate),
        ),
      )
      .limit(1)

    return results[0]
  },

  async findLatest(db: Database, userId: string): Promise<NetWorthSnapshot | undefined> {
    const results = await db
      .select()
      .from(netWorthSnapshots)
      .where(eq(netWorthSnapshots.userId, userId))
      .orderBy(desc(netWorthSnapshots.snapshotDate))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewNetWorthSnapshot): Promise<NetWorthSnapshot> {
    const results = await db.insert(netWorthSnapshots).values(data).returning()
    return results[0]!
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(netWorthSnapshots)
      .where(and(eq(netWorthSnapshots.id, id), eq(netWorthSnapshots.userId, userId)))
      .returning({ id: netWorthSnapshots.id })

    return results.length > 0
  },
}
