import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { recurringTransactionsService, accountsService, categoriesService } from '@fin/core/services'
import { RecurringPageClient } from './recurring-page-client'

export default async function RecurringPage() {
  const user = await getAuthenticatedUser()
  const [recurring, accounts, categories] = await Promise.all([
    recurringTransactionsService.listAll(db, user.id),
    accountsService.list(db, user.id),
    categoriesService.list(db, user.id),
  ])

  return (
    <RecurringPageClient
      initialRecurring={recurring}
      accounts={accounts}
      categories={categories}
    />
  )
}
