'use client'

import { useState } from 'react'
import type { Category, ActualCategory } from '@fin/core'
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

interface ActualCategoryFormProps {
  actualId: string
  category?: ActualCategory
  categories: Category[]
  onSuccess: () => void
  onCancel: () => void
}

export function ActualCategoryForm({
  actualId,
  category,
  categories,
  onSuccess,
  onCancel,
}: ActualCategoryFormProps) {
  const isEditing = !!category
  const [categoryId, setCategoryId] = useState(category?.categoryId ?? '')
  const [totalAmount, setTotalAmount] = useState(category?.totalAmount ?? '0')
  const [budgetedAmount, setBudgetedAmount] = useState(category?.budgetedAmount ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (isEditing) {
        await apiClient.patch(
          `/api/actuals/${actualId}/categories/${category.id}`,
          { totalAmount, budgetedAmount: budgetedAmount || undefined },
        )
        toast.success('Category updated')
      } else {
        await apiClient.post(`/api/actuals/${actualId}/categories`, {
          categoryId,
          totalAmount,
          budgetedAmount: budgetedAmount || undefined,
        })
        toast.success('Category added')
      }
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
        <DialogTitle>{isEditing ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Update the actual spending for this category.'
            : 'Add a category to compare budget vs actual spending.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        {!isEditing && (
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Actual Amount</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Budgeted Amount</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={budgetedAmount}
            onChange={(e) => setBudgetedAmount(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || (!isEditing && !categoryId)}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Add'}
        </Button>
      </DialogFooter>
    </form>
  )
}
