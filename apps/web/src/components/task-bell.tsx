'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lightbulb,
  Eye,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { apiClient, ApiError } from '@/lib/api-client'
import type { Task, AiInsight } from '@fin/core'

interface TaskBellProps {
  count?: number
  tasks?: Task[]
  insights?: AiInsight[]
}

export function TaskBell({ count = 0, tasks = [], insights = [] }: TaskBellProps) {
  const router = useRouter()
  const totalCount = count + insights.length

  async function handleTaskAction(taskId: string, action: 'complete' | 'dismiss') {
    try {
      await apiClient.post(`/api/tasks/${taskId}/${action}`, {})
      toast.success(action === 'complete' ? 'Task completed' : 'Task dismissed')
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      }
    }
  }

  async function handleInsightAction(insightId: string, action: 'read' | 'dismiss') {
    try {
      await apiClient.post(`/api/ai-insights/${insightId}/${action}`, {})
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      }
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {totalCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full p-0 text-[10px]"
            >
              {totalCount > 9 ? '9+' : totalCount}
            </Badge>
          )}
          <span className="sr-only">{totalCount} notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {totalCount === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No notifications
            </p>
          ) : (
            <div className="divide-y">
              {insights.slice(0, 3).map((insight) => (
                <div key={insight.id} className="flex items-start gap-2 px-4 py-3">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{insight.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {insight.content}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => handleInsightAction(insight.id, 'read')}
                      title="Mark as read"
                    >
                      <Eye className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => handleInsightAction(insight.id, 'dismiss')}
                      title="Dismiss"
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-start gap-2 px-4 py-3">
                  <PriorityDot priority={task.priority} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{task.title}</p>
                    {task.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => handleTaskAction(task.id, 'complete')}
                      title="Complete"
                    >
                      <CheckCircle2 className="size-3 text-emerald-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => handleTaskAction(task.id, 'dismiss')}
                      title="Dismiss"
                    >
                      <XCircle className="size-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t px-4 py-2">
          <Link href="/tasks" className="text-xs text-muted-foreground hover:underline">
            View all tasks
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function PriorityDot({ priority }: { priority: string | null }) {
  if (priority === 'high') {
    return <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
  }
  if (priority === 'low') {
    return <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
  }
  return <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
}
