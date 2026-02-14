import { redirect } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { getAuthenticatedUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasksService } from '@fin/core/services'

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getAuthenticatedUser()

  if (!user.onboardingCompleted) {
    redirect('/onboarding')
  }

  const pendingTasks = await tasksService.list(db, user.id, ['pending', 'snoozed'])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader pendingTaskCount={pendingTasks.length} />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
