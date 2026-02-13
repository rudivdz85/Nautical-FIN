import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { categorizationRules } from '../db/schema'

export type CategorizationRule = InferSelectModel<typeof categorizationRules>
export type NewCategorizationRule = InferInsertModel<typeof categorizationRules>
