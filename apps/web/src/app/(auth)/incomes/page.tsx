import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { incomesService, accountsService } from '@fin/core/services'
import { IncomesPageClient } from './incomes-page-client'

export default async function IncomesPage() {
  const user = await getAuthenticatedUser()
  const [incomes, accounts] = await Promise.all([
    incomesService.listAll(db, user.id),
    accountsService.list(db, user.id),
  ])

  return <IncomesPageClient initialIncomes={incomes} accounts={accounts} />
}
