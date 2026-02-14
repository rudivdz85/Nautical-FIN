'use client'

import { useState } from 'react'
import type { DebtPayment } from '@fin/core'
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

interface DebtPaymentDeleteDialogProps {
  debtId: string
  payment: DebtPayment
  onSuccess: () => void
  onCancel: () => void
}

export function DebtPaymentDeleteDialog({
  debtId,
  payment,
  onSuccess,
  onCancel,
}: DebtPaymentDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await apiClient.delete(`/api/debts/${debtId}/payments/${payment.id}`)
      toast.success('Payment removed')
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to remove payment')
      }
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Payment</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the payment of {formatCurrency(payment.amount)} and
            restore the debt balance. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? 'Removing...' : 'Remove Payment'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
