import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { accountBalanceConfirmations } from '../db/schema'
import type { BalanceConfirmation, NewBalanceConfirmation } from '../types/actuals'

type Database = NeonHttpDatabase

export const balanceConfirmationsRepository = {
  async findByActualId(db: Database, actualId: string): Promise<BalanceConfirmation[]> {
    return db
      .select()
      .from(accountBalanceConfirmations)
      .where(eq(accountBalanceConfirmations.actualId, actualId))
  },

  async findById(
    db: Database,
    id: string,
    actualId: string,
  ): Promise<BalanceConfirmation | undefined> {
    const results = await db
      .select()
      .from(accountBalanceConfirmations)
      .where(
        and(
          eq(accountBalanceConfirmations.id, id),
          eq(accountBalanceConfirmations.actualId, actualId),
        ),
      )
      .limit(1)

    return results[0]
  },

  async findByActualAndAccount(
    db: Database,
    actualId: string,
    accountId: string,
  ): Promise<BalanceConfirmation | undefined> {
    const results = await db
      .select()
      .from(accountBalanceConfirmations)
      .where(
        and(
          eq(accountBalanceConfirmations.actualId, actualId),
          eq(accountBalanceConfirmations.accountId, accountId),
        ),
      )
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewBalanceConfirmation): Promise<BalanceConfirmation> {
    const results = await db.insert(accountBalanceConfirmations).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    actualId: string,
    data: Partial<
      Pick<
        BalanceConfirmation,
        'confirmedBalance' | 'difference' | 'isConfirmed' | 'confirmedAt' | 'notes'
      >
    >,
  ): Promise<BalanceConfirmation | undefined> {
    const results = await db
      .update(accountBalanceConfirmations)
      .set(data)
      .where(
        and(
          eq(accountBalanceConfirmations.id, id),
          eq(accountBalanceConfirmations.actualId, actualId),
        ),
      )
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, actualId: string): Promise<boolean> {
    const results = await db
      .delete(accountBalanceConfirmations)
      .where(
        and(
          eq(accountBalanceConfirmations.id, id),
          eq(accountBalanceConfirmations.actualId, actualId),
        ),
      )
      .returning({ id: accountBalanceConfirmations.id })

    return results.length > 0
  },
}
