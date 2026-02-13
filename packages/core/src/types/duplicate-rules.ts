import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { duplicateRules } from '../db/schema'

export type DuplicateRule = InferSelectModel<typeof duplicateRules>
export type NewDuplicateRule = InferInsertModel<typeof duplicateRules>
export type DuplicateAction = DuplicateRule['action']
