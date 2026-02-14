'use client'

import { Tooltip as RechartsTooltip } from 'recharts'
import { formatCurrency } from '@/lib/format'

export function ChartTooltipContent({
  active,
  payload,
  label,
  currencyFormat = true,
  labelFormatter,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
  currencyFormat?: boolean
  labelFormatter?: (label: string) => string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-md">
      {label && (
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium font-numbers">
            {currencyFormat ? formatCurrency(entry.value) : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export { RechartsTooltip }
