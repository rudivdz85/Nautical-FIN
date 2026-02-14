'use client'

import { useState } from 'react'
import type { Account } from '@fin/core'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { apiClient, ApiError } from '@/lib/api-client'

interface BalanceConfirmationFormProps {
  actualId: string
  accounts: Account[]
  onSuccess: () => void
  onCancel: () => void
}

export function BalanceConfirmationForm({
  actualId,
  accounts,
  onSuccess,
  onCancel,
}: BalanceConfirmationFormProps) {
  const [accountId, setAccountId] = useState('')
  const [expectedBalance, setExpectedBalance] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await apiClient.post(`/api/actuals/${actualId}/balance-confirmations`, {
        accountId,
        expectedBalance,
        notes: notes || undefined,
      })
      toast.success('Balance confirmation added')
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Something went wrong')
      }
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Add Balance Confirmation</DialogTitle>
        <DialogDescription>
          Record the expected balance for an account to verify at month-end.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label>Account</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Expected Balance</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={expectedBalance}
            onChange={(e) => setExpectedBalance(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Input
            placeholder="Optional notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !accountId || !expectedBalance}>
          {isSubmitting ? 'Adding...' : 'Add'}
        </Button>
      </DialogFooter>
    </form>
  )
}
