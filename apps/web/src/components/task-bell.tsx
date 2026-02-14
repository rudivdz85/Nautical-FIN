'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TaskBellProps {
  count?: number
}

export function TaskBell({ count = 0 }: TaskBellProps) {
  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link href="/tasks">
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full p-0 text-[10px]"
          >
            {count > 9 ? '9+' : count}
          </Badge>
        )}
        <span className="sr-only">{count} pending tasks</span>
      </Link>
    </Button>
  )
}
