'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function TaskBell() {
  return (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-4 w-4" />
      <Badge
        variant="destructive"
        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full p-0 text-[10px]"
      >
        0
      </Badge>
      <span className="sr-only">Tasks</span>
    </Button>
  )
}
