import { eq } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { subscriptions } from '../db/schema'
import type { Subscription, NewSubscription } from '../types/users'

type Database = NeonHttpDatabase

export const subscriptionsRepository = {
  async findByUserId(db: Database, userId: string): Promise<Subscription | undefined> {
    const results = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewSubscription): Promise<Subscription> {
    const results = await db.insert(subscriptions).values(data).returning()

    return results[0]!
  },
}
