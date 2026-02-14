'use client'

import { useState } from 'react'
import type { Task } from '@fin/core'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { apiClient, ApiError } from '@/lib/api-client'

interface TaskSnoozeDialogProps {
  task: Task
  onSuccess: () => void
  onCancel: () => void
}

function getDefaultSnoozeDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0] ?? ''
}

export function TaskSnoozeDialog({ task, onSuccess, onCancel }: TaskSnoozeDialogProps) {
  const [isSnoozing, setIsSnoozing] = useState(false)
  const [snoozeDate, setSnoozeDate] = useState(getDefaultSnoozeDate())

  async function handleSnooze() {
    setIsSnoozing(true)
    try {
      const snoozedUntil = new Date(`${snoozeDate}T09:00:00`).toISOString()
      await apiClient.post(`/api/tasks/${task.id}/snooze`, { snoozedUntil })
      toast.success('Task snoozed')
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to snooze task')
      }
      setIsSnoozing(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Snooze Task</AlertDialogTitle>
          <AlertDialogDescription>
            Choose when to be reminded about &quot;{task.title}&quot;.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="snooze-date">Snooze until</Label>
          <Input
            id="snooze-date"
            type="date"
            className="mt-2"
            value={snoozeDate}
            onChange={(e) => setSnoozeDate(e.target.value)}
            min={getDefaultSnoozeDate()}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSnoozing}>Cancel</AlertDialogCancel>
          <Button onClick={handleSnooze} disabled={isSnoozing || !snoozeDate}>
            {isSnoozing ? 'Snoozing...' : 'Snooze'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
