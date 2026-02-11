import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { budgets, budgetItems, budgetIncomes, plannedOneOffs } from '../db/schema'

export type Budget = InferSelectModel<typeof budgets>
export type NewBudget = InferInsertModel<typeof budgets>
export type BudgetStatus = Budget['status']

export type BudgetItem = InferSelectModel<typeof budgetItems>
export type NewBudgetItem = InferInsertModel<typeof budgetItems>
export type SurplusAction = BudgetItem['surplusAction']

export type BudgetIncome = InferSelectModel<typeof budgetIncomes>
export type NewBudgetIncome = InferInsertModel<typeof budgetIncomes>

export type PlannedOneOff = InferSelectModel<typeof plannedOneOffs>
export type NewPlannedOneOff = InferInsertModel<typeof plannedOneOffs>

export interface BudgetWithDetails extends Budget {
  items: BudgetItem[]
  incomes: BudgetIncome[]
  plannedOneOffs: PlannedOneOff[]
}
