import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { actualsService, accountsService, categoriesService } from '@fin/core/services'
import { ActualsPageClient } from './actuals-page-client'

export default async function ActualsPage() {
  const user = await getAuthenticatedUser()
  const [actuals, accounts, categories] = await Promise.all([
    actualsService.list(db, user.id),
    accountsService.list(db, user.id),
    categoriesService.list(db, user.id),
  ])

  return (
    <ActualsPageClient
      initialActuals={actuals}
      accounts={accounts}
      categories={categories}
    />
  )
}
