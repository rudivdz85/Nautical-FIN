'use client'

import { useState } from 'react'
import type { Task } from '@fin/core'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { apiClient, ApiError } from '@/lib/api-client'

interface TaskDeleteDialogProps {
  task: Task
  onSuccess: () => void
  onCancel: () => void
}

export function TaskDeleteDialog({ task, onSuccess, onCancel }: TaskDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await apiClient.delete(`/api/tasks/${task.id}`)
      toast.success('Task deleted')
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to delete task')
      }
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Task</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &quot;{task.title}&quot;.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
