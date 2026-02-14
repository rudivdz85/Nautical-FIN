'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { createAccountSchema, type Account, ALWAYS_NON_SPENDING_TYPES, type AccountType } from '@fin/core'

type FormValues = z.input<typeof createAccountSchema>
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

interface AccountFormProps {
  account?: Account
  onSuccess: () => void
  onCancel: () => void
}

const accountTypeOptions = [
  { value: 'cheque', label: 'Cheque' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'investment', label: 'Investment' },
  { value: 'loan', label: 'Loan' },
  { value: 'other', label: 'Other' },
]

const classificationOptions = [
  { value: 'spending', label: 'Spending' },
  { value: 'non_spending', label: 'Non-spending' },
]

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const isEditing = !!account

  const form = useForm<FormValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: account
      ? {
          name: account.name,
          accountType: account.accountType,
          classification: account.classification,
          institution: account.institution ?? undefined,
          accountNumberMasked: account.accountNumberMasked ?? undefined,
          currency: account.currency,
          currentBalance: account.currentBalance,
          balanceAsOfDate: account.balanceAsOfDate ?? undefined,
          creditLimit: account.creditLimit ?? undefined,
        }
      : {
          name: '',
          accountType: 'cheque',
          currency: 'ZAR',
          currentBalance: '0',
        },
  })

  const accountType = form.watch('accountType') as AccountType
  const showCreditLimit = accountType === 'credit_card'
  const showClassification = !ALWAYS_NON_SPENDING_TYPES.has(accountType)

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        await apiClient.patch<Account>(`/api/accounts/${account.id}`, data)
        toast.success('Account updated')
      } else {
        await apiClient.post<Account>('/api/accounts', data)
        toast.success('Account created')
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
          <DialogTitle>{isEditing ? 'Edit Account' : 'Add Account'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update your account details.' : 'Add a new bank account or wallet.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Main Cheque Account" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountTypeOptions.map((option) => (
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

            {showClassification && (
              <FormField
                control={form.control}
                name="classification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classification</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Auto-detect" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classificationOptions.map((option) => (
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
            )}
          </div>

          <FormField
            control={form.control}
            name="institution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Institution</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. FNB, Capitec, Nedbank" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="currentBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Balance</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} value={field.value ?? '0'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input placeholder="ZAR" maxLength={3} {...field} value={field.value ?? 'ZAR'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {showCreditLimit && (
            <FormField
              control={form.control}
              name="creditLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Limit</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="accountNumberMasked"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number (last 4)</FormLabel>
                  <FormControl>
                    <Input placeholder="••••1234" maxLength={20} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="balanceAsOfDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Balance As Of</FormLabel>
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
              ? (isEditing ? 'Saving...' : 'Creating...')
              : (isEditing ? 'Save Changes' : 'Add Account')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
