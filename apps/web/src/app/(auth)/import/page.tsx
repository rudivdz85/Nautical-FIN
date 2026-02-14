import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { accountsService } from '@fin/core/services'
import { ImportPageClient } from './import-page-client'

export default async function ImportPage() {
  const user = await getAuthenticatedUser()
  const accounts = await accountsService.list(db, user.id)

  return <ImportPageClient accounts={accounts} />
}
