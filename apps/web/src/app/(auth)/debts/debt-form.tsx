'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { createDebtSchema, type Debt, type Account } from '@fin/core'

type FormValues = z.input<typeof createDebtSchema>

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

interface DebtFormProps {
  debt?: Debt
  accounts: Account[]
  onSuccess: () => void
  onCancel: () => void
}

const debtTypeOptions = [
  { value: 'home_loan', label: 'Home Loan' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'overdraft', label: 'Overdraft' },
  { value: 'store_account', label: 'Store Account' },
  { value: 'student_loan', label: 'Student Loan' },
  { value: 'other', label: 'Other' },
]

const interestTypeOptions = [
  { value: 'compound', label: 'Compound' },
  { value: 'simple', label: 'Simple' },
]

export function DebtForm({ debt, accounts, onSuccess, onCancel }: DebtFormProps) {
  const isEditing = !!debt

  const form = useForm<FormValues>({
    resolver: zodResolver(createDebtSchema),
    defaultValues: debt
      ? {
          name: debt.name,
          debtType: debt.debtType,
          creditor: debt.creditor ?? undefined,
          originalAmount: debt.originalAmount,
          currentBalance: debt.currentBalance,
          interestRate: debt.interestRate ?? undefined,
          interestType: (debt.interestType as 'compound' | 'simple') ?? undefined,
          minimumPayment: debt.minimumPayment ?? undefined,
          fixedPayment: debt.fixedPayment ?? undefined,
          paymentDay: debt.paymentDay ?? undefined,
          startDate: debt.startDate ?? undefined,
          expectedPayoffDate: debt.expectedPayoffDate ?? undefined,
          linkedAccountId: debt.linkedAccountId ?? undefined,
          notes: debt.notes ?? undefined,
        }
      : {
          name: '',
          debtType: 'personal_loan',
          originalAmount: '',
          currentBalance: '',
        },
  })

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        const { originalAmount: _orig, debtType: _type, ...updateData } = data
        await apiClient.patch<Debt>(`/api/debts/${debt.id}`, updateData)
        toast.success('Debt updated')
      } else {
        await apiClient.post<Debt>('/api/debts', data)
        toast.success('Debt created')
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
          <DialogTitle>{isEditing ? 'Edit Debt' : 'Add Debt'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update your debt details.' : 'Add a new debt to track repayment progress.'}
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
                  <Input placeholder="e.g. Home Loan - FNB" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="debtType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Debt Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {debtTypeOptions.map((option) => (
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

            <FormField
              control={form.control}
              name="creditor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Creditor</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. FNB" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">
            Amounts
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="originalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Original Amount</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="250000.00"
                      {...field}
                      disabled={isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currentBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Balance</FormLabel>
                  <FormControl>
                    <Input placeholder="230000.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">
            Interest
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="interestRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interest Rate (%)</FormLabel>
                  <FormControl>
                    <Input placeholder="11.50" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interestType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interest Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {interestTypeOptions.map((option) => (
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

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">
            Payment Details
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="minimumPayment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Payment</FormLabel>
                  <FormControl>
                    <Input placeholder="3500.00" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fixedPayment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fixed Payment</FormLabel>
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
            name="paymentDay"
            render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>Payment Day (1-31)</FormLabel>
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

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">
            Dates & Linking
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expectedPayoffDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Payoff</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {accounts.length > 0 && (
            <FormField
              control={form.control}
              name="linkedAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked Account</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === 'none' ? undefined : val)}
                    defaultValue={field.value ?? 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
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
          )}

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
              : (isEditing ? 'Save Changes' : 'Add Debt')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
