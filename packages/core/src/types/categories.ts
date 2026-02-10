import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { categories } from '../db/schema'

export type Category = InferSelectModel<typeof categories>
export type NewCategory = InferInsertModel<typeof categories>

export type CategoryType = Category['categoryType']
