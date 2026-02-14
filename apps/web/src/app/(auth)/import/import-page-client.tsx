'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Papa from 'papaparse'
import type { Account, StatementImport } from '@fin/core'
import type { ParsedTransaction, ImportResult } from '@fin/core'
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { apiClient, ApiError } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/format'

interface ImportPageClientProps {
  accounts: Account[]
}

type Step = 'upload' | 'map' | 'review' | 'result'

const NONE = '__none__'

export function ImportPageClient({ accounts }: ImportPageClientProps) {
  const [step, setStep] = useState<Step>('upload')
  const [accountId, setAccountId] = useState('')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [filename, setFilename] = useState('')

  // Column mapping
  const [dateCol, setDateCol] = useState(NONE)
  const [descCol, setDescCol] = useState(NONE)
  const [amountCol, setAmountCol] = useState(NONE)
  const [typeCol, setTypeCol] = useState(NONE)
  const [negativeIsDebit, setNegativeIsDebit] = useState(true)

  // Parsed transactions for review
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])

  // Result
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Import history
  const [history, setHistory] = useState<StatementImport[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchHistory = useCallback(async () => {
    if (!accountId) return
    try {
      const imports = await apiClient.get<StatementImport[]>(
        `/api/statement-imports?accountId=${accountId}`,
      )
      setHistory(imports)
    } catch {
      // silently fail
    }
  }, [accountId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFilename(file.name)

    Papa.parse(file, {
      complete(results) {
        const data = results.data as string[][]
        if (data.length < 2) {
          toast.error('CSV must have at least a header row and one data row')
          return
        }

        const headers = data[0] ?? []
        const rows = data.slice(1).filter((row) => row.some((cell) => cell.trim()))

        setCsvHeaders(headers)
        setCsvRows(rows)

        // Auto-detect common column names
        const lowerHeaders = headers.map((h) => h.toLowerCase().trim())
        const dateIdx = lowerHeaders.findIndex((h) =>
          ['date', 'transaction date', 'trans date', 'posting date', 'value date'].includes(h),
        )
        const descIdx = lowerHeaders.findIndex((h) =>
          ['description', 'desc', 'narrative', 'reference', 'details', 'transaction description'].includes(h),
        )
        const amountIdx = lowerHeaders.findIndex((h) =>
          ['amount', 'value', 'transaction amount', 'debit/credit'].includes(h),
        )
        const typeIdx = lowerHeaders.findIndex((h) =>
          ['type', 'transaction type', 'dr/cr', 'debit/credit'].includes(h),
        )

        if (dateIdx >= 0) setDateCol(String(dateIdx))
        if (descIdx >= 0) setDescCol(String(descIdx))
        if (amountIdx >= 0) setAmountCol(String(amountIdx))
        if (typeIdx >= 0) setTypeCol(String(typeIdx))

        setStep('map')
      },
      error() {
        toast.error('Failed to parse CSV file')
      },
    })
  }

  function handleMapAndPreview() {
    if (dateCol === NONE || descCol === NONE || amountCol === NONE) {
      toast.error('Please map Date, Description, and Amount columns')
      return
    }

    const dateI = parseInt(dateCol, 10)
    const descI = parseInt(descCol, 10)
    const amountI = parseInt(amountCol, 10)
    const typeI = typeCol !== NONE ? parseInt(typeCol, 10) : -1

    const parsed: ParsedTransaction[] = []
    for (const row of csvRows) {
      const rawDate = row[dateI]?.trim() ?? ''
      const rawDesc = row[descI]?.trim() ?? ''
      const rawAmount = row[amountI]?.trim().replace(/[^0-9.-]/g, '') ?? ''
      const rawType = typeI >= 0 ? row[typeI]?.trim().toLowerCase() ?? '' : ''

      if (!rawDate || !rawDesc || !rawAmount) continue

      const numAmount = parseFloat(rawAmount)
      if (isNaN(numAmount) || numAmount === 0) continue

      let transactionType: 'debit' | 'credit'
      if (typeI >= 0 && rawType) {
        transactionType = ['credit', 'cr', 'c'].includes(rawType) ? 'credit' : 'debit'
      } else {
        transactionType = negativeIsDebit
          ? numAmount < 0 ? 'debit' : 'credit'
          : numAmount > 0 ? 'debit' : 'credit'
      }

      // Normalize date to YYYY-MM-DD
      const normalizedDate = normalizeDate(rawDate)
      if (!normalizedDate) continue

      parsed.push({
        transactionDate: normalizedDate,
        amount: Math.abs(numAmount).toFixed(2),
        description: rawDesc.slice(0, 500),
        transactionType,
        merchantOriginal: rawDesc.slice(0, 200),
      })
    }

    if (parsed.length === 0) {
      toast.error('No valid transactions found. Check your column mapping.')
      return
    }

    setTransactions(parsed)
    setStep('review')
  }

  function removeTransaction(index: number) {
    setTransactions((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleImport() {
    if (transactions.length === 0) return
    setIsProcessing(true)

    try {
      // Step 1: Create import record
      const importRecord = await apiClient.post<StatementImport>('/api/statement-imports', {
        accountId,
        filename,
        fileType: 'csv',
      })

      // Step 2: Process transactions
      const importResult = await apiClient.post<ImportResult>(
        `/api/statement-imports/${importRecord.id}/process`,
        { transactions },
      )

      setResult(importResult)
      setStep('result')
      fetchHistory()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Import failed')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  function handleReset() {
    setStep('upload')
    setCsvHeaders([])
    setCsvRows([])
    setFilename('')
    setDateCol(NONE)
    setDescCol(NONE)
    setAmountCol(NONE)
    setTypeCol(NONE)
    setTransactions([])
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const totalDebits = transactions
    .filter((t) => t.transactionType === 'debit')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0)
  const totalCredits = transactions
    .filter((t) => t.transactionType === 'credit')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Statement</h1>
        <p className="text-sm text-muted-foreground">
          Upload a bank statement CSV to import transactions.
        </p>
      </div>

      {/* Account Selector (always visible) */}
      <div className="w-64">
        <Label>Account</Label>
        <Select value={accountId} onValueChange={(v) => { setAccountId(v); handleReset() }}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!accountId ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Upload className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Select an account to get started</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose which account this statement belongs to.
          </p>
        </div>
      ) : (
        <>
          {/* Step: Upload */}
          {step === 'upload' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                  <FileSpreadsheet className="size-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">Upload CSV Statement</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Select a CSV file from your bank to import transactions.
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button className="mt-6" onClick={() => fileRef.current?.click()}>
                    <Upload className="mr-2 size-4" />
                    Choose CSV File
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Map Columns */}
          {step === 'map' && (
            <Card>
              <CardHeader>
                <CardTitle>Map Columns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  We detected {csvHeaders.length} columns and {csvRows.length} rows.
                  Map your CSV columns to the required fields.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <ColumnSelect
                    label="Date *"
                    value={dateCol}
                    onChange={setDateCol}
                    headers={csvHeaders}
                  />
                  <ColumnSelect
                    label="Description *"
                    value={descCol}
                    onChange={setDescCol}
                    headers={csvHeaders}
                  />
                  <ColumnSelect
                    label="Amount *"
                    value={amountCol}
                    onChange={setAmountCol}
                    headers={csvHeaders}
                  />
                  <ColumnSelect
                    label="Type (optional)"
                    value={typeCol}
                    onChange={setTypeCol}
                    headers={csvHeaders}
                  />
                </div>

                {typeCol === NONE && (
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={negativeIsDebit}
                      onCheckedChange={setNegativeIsDebit}
                    />
                    <Label>Negative amounts are debits</Label>
                  </div>
                )}

                {/* Preview first 3 rows */}
                {csvRows.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Preview (first 3 rows):</p>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {csvHeaders.map((h, i) => (
                              <TableHead key={i} className="whitespace-nowrap text-xs">
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvRows.slice(0, 3).map((row, ri) => (
                            <TableRow key={ri}>
                              {row.map((cell, ci) => (
                                <TableCell key={ci} className="whitespace-nowrap text-xs">
                                  {cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleReset}>
                    <ArrowLeft className="mr-2 size-4" />
                    Back
                  </Button>
                  <Button onClick={handleMapAndPreview}>
                    Preview Transactions
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Review */}
          {step === 'review' && (
            <Card>
              <CardHeader>
                <CardTitle>Review Transactions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-md border p-3 text-center">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-lg font-semibold font-numbers">{transactions.length}</p>
                  </div>
                  <div className="rounded-md border p-3 text-center">
                    <p className="text-sm text-muted-foreground">Debits</p>
                    <p className="text-lg font-semibold font-numbers text-destructive">
                      {formatCurrency(totalDebits)}
                    </p>
                  </div>
                  <div className="rounded-md border p-3 text-center">
                    <p className="text-sm text-muted-foreground">Credits</p>
                    <p className="text-lg font-semibold font-numbers text-emerald-600">
                      {formatCurrency(totalCredits)}
                    </p>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDate(t.transactionDate)}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-sm">
                            {t.description}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={t.transactionType === 'credit' ? 'default' : 'destructive'}
                              className={t.transactionType === 'credit' ? 'bg-emerald-600 text-white' : ''}
                            >
                              {t.transactionType === 'credit' ? 'Credit' : 'Debit'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-numbers">
                            {formatCurrency(t.amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => removeTransaction(i)}
                            >
                              <Trash2 className="size-3.5 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('map')}>
                    <ArrowLeft className="mr-2 size-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={isProcessing || transactions.length === 0}
                  >
                    {isProcessing ? 'Importing...' : `Import ${transactions.length} Transactions`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Result */}
          {step === 'result' && result && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <CheckCircle2 className="size-12 text-emerald-600" />
                  <h3 className="mt-4 text-lg font-semibold">Import Complete</h3>
                  <div className="mt-4 grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-2xl font-semibold font-numbers text-emerald-600">
                        {result.imported}
                      </p>
                      <p className="text-sm text-muted-foreground">Imported</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold font-numbers text-amber-500">
                        {result.duplicates}
                      </p>
                      <p className="text-sm text-muted-foreground">Duplicates</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold font-numbers text-destructive">
                        {result.failed}
                      </p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  </div>
                  <Button className="mt-6" onClick={handleReset}>
                    Import Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import History */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Import History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Imported</TableHead>
                        <TableHead className="text-right">Duplicates</TableHead>
                        <TableHead className="text-right">Failed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((imp) => (
                        <TableRow key={imp.id}>
                          <TableCell className="text-sm">{imp.filename ?? '-'}</TableCell>
                          <TableCell className="text-sm">
                            {imp.importedAt ? formatDate(new Date(imp.importedAt).toISOString().split('T')[0] ?? '') : '-'}
                          </TableCell>
                          <TableCell>
                            <ImportStatusBadge status={imp.status} />
                          </TableCell>
                          <TableCell className="text-right font-numbers">
                            {imp.transactionsImported ?? 0}
                          </TableCell>
                          <TableCell className="text-right font-numbers">
                            {imp.transactionsDuplicates ?? 0}
                          </TableCell>
                          <TableCell className="text-right font-numbers">
                            {imp.transactionsFailed ?? 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function ColumnSelect({
  label,
  value,
  onChange,
  headers,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  headers: string[]
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select column" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— Not mapped —</SelectItem>
          {headers.map((h, i) => (
            <SelectItem key={i} value={String(i)}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function ImportStatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="default" className="bg-emerald-600 text-white">
          <CheckCircle2 className="mr-1 size-3" />
          Completed
        </Badge>
      )
    case 'processing':
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 size-3" />
          Processing
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive">
          <AlertCircle className="mr-1 size-3" />
          Failed
        </Badge>
      )
    case 'partial':
      return (
        <Badge variant="outline" className="text-amber-500 border-amber-500">
          <AlertCircle className="mr-1 size-3" />
          Partial
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status ?? 'Unknown'}</Badge>
  }
}

function normalizeDate(raw: string): string | null {
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  // Try DD/MM/YYYY or DD-MM-YYYY (common SA format)
  const dmyMatch = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  // Try MM/DD/YYYY
  const mdyMatch = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (mdyMatch) {
    // Already handled above — ambiguous, default to DD/MM/YYYY (SA convention)
  }

  // Try YYYY/MM/DD
  const ymdMatch = raw.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/)
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  // Try to parse with Date constructor as fallback
  const parsed = new Date(raw)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0] ?? null
  }

  return null
}
