'use client'

import { useState } from 'react'
import type { RecurringTransaction } from '@fin/core'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { apiClient, ApiError } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/format'

interface RecurringGenerateDialogProps {
  recurring: RecurringTransaction
  onSuccess: () => void
  onCancel: () => void
}

export function RecurringGenerateDialog({
  recurring,
  onSuccess,
  onCancel,
}: RecurringGenerateDialogProps) {
  const isVariable = recurring.amountType === 'variable'
  const [amount, setAmount] = useState(recurring.amount ?? '')
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleGenerate() {
    if (!amount.trim()) {
      toast.error('Amount is required')
      return
    }
    setIsGenerating(true)
    try {
      await apiClient.post(`/api/recurring-transactions/${recurring.id}/generate`, {
        amount: amount.trim(),
      })
      toast.success('Transaction generated')
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to generate transaction')
      }
      setIsGenerating(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Generate Transaction</DialogTitle>
        <DialogDescription>
          Create a transaction instance from &quot;{recurring.name}&quot; for{' '}
          {formatDate(recurring.nextOccurrence)}.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {isVariable ? (
          <div>
            <label className="text-sm font-medium">
              Amount (max: {formatCurrency(recurring.amountMax ?? '0')})
            </label>
            <Input
              className="mt-1"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        ) : (
          <p className="text-sm">
            Amount: <span className="font-semibold font-numbers">{formatCurrency(recurring.amount ?? '0')}</span>
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </DialogFooter>
    </>
  )
}
