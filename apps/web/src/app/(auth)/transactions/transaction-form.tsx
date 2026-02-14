'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { createTransactionSchema, type Transaction, type Account, type Category } from '@fin/core'
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

type FormValues = z.input<typeof createTransactionSchema>

const NONE = '__none__'

interface TransactionFormProps {
  transaction?: Transaction
  accounts: Account[]
  categories: Category[]
  onSuccess: () => void
  onCancel: () => void
}

export function TransactionForm({
  transaction,
  accounts,
  categories,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const isEditing = !!transaction

  const form = useForm<FormValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: transaction
      ? {
          accountId: transaction.accountId,
          categoryId: transaction.categoryId ?? undefined,
          amount: transaction.amount,
          currency: transaction.currency,
          transactionDate: transaction.transactionDate,
          postedDate: transaction.postedDate ?? undefined,
          description: transaction.description,
          merchantOriginal: transaction.merchantOriginal ?? undefined,
          notes: transaction.notes ?? undefined,
          transactionType: transaction.transactionType as 'debit' | 'credit' | 'transfer',
          isReviewed: transaction.isReviewed ?? undefined,
        }
      : {
          accountId: accounts[0]?.id ?? '',
          transactionType: 'debit',
          amount: '',
          currency: 'ZAR',
          transactionDate: new Date().toISOString().split('T')[0] ?? '',
          description: '',
        },
  })

  async function onSubmit(data: FormValues) {
    try {
      const payload = {
        ...data,
        categoryId: data.categoryId === NONE ? undefined : data.categoryId,
      }
      if (isEditing) {
        await apiClient.patch<Transaction>(`/api/transactions/${transaction.id}`, {
          categoryId: payload.categoryId ?? null,
          amount: payload.amount,
          transactionDate: payload.transactionDate,
          postedDate: payload.postedDate ?? null,
          description: payload.description,
          merchantOriginal: payload.merchantOriginal ?? null,
          notes: payload.notes ?? null,
          isReviewed: payload.isReviewed,
        })
        toast.success('Transaction updated')
      } else {
        await apiClient.post<Transaction>('/api/transactions', payload)
        toast.success('Transaction created')
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
          <DialogTitle>{isEditing ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the transaction details.' : 'Record a new transaction.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!isEditing && (
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
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="transactionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="debit">Debit (expense)</SelectItem>
                      <SelectItem value="credit">Credit (income)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="transactionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value ?? NONE}>
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

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Grocery shopping" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="merchantOriginal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Merchant</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="postedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Posted Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
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
              ? (isEditing ? 'Saving...' : 'Creating...')
              : (isEditing ? 'Save Changes' : 'Add Transaction')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
