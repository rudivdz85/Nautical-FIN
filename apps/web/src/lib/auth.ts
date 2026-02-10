import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { users } from '@fin/core/db'
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
    })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)

  const user = results[0]
  if (!user) {
    throw new UnauthorizedError('User account not found')
  }

  return user
}
