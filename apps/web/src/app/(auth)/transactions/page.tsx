import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { accountsService, categoriesService } from '@fin/core/services'
import { TransactionsPageClient } from './transactions-page-client'

export default async function TransactionsPage() {
  const user = await getAuthenticatedUser()
  const [accounts, categories] = await Promise.all([
    accountsService.list(db, user.id),
    categoriesService.list(db, user.id),
  ])

  return <TransactionsPageClient accounts={accounts} categories={categories} />
}
