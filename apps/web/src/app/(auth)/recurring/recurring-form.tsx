'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import {
  createRecurringTransactionSchema,
  type RecurringTransaction,
  type Account,
  type Category,
} from '@fin/core'
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

type FormValues = z.input<typeof createRecurringTransactionSchema>

const NONE = '__none__'

const DAY_OF_WEEK_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

interface RecurringFormProps {
  recurring?: RecurringTransaction
  accounts: Account[]
  categories: Category[]
  onSuccess: () => void
  onCancel: () => void
}

export function RecurringForm({
  recurring,
  accounts,
  categories,
  onSuccess,
  onCancel,
}: RecurringFormProps) {
  const isEditing = !!recurring

  const form = useForm<FormValues>({
    resolver: zodResolver(createRecurringTransactionSchema),
    defaultValues: recurring
      ? {
          accountId: recurring.accountId,
          categoryId: recurring.categoryId ?? undefined,
          name: recurring.name,
          description: recurring.description ?? undefined,
          amountType: recurring.amountType as 'fixed' | 'variable',
          amount: recurring.amount ?? undefined,
          amountMax: recurring.amountMax ?? undefined,
          frequency: recurring.frequency as 'weekly' | 'monthly' | 'yearly',
          dayOfMonth: recurring.dayOfMonth ?? undefined,
          dayOfWeek: recurring.dayOfWeek ?? undefined,
          startDate: recurring.startDate,
          transactionType: recurring.transactionType as 'debit' | 'credit',
          merchantPattern: recurring.merchantPattern ?? undefined,
        }
      : {
          accountId: accounts[0]?.id ?? '',
          name: '',
          amountType: 'fixed',
          frequency: 'monthly',
          transactionType: 'debit',
          startDate: new Date().toISOString().split('T')[0] ?? '',
        },
  })

  const amountType = form.watch('amountType')
  const frequency = form.watch('frequency')

  async function onSubmit(data: FormValues) {
    try {
      const payload = {
        ...data,
        categoryId: data.categoryId === NONE ? undefined : data.categoryId,
      }
      if (isEditing) {
        await apiClient.patch<RecurringTransaction>(
          `/api/recurring-transactions/${recurring.id}`,
          {
            name: payload.name,
            categoryId: payload.categoryId ?? null,
            description: payload.description ?? null,
            amount: payload.amount,
            amountMax: payload.amountMax,
            dayOfMonth: payload.dayOfMonth,
            dayOfWeek: payload.dayOfWeek,
            merchantPattern: payload.merchantPattern ?? null,
          },
        )
        toast.success('Recurring transaction updated')
      } else {
        await apiClient.post<RecurringTransaction>('/api/recurring-transactions', payload)
        toast.success('Recurring transaction created')
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
          <DialogTitle>
            {isEditing ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the recurring transaction details.'
              : 'Set up a new recurring debit or credit.'}
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
                  <Input placeholder="e.g. Rent, Netflix, Salary" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isEditing && (
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
            </div>
          )}

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

          {!isEditing && (
            <FormField
              control={form.control}
              name="amountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed (same every time)</SelectItem>
                      <SelectItem value="variable">Variable (up to a max)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {amountType === 'fixed' && (
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {amountType === 'variable' && (
            <FormField
              control={form.control}
              name="amountMax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Amount</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {!isEditing && (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {frequency === 'monthly' && (
            <FormField
              control={form.control}
              name="dayOfMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day of Month</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v, 10))}
                    defaultValue={field.value !== undefined ? String(field.value) : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {frequency === 'weekly' && (
            <FormField
              control={form.control}
              name="dayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day of Week</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v, 10))}
                    defaultValue={field.value !== undefined ? String(field.value) : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DAY_OF_WEEK_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
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
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="merchantPattern"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Merchant Pattern</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Optional — for auto-matching imports"
                    {...field}
                    value={field.value ?? ''}
                  />
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
              : (isEditing ? 'Save Changes' : 'Add Recurring')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
