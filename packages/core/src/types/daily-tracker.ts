import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { dailyTrackerCache } from '../db/schema'

export type DailyTrackerEntry = InferSelectModel<typeof dailyTrackerCache>
export type NewDailyTrackerEntry = InferInsertModel<typeof dailyTrackerCache>
