'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DebtWithPayments, DebtPayment, Account } from '@fin/core'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { apiClient, ApiError } from '@/lib/api-client'
import { formatCurrency, formatDate, formatDebtType } from '@/lib/format'
import { DebtPaymentForm } from './debt-payment-form'
import { DebtPaymentDeleteDialog } from './debt-payment-delete-dialog'

type PaymentDialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; payment: DebtPayment }
  | { type: 'delete'; payment: DebtPayment }

interface DebtDetailSheetProps {
  debtId: string
  accounts: Account[]
  onClose: () => void
  onMutate: () => void
}

function calculatePayoffPercentage(originalAmount: string, currentBalance: string): number {
  const original = parseFloat(originalAmount)
  const current = parseFloat(currentBalance)
  if (original <= 0) return 100
  const paid = original - current
  return Math.min(Math.max(Math.round((paid / original) * 100), 0), 100)
}

export function DebtDetailSheet({ debtId, accounts, onClose, onMutate }: DebtDetailSheetProps) {
  const [debtDetail, setDebtDetail] = useState<DebtWithPayments | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [paymentDialog, setPaymentDialog] = useState<PaymentDialogState>({ type: 'closed' })

  const fetchDetail = useCallback(async () => {
    try {
      const data = await apiClient.get<DebtWithPayments>(`/api/debts/${debtId}`)
      setDebtDetail(data)
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      }
      onClose()
    }
  }, [debtId, onClose])

  useEffect(() => {
    setIsLoading(true)
    fetchDetail().finally(() => setIsLoading(false))
  }, [fetchDetail])

  async function handlePaymentSuccess() {
    setPaymentDialog({ type: 'closed' })
    await fetchDetail()
    onMutate()
  }

  if (isLoading || !debtDetail) {
    return (
      <>
        <SheetHeader>
          <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        </SheetHeader>
        <div className="flex-1 space-y-4 p-4">
          <div className="h-2 w-full rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                <div className="h-5 w-24 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  const percentage = calculatePayoffPercentage(debtDetail.originalAmount, debtDetail.currentBalance)
  const linkedAccount = debtDetail.linkedAccountId
    ? accounts.find((a) => a.id === debtDetail.linkedAccountId)
    : null
  const monthlyPayment = debtDetail.minimumPayment ?? debtDetail.fixedPayment

  return (
    <>
      <SheetHeader>
        <SheetTitle>{debtDetail.name}</SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          <Badge variant="secondary">{formatDebtType(debtDetail.debtType)}</Badge>
          {debtDetail.creditor && <span>· {debtDetail.creditor}</span>}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 space-y-6">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{percentage}% paid</span>
            </div>
            <Progress value={percentage} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Original Amount</span>
              <p className="font-medium">{formatCurrency(debtDetail.originalAmount)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Current Balance</span>
              <p className="font-medium text-destructive">
                {formatCurrency(debtDetail.currentBalance)}
              </p>
            </div>
            {debtDetail.interestRate && (
              <div>
                <span className="text-muted-foreground">Interest Rate</span>
                <p className="font-medium">
                  {debtDetail.interestRate}%
                  {debtDetail.interestType && ` (${debtDetail.interestType})`}
                </p>
              </div>
            )}
            {monthlyPayment && (
              <div>
                <span className="text-muted-foreground">Monthly Payment</span>
                <p className="font-medium">{formatCurrency(monthlyPayment)}</p>
              </div>
            )}
            {debtDetail.paymentDay && (
              <div>
                <span className="text-muted-foreground">Payment Day</span>
                <p className="font-medium">{debtDetail.paymentDay}th of each month</p>
              </div>
            )}
            {debtDetail.expectedPayoffDate && (
              <div>
                <span className="text-muted-foreground">Expected Payoff</span>
                <p className="font-medium">{formatDate(debtDetail.expectedPayoffDate)}</p>
              </div>
            )}
            {linkedAccount && (
              <div>
                <span className="text-muted-foreground">Linked Account</span>
                <p className="font-medium">{linkedAccount.name}</p>
              </div>
            )}
            {debtDetail.startDate && (
              <div>
                <span className="text-muted-foreground">Start Date</span>
                <p className="font-medium">{formatDate(debtDetail.startDate)}</p>
              </div>
            )}
          </div>

          {debtDetail.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notes</span>
              <p className="mt-1">{debtDetail.notes}</p>
            </div>
          )}
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Payment History</h3>
            <Button
              size="sm"
              onClick={() => setPaymentDialog({ type: 'create' })}
            >
              <Plus className="mr-2 size-4" />
              Add Payment
            </Button>
          </div>

          {debtDetail.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No payments recorded yet.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtDetail.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell className="text-right font-numbers">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-right font-numbers text-muted-foreground">
                        {payment.balanceAfter ? formatCurrency(payment.balanceAfter) : '-'}
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
                              onClick={() => setPaymentDialog({ type: 'edit', payment })}
                            >
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setPaymentDialog({ type: 'delete', payment })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={paymentDialog.type === 'create' || paymentDialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) setPaymentDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-md">
          <DebtPaymentForm
            debtId={debtId}
            payment={paymentDialog.type === 'edit' ? paymentDialog.payment : undefined}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setPaymentDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {paymentDialog.type === 'delete' && (
        <DebtPaymentDeleteDialog
          debtId={debtId}
          payment={paymentDialog.payment}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setPaymentDialog({ type: 'closed' })}
        />
      )}
    </>
  )
}
