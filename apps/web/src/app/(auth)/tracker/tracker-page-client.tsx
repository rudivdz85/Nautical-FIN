'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DailyTrackerEntry } from '@fin/core'
import { ChevronLeft, ChevronRight, CalendarCheck, RefreshCw } from 'lucide-react'
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
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { apiClient, ApiError } from '@/lib/api-client'
import {
  formatCurrency,
  getWeekRange,
  formatWeekday,
  formatShortDate,
} from '@/lib/format'
import { TrackerDayDetail } from './tracker-day-detail'

type DialogState =
  | { type: 'closed' }
  | { type: 'detail'; entry: DailyTrackerEntry }

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0] ?? ''
}

function generateWeekDays(start: string): string[] {
  const days: string[] = []
  const d = new Date(start + 'T12:00:00')
  for (let i = 0; i < 7; i++) {
    days.push(toDateString(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

export function TrackerPageClient() {
  const [weekStart, setWeekStart] = useState(() => {
    const { start } = getWeekRange(new Date())
    return start
  })
  const [entries, setEntries] = useState<DailyTrackerEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [dialog, setDialog] = useState<DialogState>({ type: 'closed' })

  const weekEnd = (() => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + 6)
    return toDateString(d)
  })()

  const fetchEntries = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiClient.get<DailyTrackerEntry[]>(
        `/api/daily-tracker?startDate=${weekStart}&endDate=${weekEnd}`,
      )
      setEntries(data)
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      }
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }, [weekStart, weekEnd])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  function navigateWeek(direction: -1 | 1) {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + direction * 7)
    setWeekStart(toDateString(d))
  }

  function goToToday() {
    const { start } = getWeekRange(new Date())
    setWeekStart(start)
  }

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      await apiClient.post('/api/daily-tracker/generate', {
        startDate: weekStart,
        endDate: weekEnd,
      })
      toast.success('Tracker entries generated')
      await fetchEntries()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to generate tracker data')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  function handleUpdate() {
    setDialog({ type: 'closed' })
    fetchEntries()
  }

  const today = toDateString(new Date())
  const weekDays = generateWeekDays(weekStart)
  const entryMap = new Map(entries.map((e) => [e.date, e]))

  const totalIncome = entries.reduce((s, e) => s + parseFloat(e.expectedIncome ?? '0'), 0)
  const totalExpenses = entries.reduce((s, e) => s + parseFloat(e.expectedExpenses ?? '0'), 0)
  const totalDebt = entries.reduce((s, e) => s + parseFloat(e.expectedDebtPayments ?? '0'), 0)
  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null
  const weekEndBalance = lastEntry ? parseFloat(lastEntry.runningBalance ?? '0') : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Daily Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Track your daily finances at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            <RefreshCw className={`mr-2 size-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="size-4" />
            <span className="sr-only">Previous week</span>
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="size-4" />
            <span className="sr-only">Next week</span>
          </Button>
        </div>
      </div>

      <p className="text-sm font-medium text-muted-foreground">
        {formatShortDate(weekStart)} – {formatShortDate(weekEnd)}
      </p>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Income</p>
            <p className="text-xl font-semibold font-numbers text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Expenses</p>
            <p className="text-xl font-semibold font-numbers text-destructive">
              {formatCurrency(totalExpenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Debt Payments</p>
            <p className="text-xl font-semibold font-numbers">
              {formatCurrency(totalDebt)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Week-End Balance</p>
            <p className="text-xl font-semibold font-numbers">
              {formatCurrency(weekEndBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="rounded-md border">
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <CalendarCheck className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No tracker data for this week</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Tracker entries are generated from your budget and recurring transactions.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Debt</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekDays.map((day) => {
                const entry = entryMap.get(day)
                const isToday = day === today

                if (!entry) {
                  return (
                    <TableRow key={day} className={isToday ? 'bg-primary/5' : ''}>
                      <TableCell className="font-medium">
                        <span className={isToday ? 'font-bold' : ''}>
                          {formatWeekday(day)} {formatShortDate(day)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                    </TableRow>
                  )
                }

                const income = parseFloat(entry.expectedIncome ?? '0')
                const expenses = parseFloat(entry.expectedExpenses ?? '0')
                const debt = parseFloat(entry.expectedDebtPayments ?? '0')
                const net = income - expenses - debt

                return (
                  <TableRow
                    key={day}
                    className={`cursor-pointer hover:bg-muted/50 ${isToday ? 'bg-primary/5' : ''}`}
                    onClick={() => setDialog({ type: 'detail', entry })}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className={isToday ? 'font-bold' : ''}>
                          {formatWeekday(day)} {formatShortDate(day)}
                        </span>
                        {entry.isPayday && (
                          <Badge variant="default" className="bg-emerald-600 text-xs">
                            Payday
                          </Badge>
                        )}
                        {entry.hasAlerts && (
                          <Badge variant="destructive" className="text-xs">
                            Alert
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-numbers text-emerald-600 dark:text-emerald-400">
                      {income > 0 ? formatCurrency(income) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-numbers text-destructive">
                      {expenses > 0 ? formatCurrency(expenses) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-numbers">
                      {debt > 0 ? formatCurrency(debt) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-numbers ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                      {formatCurrency(net)}
                    </TableCell>
                    <TableCell className="text-right font-numbers">
                      {formatCurrency(entry.runningBalance ?? '0')}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={dialog.type === 'detail'}
        onOpenChange={(open) => { if (!open) setDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-lg">
          {dialog.type === 'detail' && (
            <TrackerDayDetail
              entry={dialog.entry}
              onUpdate={handleUpdate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
