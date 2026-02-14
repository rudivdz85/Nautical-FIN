import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { savingsGoalsService, accountsService } from '@fin/core/services'
import { SavingsGoalsPageClient } from './savings-goals-page-client'

export default async function SavingsPage() {
  const user = await getAuthenticatedUser()
  const [goals, accounts] = await Promise.all([
    savingsGoalsService.list(db, user.id),
    accountsService.list(db, user.id),
  ])

  return <SavingsGoalsPageClient initialGoals={goals} accounts={accounts} />
}
