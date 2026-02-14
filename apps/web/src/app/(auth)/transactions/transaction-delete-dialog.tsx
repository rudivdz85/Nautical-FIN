'use client'

import { useState } from 'react'
import type { Transaction } from '@fin/core'
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

interface TransactionDeleteDialogProps {
  transaction: Transaction
  onSuccess: () => void
  onCancel: () => void
}

export function TransactionDeleteDialog({
  transaction,
  onSuccess,
  onCancel,
}: TransactionDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const isTransfer = !!transaction.transferPairId

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await apiClient.delete(`/api/transactions/${transaction.id}`)
      toast.success('Transaction deleted')
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to delete transaction')
      }
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &quot;{transaction.description}&quot; and adjust
            the account balance accordingly.
            {isTransfer && (
              <> The paired transfer transaction will also be deleted.</>
            )}
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
