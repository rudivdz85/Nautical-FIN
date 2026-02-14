'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { createBudgetIncomeSchema, type BudgetIncome } from '@fin/core'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { apiClient, ApiError } from '@/lib/api-client'

type FormValues = z.input<typeof createBudgetIncomeSchema>

interface BudgetIncomeFormProps {
  budgetId: string
  income?: BudgetIncome
  onSuccess: () => void
  onCancel: () => void
}

export function BudgetIncomeForm({
  budgetId,
  income,
  onSuccess,
  onCancel,
}: BudgetIncomeFormProps) {
  const isEditing = !!income

  const form = useForm<FormValues>({
    resolver: zodResolver(createBudgetIncomeSchema),
    defaultValues: income
      ? {
          name: income.name,
          expectedAmount: income.expectedAmount,
          expectedDate: income.expectedDate ?? undefined,
        }
      : {
          name: '',
          expectedAmount: '',
        },
  })

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        await apiClient.patch(`/api/budgets/${budgetId}/incomes/${income.id}`, {
          name: data.name,
          expectedAmount: data.expectedAmount,
          expectedDate: data.expectedDate ?? null,
        })
        toast.success('Income updated')
      } else {
        await apiClient.post(`/api/budgets/${budgetId}/incomes`, data)
        toast.success('Income added')
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
          <DialogTitle>{isEditing ? 'Edit Income' : 'Add Income'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the expected income source.'
              : 'Add an expected income source for this budget.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Salary, Freelance" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="expectedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Amount</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expectedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? (isEditing ? 'Saving...' : 'Adding...')
              : (isEditing ? 'Save Changes' : 'Add Income')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
