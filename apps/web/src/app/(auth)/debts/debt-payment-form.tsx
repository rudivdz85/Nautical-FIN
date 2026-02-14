'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { createDebtPaymentSchema, type DebtPayment } from '@fin/core'

type FormValues = z.input<typeof createDebtPaymentSchema>

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

interface DebtPaymentFormProps {
  debtId: string
  payment?: DebtPayment
  onSuccess: () => void
  onCancel: () => void
}

export function DebtPaymentForm({ debtId, payment, onSuccess, onCancel }: DebtPaymentFormProps) {
  const isEditing = !!payment

  const form = useForm<FormValues>({
    resolver: zodResolver(createDebtPaymentSchema),
    defaultValues: payment
      ? {
          amount: payment.amount,
          principalAmount: payment.principalAmount ?? undefined,
          interestAmount: payment.interestAmount ?? undefined,
          paymentDate: payment.paymentDate,
        }
      : {
          amount: '',
          paymentDate: new Date().toISOString().split('T')[0],
        },
  })

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        await apiClient.patch<DebtPayment>(
          `/api/debts/${debtId}/payments/${payment.id}`,
          data,
        )
        toast.success('Payment updated')
      } else {
        await apiClient.post<DebtPayment>(
          `/api/debts/${debtId}/payments`,
          data,
        )
        toast.success('Payment recorded')
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
          <DialogTitle>{isEditing ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the payment details.'
              : 'Record a new payment towards this debt.'}
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
                  <Input placeholder="3500.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="principalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Principal</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interestAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interest</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="paymentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
              : (isEditing ? 'Save Changes' : 'Record Payment')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
