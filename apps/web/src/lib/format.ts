const currencyFormatters: Record<string, Intl.NumberFormat> = {}

export function formatCurrency(amount: string | number, currency = 'ZAR'): string {
  if (!currencyFormatters[currency]) {
    currencyFormatters[currency] = new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    })
  }
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return currencyFormatters[currency].format(num)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDebtType(type: string): string {
  const labels: Record<string, string> = {
    home_loan: 'Home Loan',
    vehicle: 'Vehicle',
    personal_loan: 'Personal Loan',
    credit_card: 'Credit Card',
    overdraft: 'Overdraft',
    store_account: 'Store Account',
    student_loan: 'Student Loan',
    other: 'Other',
  }
  return labels[type] ?? type
}

export function formatGoalType(type: string): string {
  const labels: Record<string, string> = {
    emergency: 'Emergency Fund',
    specific: 'Specific Goal',
    general: 'General Savings',
  }
  return labels[type] ?? type
}

export function getWeekRange(date: Date): { start: string; end: string } {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMon)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().split('T')[0] ?? '',
    end: sunday.toISOString().split('T')[0] ?? '',
  }
}

export function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat('en-ZA', { weekday: 'short' }).format(new Date(date + 'T12:00:00'))
}

export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short' }).format(
    new Date(date + 'T12:00:00'),
  )
}

export function formatTransactionType(type: string): string {
  const labels: Record<string, string> = {
    debit: 'Debit',
    credit: 'Credit',
    transfer: 'Transfer',
  }
  return labels[type] ?? type
}

export function formatTransactionSource(source: string): string {
  const labels: Record<string, string> = {
    manual: 'Manual',
    import: 'Import',
    bank_sync: 'Bank Sync',
    recurring: 'Recurring',
  }
  return labels[source] ?? source
}

export function formatBudgetStatus(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    active: 'Active',
    closed: 'Closed',
  }
  return labels[status] ?? status
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatMonth(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`
}

export function formatFrequency(frequency: string): string {
  const labels: Record<string, string> = {
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  }
  return labels[frequency] ?? frequency
}

export function formatAccountType(type: string): string {
  const labels: Record<string, string> = {
    cheque: 'Cheque',
    savings: 'Savings',
    credit_card: 'Credit Card',
    investment: 'Investment',
    loan: 'Loan',
    other: 'Other',
  }
  return labels[type] ?? type
}
