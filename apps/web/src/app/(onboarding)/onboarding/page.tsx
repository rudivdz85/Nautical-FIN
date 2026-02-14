import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth'
import { OnboardingPageClient } from './onboarding-page-client'

export default async function OnboardingPage() {
  const user = await getAuthenticatedUser()

  if (user.onboardingCompleted) {
    redirect('/dashboard')
  }

  return <OnboardingPageClient userName={user.displayName ?? user.email} />
}
