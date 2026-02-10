import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { users, subscriptions } from '../db/schema'

export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>

export type Subscription = InferSelectModel<typeof subscriptions>
export type NewSubscription = InferInsertModel<typeof subscriptions>

export type UserPreferences = NonNullable<User['preferences']>

export type SubscriptionTier = Subscription['tier']
