import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { accountsService } from '@fin/core/services'
import { AccountsPageClient } from './accounts-page-client'

export default async function AccountsPage() {
  const user = await getAuthenticatedUser()
  const accounts = await accountsService.list(db, user.id)

  return <AccountsPageClient initialAccounts={accounts} />
}
