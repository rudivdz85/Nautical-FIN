'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { createBudgetItemSchema, type BudgetItem, type Category } from '@fin/core'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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

type FormValues = z.input<typeof createBudgetItemSchema>

interface BudgetItemFormProps {
  budgetId: string
  item?: BudgetItem
  categories: Category[]
  onSuccess: () => void
  onCancel: () => void
}

export function BudgetItemForm({
  budgetId,
  item,
  categories,
  onSuccess,
  onCancel,
}: BudgetItemFormProps) {
  const isEditing = !!item

  const form = useForm<FormValues>({
    resolver: zodResolver(createBudgetItemSchema),
    defaultValues: item
      ? {
          categoryId: item.categoryId,
          plannedAmount: item.plannedAmount,
          surplusAction: (item.surplusAction as 'rollover' | 'savings' | 'general') ?? undefined,
        }
      : {
          categoryId: categories[0]?.id ?? '',
          plannedAmount: '',
        },
  })

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        await apiClient.patch(`/api/budgets/${budgetId}/items/${item.id}`, {
          plannedAmount: data.plannedAmount,
          surplusAction: data.surplusAction,
        })
        toast.success('Allocation updated')
      } else {
        await apiClient.post(`/api/budgets/${budgetId}/items`, data)
        toast.success('Allocation added')
      }
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Something went wrong')
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Allocation' : 'Add Allocation'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the category budget allocation.'
              : 'Allocate budget to a category.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!isEditing && (
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="plannedAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Planned Amount</FormLabel>
                <FormControl>
                  <Input placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="surplusAction"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Surplus Action</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Default (General)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="rollover">Rollover to next month</SelectItem>
                    <SelectItem value="savings">Move to savings</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? (isEditing ? 'Saving...' : 'Adding...')
              : (isEditing ? 'Save Changes' : 'Add Allocation')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
