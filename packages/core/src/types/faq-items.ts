import type { faqItems } from '../db/schema'

export type FaqItem = typeof faqItems.$inferSelect
export type NewFaqItem = typeof faqItems.$inferInsert

export type FaqCategory =
  | 'general'
  | 'budgets'
  | 'actuals'
  | 'daily-tracker'
  | 'subscriptions'
  | 'security'
  | 'bank-sync'
