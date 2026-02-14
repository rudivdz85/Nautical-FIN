'use client'

import { useState } from 'react'
import type { SavingsContribution } from '@fin/core'
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
import { formatCurrency } from '@/lib/format'

interface SavingsContributionDeleteDialogProps {
  goalId: string
  contribution: SavingsContribution
  onSuccess: () => void
  onCancel: () => void
}

export function SavingsContributionDeleteDialog({
  goalId,
  contribution,
  onSuccess,
  onCancel,
}: SavingsContributionDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await apiClient.delete(`/api/savings-goals/${goalId}/contributions/${contribution.id}`)
      toast.success('Contribution removed')
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to remove contribution')
      }
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Contribution</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the contribution of {formatCurrency(contribution.amount)} and
            reduce the goal balance. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? 'Removing...' : 'Remove Contribution'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
