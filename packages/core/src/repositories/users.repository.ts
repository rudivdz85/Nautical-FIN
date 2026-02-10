import { eq } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { users } from '../db/schema'
import type { User, NewUser, UserPreferences } from '../types/users'

type Database = NeonHttpDatabase

export const usersRepository = {
  async findByClerkId(db: Database, clerkId: string): Promise<User | undefined> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1)

    return results[0]
  },

  async findById(db: Database, id: string): Promise<User | undefined> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewUser): Promise<User> {
    const results = await db.insert(users).values(data).returning()

    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    data: Partial<Pick<User, 'email' | 'displayName' | 'isSalaried' | 'onboardingCompleted'>>,
  ): Promise<User | undefined> {
    const results = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()

    return results[0]
  },

  async updateByClerkId(
    db: Database,
    clerkId: string,
    data: Partial<Pick<User, 'email' | 'displayName'>>,
  ): Promise<User | undefined> {
    const results = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.clerkId, clerkId))
      .returning()

    return results[0]
  },

  async updatePreferences(
    db: Database,
    id: string,
    preferences: UserPreferences,
  ): Promise<User | undefined> {
    const results = await db
      .update(users)
      .set({ preferences, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()

    return results[0]
  },

  async deleteByClerkId(db: Database, clerkId: string): Promise<boolean> {
    const results = await db
      .delete(users)
      .where(eq(users.clerkId, clerkId))
      .returning({ id: users.id })

    return results.length > 0
  },
}
