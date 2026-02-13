import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { merchantMappings } from '../db/schema'

export type MerchantMapping = InferSelectModel<typeof merchantMappings>
export type NewMerchantMapping = InferInsertModel<typeof merchantMappings>
