import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { usersService } from '@fin/core/services'
import { SettingsPageClient } from './settings-page-client'

export default async function SettingsPage() {
  const authUser = await getAuthenticatedUser()
  const user = await usersService.getById(db, authUser.id)

  return <SettingsPageClient initialUser={user} />
}
