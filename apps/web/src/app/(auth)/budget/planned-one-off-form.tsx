'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { createPlannedOneOffSchema, type PlannedOneOff, type Account, type Category } from '@fin/core'
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

type FormValues = z.input<typeof createPlannedOneOffSchema>

const NONE = '__none__'

interface PlannedOneOffFormProps {
  budgetId: string
  oneOff?: PlannedOneOff
  accounts: Account[]
  categories: Category[]
  onSuccess: () => void
  onCancel: () => void
}

export function PlannedOneOffForm({
  budgetId,
  oneOff,
  accounts,
  categories,
  onSuccess,
  onCancel,
}: PlannedOneOffFormProps) {
  const isEditing = !!oneOff

  const form = useForm<FormValues>({
    resolver: zodResolver(createPlannedOneOffSchema),
    defaultValues: oneOff
      ? {
          accountId: oneOff.accountId,
          categoryId: oneOff.categoryId ?? undefined,
          description: oneOff.description,
          amount: oneOff.amount,
          expectedDate: oneOff.expectedDate,
          isReserved: oneOff.isReserved ?? undefined,
          reminderDaysBefore: oneOff.reminderDaysBefore ?? undefined,
        }
      : {
          accountId: accounts[0]?.id ?? '',
          description: '',
          amount: '',
          expectedDate: '',
        },
  })

  async function onSubmit(data: FormValues) {
    try {
      const payload = {
        ...data,
        categoryId: data.categoryId === NONE ? undefined : data.categoryId,
      }
      if (isEditing) {
        await apiClient.patch(`/api/budgets/${budgetId}/planned-one-offs/${oneOff.id}`, {
          categoryId: payload.categoryId ?? null,
          description: payload.description,
          amount: payload.amount,
          expectedDate: payload.expectedDate,
          isReserved: payload.isReserved,
          reminderDaysBefore: payload.reminderDaysBefore,
        })
        toast.success('One-off updated')
      } else {
        await apiClient.post(`/api/budgets/${budgetId}/planned-one-offs`, payload)
        toast.success('One-off added')
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
          <DialogTitle>{isEditing ? 'Edit One-Off' : 'Add One-Off Expense'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the planned one-off expense.'
              : 'Plan a one-time expense for this budget.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Car service, Annual insurance" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
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
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? NONE}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              : (isEditing ? 'Save Changes' : 'Add One-Off')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
