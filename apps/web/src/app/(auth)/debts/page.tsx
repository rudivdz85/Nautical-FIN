import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { debtsService, accountsService } from '@fin/core/services'
import { DebtsPageClient } from './debts-page-client'

export default async function DebtsPage() {
  const user = await getAuthenticatedUser()
  const [debts, accounts] = await Promise.all([
    debtsService.list(db, user.id),
    accountsService.list(db, user.id),
  ])

  return <DebtsPageClient initialDebts={debts} accounts={accounts} />
}
