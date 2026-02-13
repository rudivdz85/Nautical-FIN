import type { aiInsights } from '../db/schema'

export type AiInsight = typeof aiInsights.$inferSelect
export type NewAiInsight = typeof aiInsights.$inferInsert

export type InsightType =
  | 'monthly_checkin'
  | 'spending_alert'
  | 'savings_milestone'
  | 'budget_warning'
  | 'debt_progress'
  | 'recommendation'
