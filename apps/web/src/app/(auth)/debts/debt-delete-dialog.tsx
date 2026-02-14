'use client'

import { useState } from 'react'
import type { Debt } from '@fin/core'
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

interface DebtDeleteDialogProps {
  debt: Debt
  onSuccess: () => void
  onCancel: () => void
}

export function DebtDeleteDialog({ debt, onSuccess, onCancel }: DebtDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await apiClient.patch<Debt>(`/api/debts/${debt.id}`, { isActive: false })
      toast.success('Debt deactivated')
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to deactivate debt')
      }
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate Debt</AlertDialogTitle>
          <AlertDialogDescription>
            This will deactivate &quot;{debt.name}&quot;. The debt and its
            payment history will be preserved but hidden from active views.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? 'Deactivating...' : 'Deactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
