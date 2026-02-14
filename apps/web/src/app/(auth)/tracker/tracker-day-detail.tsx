'use client'

import { useState } from 'react'
import type { DailyTrackerEntry } from '@fin/core'
import { Banknote, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { apiClient, ApiError } from '@/lib/api-client'
import { formatCurrency, formatShortDate, formatWeekday } from '@/lib/format'

interface TrackerDayDetailProps {
  entry: DailyTrackerEntry
  onUpdate: () => void
}

function AlertsDisplay({ alerts }: { alerts: unknown }) {
  if (typeof alerts === 'object' && alerts !== null && !Array.isArray(alerts)) {
    return Object.entries(alerts as Record<string, unknown>).map(([key, val]) => (
      <p key={key} className="text-amber-800 dark:text-amber-200">
        {String(val)}
      </p>
    ))
  }
  return <p className="text-amber-800 dark:text-amber-200">{JSON.stringify(alerts)}</p>
}

export function TrackerDayDetail({ entry, onUpdate }: TrackerDayDetailProps) {
  const [overrideValue, setOverrideValue] = useState(entry.manualOverride ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const income = parseFloat(entry.expectedIncome ?? '0')
  const expenses = parseFloat(entry.expectedExpenses ?? '0')
  const debtPayments = parseFloat(entry.expectedDebtPayments ?? '0')
  const net = income - expenses - debtPayments

  async function handleSaveOverride() {
    setIsSaving(true)
    try {
      const value = overrideValue.trim()
      await apiClient.patch<DailyTrackerEntry>(`/api/daily-tracker/${entry.id}`, {
        manualOverride: value === '' ? null : value,
      })
      toast.success('Override saved')
      onUpdate()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to save override')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {formatWeekday(entry.date)}, {formatShortDate(entry.date)}
          {entry.isPayday && (
            <Badge variant="default" className="bg-emerald-600">
              <Banknote className="mr-1 size-3" />
              Payday
            </Badge>
          )}
        </DialogTitle>
        <DialogDescription>Daily financial summary</DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Expected Income</span>
            <p className="text-lg font-semibold font-numbers text-emerald-600 dark:text-emerald-400">
              {formatCurrency(income)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Expected Expenses</span>
            <p className="text-lg font-semibold font-numbers text-destructive">
              {formatCurrency(expenses)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Debt Payments</span>
            <p className="text-lg font-semibold font-numbers">
              {formatCurrency(debtPayments)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Net</span>
            <p className={`text-lg font-semibold font-numbers ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
              {formatCurrency(net)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Predicted Spend</span>
            <p className="text-lg font-semibold font-numbers">
              {formatCurrency(entry.predictedSpend ?? '0')}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Running Balance</span>
            <p className="text-lg font-semibold font-numbers">
              {formatCurrency(entry.runningBalance ?? '0')}
            </p>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-medium mb-2">Manual Override</p>
          <div className="flex gap-2">
            <Input
              placeholder="Override predicted spend"
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
            />
            <Button
              size="sm"
              onClick={handleSaveOverride}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {entry.manualOverride
              ? `Current override: ${formatCurrency(entry.manualOverride)}`
              : 'No override set — using predicted spend'}
          </p>
        </div>

        {entry.hasAlerts && entry.alerts != null && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <AlertTriangle className="size-4 text-amber-500" />
                Alerts
              </p>
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
                <AlertsDisplay alerts={entry.alerts} />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
