import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { savingsGoals, savingsContributions } from '../db/schema'

export type SavingsGoal = InferSelectModel<typeof savingsGoals>
export type NewSavingsGoal = InferInsertModel<typeof savingsGoals>
export type SavingsGoalType = SavingsGoal['goalType']

export type SavingsContribution = InferSelectModel<typeof savingsContributions>
export type NewSavingsContribution = InferInsertModel<typeof savingsContributions>

export interface SavingsGoalWithContributions extends SavingsGoal {
  contributions: SavingsContribution[]
}
