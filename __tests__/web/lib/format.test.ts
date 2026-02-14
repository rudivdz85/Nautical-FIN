import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDebtType,
  formatGoalType,
  getWeekRange,
  formatWeekday,
  formatShortDate,
  formatTransactionType,
  formatTransactionSource,
  formatBudgetStatus,
  formatMonth,
  formatFrequency,
  formatAccountType,
} from '@/lib/format'

describe('formatCurrency', () => {
  it('formats a number as ZAR', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1')
    expect(result).toContain('234')
    expect(result).toContain('56')
  })

  it('formats a string amount', () => {
    const result = formatCurrency('99.90')
    expect(result).toContain('99')
    expect(result).toContain('90')
  })

  it('formats zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
    expect(result).toContain('00')
  })

  it('formats negative numbers', () => {
    const result = formatCurrency(-500)
    expect(result).toContain('500')
    expect(result).toMatch(/-|−/)
  })

  it('accepts a custom currency', () => {
    const result = formatCurrency(100, 'USD')
    expect(result).toContain('100')
    expect(result).toContain('00')
  })
})

describe('formatDate', () => {
  it('formats an ISO date string', () => {
    const result = formatDate('2025-03-15')
    expect(result).toContain('15')
    expect(result).toContain('Mar')
    expect(result).toContain('2025')
  })

  it('returns dash for null', () => {
    expect(formatDate(null)).toBe('-')
  })

  it('returns dash for undefined', () => {
    expect(formatDate(undefined)).toBe('-')
  })
})

describe('formatDebtType', () => {
  it('maps home_loan to Home Loan', () => {
    expect(formatDebtType('home_loan')).toBe('Home Loan')
  })

  it('maps credit_card to Credit Card', () => {
    expect(formatDebtType('credit_card')).toBe('Credit Card')
  })

  it('returns unknown type as-is', () => {
    expect(formatDebtType('bitcoin_loan')).toBe('bitcoin_loan')
  })
})

describe('formatGoalType', () => {
  it('maps emergency to Emergency Fund', () => {
    expect(formatGoalType('emergency')).toBe('Emergency Fund')
  })

  it('falls back to raw string', () => {
    expect(formatGoalType('custom_goal')).toBe('custom_goal')
  })
})

describe('getWeekRange', () => {
  it('returns Monday-Sunday for a Wednesday', () => {
    const { start, end } = getWeekRange(new Date('2025-03-12T12:00:00'))
    expect(start).toBe('2025-03-10')
    expect(end).toBe('2025-03-16')
  })

  it('handles Sunday (returns prior Monday to that Sunday)', () => {
    const { start, end } = getWeekRange(new Date('2025-03-16T12:00:00'))
    expect(start).toBe('2025-03-10')
    expect(end).toBe('2025-03-16')
  })

  it('handles Monday', () => {
    const { start, end } = getWeekRange(new Date('2025-03-10T12:00:00'))
    expect(start).toBe('2025-03-10')
    expect(end).toBe('2025-03-16')
  })
})

describe('formatWeekday', () => {
  it('formats a date to short weekday', () => {
    const result = formatWeekday('2025-03-12')
    expect(result).toBe('Wed')
  })
})

describe('formatShortDate', () => {
  it('formats a date to short form', () => {
    const result = formatShortDate('2025-03-12')
    expect(result).toContain('12')
    expect(result).toContain('Mar')
  })
})

describe('formatTransactionType', () => {
  it('maps debit to Debit', () => {
    expect(formatTransactionType('debit')).toBe('Debit')
  })

  it('maps credit to Credit', () => {
    expect(formatTransactionType('credit')).toBe('Credit')
  })

  it('falls back to raw string', () => {
    expect(formatTransactionType('refund')).toBe('refund')
  })
})

describe('formatTransactionSource', () => {
  it('maps bank_sync to Bank Sync', () => {
    expect(formatTransactionSource('bank_sync')).toBe('Bank Sync')
  })

  it('falls back to raw string', () => {
    expect(formatTransactionSource('api')).toBe('api')
  })
})

describe('formatBudgetStatus', () => {
  it('maps active to Active', () => {
    expect(formatBudgetStatus('active')).toBe('Active')
  })

  it('falls back to raw string', () => {
    expect(formatBudgetStatus('archived')).toBe('archived')
  })
})

describe('formatMonth', () => {
  it('formats month and year', () => {
    expect(formatMonth(2025, 3)).toBe('March 2025')
  })

  it('formats December', () => {
    expect(formatMonth(2025, 12)).toBe('December 2025')
  })
})

describe('formatFrequency', () => {
  it('maps monthly to Monthly', () => {
    expect(formatFrequency('monthly')).toBe('Monthly')
  })

  it('falls back to raw string', () => {
    expect(formatFrequency('biweekly')).toBe('biweekly')
  })
})

describe('formatAccountType', () => {
  it('maps cheque to Cheque', () => {
    expect(formatAccountType('cheque')).toBe('Cheque')
  })

  it('maps credit_card to Credit Card', () => {
    expect(formatAccountType('credit_card')).toBe('Credit Card')
  })

  it('falls back to raw string', () => {
    expect(formatAccountType('crypto')).toBe('crypto')
  })
})
