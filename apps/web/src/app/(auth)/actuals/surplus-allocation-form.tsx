'use client'

import { useState } from 'react'
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

interface SurplusAllocationFormProps {
  actualId: string
  onSuccess: () => void
  onCancel: () => void
}

const ACTION_OPTIONS = [
  { value: 'savings', label: 'Move to Savings' },
  { value: 'rollover', label: 'Rollover to Next Month' },
  { value: 'general', label: 'General / Discretionary' },
]

export function SurplusAllocationForm({
  actualId,
  onSuccess,
  onCancel,
}: SurplusAllocationFormProps) {
  const [amount, setAmount] = useState('')
  const [action, setAction] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await apiClient.post(`/api/actuals/${actualId}/surplus-allocations`, {
        amount,
        action,
      })
      toast.success('Surplus allocation added')
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
        <DialogTitle>Allocate Surplus</DialogTitle>
        <DialogDescription>
          Decide what to do with leftover funds from this month.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label>Amount</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Action</Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger>
              <SelectValue placeholder="What to do with this surplus" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !amount || !action}>
          {isSubmitting ? 'Adding...' : 'Allocate'}
        </Button>
      </DialogFooter>
    </form>
  )
}
