'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { createSavingsContributionSchema, type SavingsContribution } from '@fin/core'

type FormValues = z.input<typeof createSavingsContributionSchema>

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

interface SavingsContributionFormProps {
  goalId: string
  contribution?: SavingsContribution
  onSuccess: () => void
  onCancel: () => void
}

export function SavingsContributionForm({
  goalId,
  contribution,
  onSuccess,
  onCancel,
}: SavingsContributionFormProps) {
  const isEditing = !!contribution

  const form = useForm<FormValues>({
    resolver: zodResolver(createSavingsContributionSchema),
    defaultValues: contribution
      ? {
          amount: contribution.amount,
          contributionDate: contribution.contributionDate,
          source: contribution.source ?? undefined,
        }
      : {
          amount: '',
          contributionDate: new Date().toISOString().split('T')[0],
        },
  })

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        await apiClient.patch<SavingsContribution>(
          `/api/savings-goals/${goalId}/contributions/${contribution.id}`,
          data,
        )
        toast.success('Contribution updated')
      } else {
        await apiClient.post<SavingsContribution>(
          `/api/savings-goals/${goalId}/contributions`,
          data,
        )
        toast.success('Contribution recorded')
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
          <DialogTitle>{isEditing ? 'Edit Contribution' : 'Record Contribution'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the contribution details.'
              : 'Record a new contribution towards this goal.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input placeholder="2000.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contributionDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Salary, Bonus" {...field} value={field.value ?? ''} />
                </FormControl>
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
              ? (isEditing ? 'Saving...' : 'Recording...')
              : (isEditing ? 'Save Changes' : 'Record Contribution')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
