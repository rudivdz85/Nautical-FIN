import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { netWorthSnapshots } from '../db/schema'

export type NetWorthSnapshot = InferSelectModel<typeof netWorthSnapshots>
export type NewNetWorthSnapshot = InferInsertModel<typeof netWorthSnapshots>
