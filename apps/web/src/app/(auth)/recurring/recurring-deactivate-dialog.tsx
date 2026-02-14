'use client'

import { useState } from 'react'
import type { RecurringTransaction } from '@fin/core'
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

interface RecurringDeactivateDialogProps {
  recurring: RecurringTransaction
  onSuccess: () => void
  onCancel: () => void
}

export function RecurringDeactivateDialog({
  recurring,
  onSuccess,
  onCancel,
}: RecurringDeactivateDialogProps) {
  const [isDeactivating, setIsDeactivating] = useState(false)

  async function handleDeactivate() {
    setIsDeactivating(true)
    try {
      await apiClient.patch(`/api/recurring-transactions/${recurring.id}`, {
        isActive: false,
      })
      toast.success('Recurring transaction deactivated')
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to deactivate')
      }
      setIsDeactivating(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate Recurring Transaction</AlertDialogTitle>
          <AlertDialogDescription>
            This will deactivate &quot;{recurring.name}&quot;. No more instances will be
            generated. Previously created transactions will not be affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeactivate}
            disabled={isDeactivating}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeactivating ? 'Deactivating...' : 'Deactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
