'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { createIncomeSchema, type Income, type Account } from '@fin/core'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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

type FormValues = z.input<typeof createIncomeSchema>

interface IncomeFormProps {
  income?: Income
  accounts: Account[]
  onSuccess: () => void
  onCancel: () => void
}

const frequencyOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export function IncomeForm({ income, accounts, onSuccess, onCancel }: IncomeFormProps) {
  const isEditing = !!income

  const form = useForm<FormValues>({
    resolver: zodResolver(createIncomeSchema),
    defaultValues: income
      ? {
          accountId: income.accountId,
          name: income.name,
          amount: income.amount,
          frequency: income.frequency,
          expectedDay: income.expectedDay ?? undefined,
          isPrimarySalary: income.isPrimarySalary ?? false,
          confirmationRequiredMonthly: income.confirmationRequiredMonthly ?? false,
          notes: income.notes ?? undefined,
        }
      : {
          accountId: accounts[0]?.id ?? '',
          name: '',
          amount: '',
          frequency: 'monthly' as const,
          expectedDay: 25,
          isPrimarySalary: false,
          confirmationRequiredMonthly: false,
          notes: '',
        },
  })

  const frequency = form.watch('frequency')

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        const { accountId: _acct, frequency: _freq, ...updateData } = data
        await apiClient.patch<Income>(`/api/incomes/${income.id}`, updateData)
        toast.success('Income updated')
      } else {
        await apiClient.post<Income>('/api/incomes', data)
        toast.success('Income created')
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
              ? 'Update your income source details.'
              : 'Add a new income source to track expected payments.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Main Salary" {...field} />
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
                    <Input placeholder="25000.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {frequencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {frequency === 'monthly' && (
              <FormField
                control={form.control}
                name="expectedDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Day (1-31)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        placeholder="25"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? undefined : Number(val))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <FormField
            control={form.control}
            name="isPrimarySalary"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Primary Salary</FormLabel>
                  <FormDescription>
                    Mark as your main salary source
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmationRequiredMonthly"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Require Monthly Confirmation</FormLabel>
                  <FormDescription>
                    Prompt to confirm receipt each month
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
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
                  <Input placeholder="Optional notes" {...field} value={field.value ?? ''} />
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
              : (isEditing ? 'Save Changes' : 'Add Income')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
