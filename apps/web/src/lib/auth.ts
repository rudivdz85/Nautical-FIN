import { auth, currentUser } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { users } from '@fin/core/db'
import { usersService } from '@fin/core/services'
import { UnauthorizedError } from '@fin/core/errors'
import type { AuthenticatedUser } from '@fin/core/types'

export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    throw new UnauthorizedError()
  }

  const results = await db
    .select({
      id: users.id,
      clerkId: users.clerkId,
      email: users.email,
      displayName: users.displayName,
      onboardingCompleted: users.onboardingCompleted,
    })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)

  const row = results[0]
  if (row) {
    return {
      id: row.id,
      clerkId: row.clerkId,
      email: row.email,
      displayName: row.displayName,
      onboardingCompleted: row.onboardingCompleted ?? false,
    }
  }

  // Auto-provision: user exists in Clerk but not in DB (e.g. webhook hasn't fired)
  const clerkUser = await currentUser()
  if (!clerkUser) {
    throw new UnauthorizedError()
  }

  const email = clerkUser.primaryEmailAddress?.emailAddress ?? ''
  const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || undefined
  const newUser = await usersService.createFromWebhook(db, clerkId, email, displayName)

  return {
    id: newUser.id,
    clerkId: newUser.clerkId,
    email: newUser.email,
    displayName: newUser.displayName,
    onboardingCompleted: newUser.onboardingCompleted ?? false,
  }
}
