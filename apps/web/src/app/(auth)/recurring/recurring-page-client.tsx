'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RecurringTransaction, Account, Category } from '@fin/core'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Repeat,
  Play,
  SkipForward,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { apiClient, ApiError } from '@/lib/api-client'
import {
  formatCurrency,
  formatDate,
  formatFrequency,
  formatTransactionType,
} from '@/lib/format'
import { RecurringForm } from './recurring-form'
import { RecurringDeactivateDialog } from './recurring-deactivate-dialog'
import { RecurringGenerateDialog } from './recurring-generate-dialog'

type DialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; recurring: RecurringTransaction }
  | { type: 'deactivate'; recurring: RecurringTransaction }
  | { type: 'generate'; recurring: RecurringTransaction }

interface RecurringPageClientProps {
  initialRecurring: RecurringTransaction[]
  accounts: Account[]
  categories: Category[]
}

export function RecurringPageClient({
  initialRecurring,
  accounts,
  categories,
}: RecurringPageClientProps) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogState>({ type: 'closed' })
  const [showInactive, setShowInactive] = useState(false)

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]))

  function handleSuccess() {
    setDialog({ type: 'closed' })
    router.refresh()
  }

  async function handleSkip(recurring: RecurringTransaction) {
    try {
      await apiClient.post(`/api/recurring-transactions/${recurring.id}/skip`, {})
      toast.success('Occurrence skipped')
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to skip occurrence')
      }
    }
  }

  const displayed = showInactive
    ? initialRecurring
    : initialRecurring.filter((r) => r.isActive)

  const activeCount = initialRecurring.filter((r) => r.isActive).length
  const totalMonthlyDebits = initialRecurring
    .filter((r) => r.isActive && r.transactionType === 'debit' && r.amount)
    .reduce((sum, r) => {
      const amount = parseFloat(r.amount ?? '0')
      if (r.frequency === 'monthly') return sum + amount
      if (r.frequency === 'weekly') return sum + amount * 4.33
      if (r.frequency === 'yearly') return sum + amount / 12
      return sum
    }, 0)

  const today = new Date().toISOString().split('T')[0] ?? ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recurring Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Manage your recurring debits and credits.
          </p>
        </div>
        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus className="mr-2 size-4" />
          Add Recurring
        </Button>
      </div>

      {initialRecurring.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Repeat className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No recurring transactions yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Set up recurring debits and credits to automate your financial tracking.
          </p>
          <Button className="mt-6" onClick={() => setDialog({ type: 'create' })}>
            <Plus className="mr-2 size-4" />
            Add Your First Recurring Transaction
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Active Recurring</p>
                <p className="text-2xl font-semibold font-numbers">{activeCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Est. Monthly Debits</p>
                <p className="text-2xl font-semibold font-numbers text-destructive">
                  {formatCurrency(totalMonthlyDebits)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded"
              />
              Show inactive
            </label>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayed.map((r) => {
                  const isPastDue = r.nextOccurrence && r.nextOccurrence <= today
                  return (
                    <TableRow
                      key={r.id}
                      className={!r.isActive ? 'opacity-50' : ''}
                    >
                      <TableCell>
                        <div>
                          <span className="font-medium">{r.name}</span>
                          {r.description && (
                            <p className="text-xs text-muted-foreground">{r.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.transactionType === 'credit' ? 'default' : 'destructive'}
                          className={r.transactionType === 'credit' ? 'bg-emerald-600 text-white' : ''}
                        >
                          {formatTransactionType(r.transactionType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatFrequency(r.frequency)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-numbers">
                        {r.amountType === 'fixed'
                          ? formatCurrency(r.amount ?? '0')
                          : `Up to ${formatCurrency(r.amountMax ?? '0')}`}
                      </TableCell>
                      <TableCell>
                        {r.nextOccurrence ? (
                          <span className={isPastDue ? 'text-destructive font-medium' : ''}>
                            {formatDate(r.nextOccurrence)}
                            {isPastDue && ' (due)'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {accountMap.get(r.accountId) ?? '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setDialog({ type: 'edit', recurring: r })}
                            >
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            {r.isActive && r.nextOccurrence && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    setDialog({ type: 'generate', recurring: r })
                                  }
                                >
                                  <Play className="mr-2 size-4" />
                                  Generate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSkip(r)}>
                                  <SkipForward className="mr-2 size-4" />
                                  Skip
                                </DropdownMenuItem>
                              </>
                            )}
                            {r.isActive && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    setDialog({ type: 'deactivate', recurring: r })
                                  }
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Deactivate
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog
        open={dialog.type === 'create' || dialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) setDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-lg">
          <RecurringForm
            recurring={dialog.type === 'edit' ? dialog.recurring : undefined}
            accounts={accounts}
            categories={categories}
            onSuccess={handleSuccess}
            onCancel={() => setDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {dialog.type === 'deactivate' && (
        <RecurringDeactivateDialog
          recurring={dialog.recurring}
          onSuccess={handleSuccess}
          onCancel={() => setDialog({ type: 'closed' })}
        />
      )}

      <Dialog
        open={dialog.type === 'generate'}
        onOpenChange={(open) => { if (!open) setDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-md">
          {dialog.type === 'generate' && (
            <RecurringGenerateDialog
              recurring={dialog.recurring}
              onSuccess={handleSuccess}
              onCancel={() => setDialog({ type: 'closed' })}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
