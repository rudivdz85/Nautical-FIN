'use client'

import { useState } from 'react'
import type { Income } from '@fin/core'
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

interface IncomeDeleteDialogProps {
  income: Income
  onSuccess: () => void
  onCancel: () => void
}

export function IncomeDeleteDialog({ income, onSuccess, onCancel }: IncomeDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await apiClient.delete(`/api/incomes/${income.id}`)
      toast.success('Income deleted')
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to delete income')
      }
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Income</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &quot;{income.name}&quot; from your income sources.
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
