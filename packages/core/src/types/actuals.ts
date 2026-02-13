import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type {
  actuals,
  actualCategories,
  accountBalanceConfirmations,
  surplusAllocations,
} from '../db/schema'

export type Actual = InferSelectModel<typeof actuals>
export type NewActual = InferInsertModel<typeof actuals>
export type ActualStatus = Actual['status']

export type ActualCategory = InferSelectModel<typeof actualCategories>
export type NewActualCategory = InferInsertModel<typeof actualCategories>

export type BalanceConfirmation = InferSelectModel<typeof accountBalanceConfirmations>
export type NewBalanceConfirmation = InferInsertModel<typeof accountBalanceConfirmations>

export type SurplusAllocation = InferSelectModel<typeof surplusAllocations>
export type NewSurplusAllocation = InferInsertModel<typeof surplusAllocations>

export interface ActualWithDetails extends Actual {
  categories: ActualCategory[]
  balanceConfirmations: BalanceConfirmation[]
  surplusAllocations: SurplusAllocation[]
}
