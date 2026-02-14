import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { budgetsService, accountsService, categoriesService } from '@fin/core/services'
import { BudgetPageClient } from './budget-page-client'

export default async function BudgetPage() {
  const user = await getAuthenticatedUser()
  const [budgets, accounts, categories] = await Promise.all([
    budgetsService.list(db, user.id),
    accountsService.list(db, user.id),
    categoriesService.list(db, user.id),
  ])

  return (
    <BudgetPageClient
      initialBudgets={budgets}
      accounts={accounts}
      categories={categories}
    />
  )
}
