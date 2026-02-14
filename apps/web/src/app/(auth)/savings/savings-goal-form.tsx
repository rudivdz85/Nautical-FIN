'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { createSavingsGoalSchema, type SavingsGoal, type Account } from '@fin/core'

type FormValues = z.input<typeof createSavingsGoalSchema>

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

interface SavingsGoalFormProps {
  goal?: SavingsGoal
  accounts: Account[]
  onSuccess: () => void
  onCancel: () => void
}

const goalTypeOptions = [
  { value: 'emergency', label: 'Emergency Fund' },
  { value: 'specific', label: 'Specific Goal' },
  { value: 'general', label: 'General Savings' },
]

export function SavingsGoalForm({ goal, accounts, onSuccess, onCancel }: SavingsGoalFormProps) {
  const isEditing = !!goal

  const form = useForm<FormValues>({
    resolver: zodResolver(createSavingsGoalSchema),
    defaultValues: goal
      ? {
          name: goal.name,
          goalType: goal.goalType,
          targetAmount: goal.targetAmount ?? undefined,
          targetDate: goal.targetDate ?? undefined,
          targetMonthsOfExpenses: goal.targetMonthsOfExpenses ?? undefined,
          monthlyContribution: goal.monthlyContribution ?? undefined,
          priority: goal.priority ?? undefined,
          linkedAccountId: goal.linkedAccountId ?? undefined,
          notes: goal.notes ?? undefined,
        }
      : {
          name: '',
          goalType: 'specific',
        },
  })

  const goalType = form.watch('goalType')
  const showMonthsOfExpenses = goalType === 'emergency'

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        const { goalType: _type, ...updateData } = data
        await apiClient.patch<SavingsGoal>(`/api/savings-goals/${goal.id}`, updateData)
        toast.success('Savings goal updated')
      } else {
        await apiClient.post<SavingsGoal>('/api/savings-goals', data)
        toast.success('Savings goal created')
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
          <DialogTitle>{isEditing ? 'Edit Savings Goal' : 'Add Savings Goal'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your savings goal details.'
              : 'Create a new savings goal to track your progress.'}
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
                  <Input placeholder="e.g. Emergency Fund" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="goalType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Goal Type</FormLabel>
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
                    {goalTypeOptions.map((option) => (
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

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">
            Target
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="targetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Amount</FormLabel>
                  <FormControl>
                    <Input placeholder="50000.00" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {showMonthsOfExpenses && (
            <FormField
              control={form.control}
              name="targetMonthsOfExpenses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Months of Expenses</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      placeholder="6"
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

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">
            Plan
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="monthlyContribution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Contribution</FormLabel>
                  <FormControl>
                    <Input placeholder="2000.00" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority (1-100)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      placeholder="1"
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
              : (isEditing ? 'Save Changes' : 'Add Goal')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
