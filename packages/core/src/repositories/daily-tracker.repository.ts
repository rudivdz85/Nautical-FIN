import { eq, and, gte, lte, asc } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { dailyTrackerCache } from '../db/schema'
import type { DailyTrackerEntry, NewDailyTrackerEntry } from '../types/daily-tracker'

type Database = NeonHttpDatabase

export const dailyTrackerRepository = {
  async findByUserAndDateRange(
    db: Database,
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyTrackerEntry[]> {
    return db
      .select()
      .from(dailyTrackerCache)
      .where(
        and(
          eq(dailyTrackerCache.userId, userId),
          gte(dailyTrackerCache.date, startDate),
          lte(dailyTrackerCache.date, endDate),
        ),
      )
      .orderBy(asc(dailyTrackerCache.date))
  },

  async findByUserAndDate(
    db: Database,
    userId: string,
    date: string,
  ): Promise<DailyTrackerEntry | undefined> {
    const results = await db
      .select()
      .from(dailyTrackerCache)
      .where(
        and(
          eq(dailyTrackerCache.userId, userId),
          eq(dailyTrackerCache.date, date),
        ),
      )
      .limit(1)

    return results[0]
  },

  async findById(db: Database, id: string, userId: string): Promise<DailyTrackerEntry | undefined> {
    const results = await db
      .select()
      .from(dailyTrackerCache)
      .where(and(eq(dailyTrackerCache.id, id), eq(dailyTrackerCache.userId, userId)))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewDailyTrackerEntry): Promise<DailyTrackerEntry> {
    const results = await db.insert(dailyTrackerCache).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<
      Pick<
        DailyTrackerEntry,
        | 'expectedIncome'
        | 'expectedDebtPayments'
        | 'expectedExpenses'
        | 'predictedSpend'
        | 'manualOverride'
        | 'runningBalance'
        | 'hasAlerts'
        | 'alerts'
        | 'isPayday'
        | 'incomeDetails'
        | 'debtDetails'
        | 'expenseDetails'
        | 'calculatedAt'
      >
    >,
  ): Promise<DailyTrackerEntry | undefined> {
    const results = await db
      .update(dailyTrackerCache)
      .set({ ...data, calculatedAt: new Date() })
      .where(and(eq(dailyTrackerCache.id, id), eq(dailyTrackerCache.userId, userId)))
      .returning()

    return results[0]
  },

  async deleteByUserAndDateRange(
    db: Database,
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const results = await db
      .delete(dailyTrackerCache)
      .where(
        and(
          eq(dailyTrackerCache.userId, userId),
          gte(dailyTrackerCache.date, startDate),
          lte(dailyTrackerCache.date, endDate),
        ),
      )
      .returning({ id: dailyTrackerCache.id })

    return results.length
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(dailyTrackerCache)
      .where(and(eq(dailyTrackerCache.id, id), eq(dailyTrackerCache.userId, userId)))
      .returning({ id: dailyTrackerCache.id })

    return results.length > 0
  },
}
