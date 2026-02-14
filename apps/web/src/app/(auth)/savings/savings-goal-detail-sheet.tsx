'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SavingsGoalWithContributions, SavingsContribution, Account } from '@fin/core'
import { Plus, MoreHorizontal, Pencil, Trash2, CheckCircle2 } from 'lucide-react'
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
import { formatCurrency, formatDate, formatGoalType } from '@/lib/format'
import { SavingsContributionForm } from './savings-contribution-form'
import { SavingsContributionDeleteDialog } from './savings-contribution-delete-dialog'

type ContributionDialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; contribution: SavingsContribution }
  | { type: 'delete'; contribution: SavingsContribution }

interface SavingsGoalDetailSheetProps {
  goalId: string
  accounts: Account[]
  onClose: () => void
  onMutate: () => void
}

function calculateProgress(currentAmount: string | null, targetAmount: string | null): number {
  if (!currentAmount) return 0
  if (!targetAmount) return 0
  const current = parseFloat(currentAmount)
  const target = parseFloat(targetAmount)
  if (target <= 0) return 0
  return Math.min(Math.max(Math.round((current / target) * 100), 0), 100)
}

export function SavingsGoalDetailSheet({
  goalId,
  accounts,
  onClose,
  onMutate,
}: SavingsGoalDetailSheetProps) {
  const [goalDetail, setGoalDetail] = useState<SavingsGoalWithContributions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [contributionDialog, setContributionDialog] = useState<ContributionDialogState>({
    type: 'closed',
  })

  const fetchDetail = useCallback(async () => {
    try {
      const data = await apiClient.get<SavingsGoalWithContributions>(
        `/api/savings-goals/${goalId}`,
      )
      setGoalDetail(data)
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      }
      onClose()
    }
  }, [goalId, onClose])

  useEffect(() => {
    setIsLoading(true)
    fetchDetail().finally(() => setIsLoading(false))
  }, [fetchDetail])

  async function handleContributionSuccess() {
    setContributionDialog({ type: 'closed' })
    await fetchDetail()
    onMutate()
  }

  if (isLoading || !goalDetail) {
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

  const percentage = calculateProgress(goalDetail.currentAmount, goalDetail.targetAmount)
  const linkedAccount = goalDetail.linkedAccountId
    ? accounts.find((a) => a.id === goalDetail.linkedAccountId)
    : null

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          {goalDetail.name}
          {goalDetail.isCompleted && (
            <CheckCircle2 className="size-5 text-emerald-500" />
          )}
        </SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          <Badge variant="secondary">{formatGoalType(goalDetail.goalType)}</Badge>
          {goalDetail.isCompleted && <Badge variant="default">Completed</Badge>}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 space-y-6">
        <div className="space-y-4">
          {goalDetail.targetAmount && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{percentage}%</span>
              </div>
              <Progress value={percentage} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {goalDetail.targetAmount && (
              <div>
                <span className="text-muted-foreground">Target Amount</span>
                <p className="font-medium">{formatCurrency(goalDetail.targetAmount)}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Current Amount</span>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                {formatCurrency(goalDetail.currentAmount ?? '0')}
              </p>
            </div>
            {goalDetail.monthlyContribution && (
              <div>
                <span className="text-muted-foreground">Monthly Contribution</span>
                <p className="font-medium">{formatCurrency(goalDetail.monthlyContribution)}</p>
              </div>
            )}
            {goalDetail.priority && (
              <div>
                <span className="text-muted-foreground">Priority</span>
                <p className="font-medium">{goalDetail.priority}</p>
              </div>
            )}
            {goalDetail.targetDate && (
              <div>
                <span className="text-muted-foreground">Target Date</span>
                <p className="font-medium">{formatDate(goalDetail.targetDate)}</p>
              </div>
            )}
            {goalDetail.targetMonthsOfExpenses && (
              <div>
                <span className="text-muted-foreground">Target Months</span>
                <p className="font-medium">{goalDetail.targetMonthsOfExpenses} months</p>
              </div>
            )}
            {linkedAccount && (
              <div>
                <span className="text-muted-foreground">Linked Account</span>
                <p className="font-medium">{linkedAccount.name}</p>
              </div>
            )}
          </div>

          {goalDetail.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notes</span>
              <p className="mt-1">{goalDetail.notes}</p>
            </div>
          )}
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Contributions</h3>
            <Button
              size="sm"
              onClick={() => setContributionDialog({ type: 'create' })}
            >
              <Plus className="mr-2 size-4" />
              Add Contribution
            </Button>
          </div>

          {goalDetail.contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No contributions recorded yet.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goalDetail.contributions.map((contribution) => (
                    <TableRow key={contribution.id}>
                      <TableCell>{formatDate(contribution.contributionDate)}</TableCell>
                      <TableCell className="text-right font-numbers">
                        {formatCurrency(contribution.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contribution.source || '-'}
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
                              onClick={() =>
                                setContributionDialog({ type: 'edit', contribution })
                              }
                            >
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setContributionDialog({ type: 'delete', contribution })
                              }
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
        open={
          contributionDialog.type === 'create' || contributionDialog.type === 'edit'
        }
        onOpenChange={(open) => {
          if (!open) setContributionDialog({ type: 'closed' })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <SavingsContributionForm
            goalId={goalId}
            contribution={
              contributionDialog.type === 'edit'
                ? contributionDialog.contribution
                : undefined
            }
            onSuccess={handleContributionSuccess}
            onCancel={() => setContributionDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {contributionDialog.type === 'delete' && (
        <SavingsContributionDeleteDialog
          goalId={goalId}
          contribution={contributionDialog.contribution}
          onSuccess={handleContributionSuccess}
          onCancel={() => setContributionDialog({ type: 'closed' })}
        />
      )}
    </>
  )
}
