'use client'

import type { Task, AiInsight } from '@fin/core'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { TaskBell } from '@/components/task-bell'
import { ModeToggle } from '@/components/mode-toggle'

interface AppHeaderProps {
  pendingTaskCount?: number
  pendingTasks?: Task[]
  unreadInsights?: AiInsight[]
}

export function AppHeader({
  pendingTaskCount = 0,
  pendingTasks = [],
  unreadInsights = [],
}: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <PageBreadcrumb />
      <div className="ml-auto flex items-center gap-1">
        <TaskBell
          count={pendingTaskCount}
          tasks={pendingTasks}
          insights={unreadInsights}
        />
        <ModeToggle />
      </div>
    </header>
  )
}
