import type { CategoryType } from '../types/categories'

interface DefaultCategory {
  name: string
  categoryType: CategoryType
  icon: string
  displayOrder: number
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  { name: 'Groceries', categoryType: 'expense', icon: 'shopping-cart', displayOrder: 1 },
  { name: 'Restaurants & Takeout', categoryType: 'expense', icon: 'utensils', displayOrder: 2 },
  { name: 'Transport', categoryType: 'expense', icon: 'car', displayOrder: 3 },
  { name: 'Utilities', categoryType: 'expense', icon: 'zap', displayOrder: 4 },
  { name: 'Insurance', categoryType: 'expense', icon: 'shield', displayOrder: 5 },
  { name: 'Medical & Health', categoryType: 'expense', icon: 'heart-pulse', displayOrder: 6 },
  { name: 'Personal Care', categoryType: 'expense', icon: 'sparkles', displayOrder: 7 },
  { name: 'Clothing', categoryType: 'expense', icon: 'shirt', displayOrder: 8 },
  { name: 'Home & Garden', categoryType: 'expense', icon: 'home', displayOrder: 9 },
  { name: 'Entertainment', categoryType: 'expense', icon: 'film', displayOrder: 10 },
  { name: 'Subscriptions', categoryType: 'expense', icon: 'repeat', displayOrder: 11 },
  { name: 'Education', categoryType: 'expense', icon: 'graduation-cap', displayOrder: 12 },
  { name: 'Gifts & Donations', categoryType: 'expense', icon: 'gift', displayOrder: 13 },
  { name: 'Bank Fees', categoryType: 'expense', icon: 'landmark', displayOrder: 14 },
  { name: 'Cash Withdrawal', categoryType: 'expense', icon: 'banknote', displayOrder: 15 },
  { name: 'Shopping', categoryType: 'expense', icon: 'shopping-bag', displayOrder: 16 },
  { name: 'Travel', categoryType: 'expense', icon: 'plane', displayOrder: 17 },
  { name: 'Pets', categoryType: 'expense', icon: 'paw-print', displayOrder: 18 },
  { name: 'Children', categoryType: 'expense', icon: 'baby', displayOrder: 19 },
  { name: 'Debt Repayment', categoryType: 'expense', icon: 'credit-card', displayOrder: 20 },
]

export const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  { name: 'Salary', categoryType: 'income', icon: 'briefcase', displayOrder: 1 },
  { name: 'Bonus', categoryType: 'income', icon: 'trophy', displayOrder: 2 },
  { name: 'Freelance/Side Income', categoryType: 'income', icon: 'laptop', displayOrder: 3 },
  { name: 'Interest', categoryType: 'income', icon: 'percent', displayOrder: 4 },
  { name: 'Dividends', categoryType: 'income', icon: 'trending-up', displayOrder: 5 },
  { name: 'Refund', categoryType: 'income', icon: 'rotate-ccw', displayOrder: 6 },
  { name: 'Gift Received', categoryType: 'income', icon: 'gift', displayOrder: 7 },
  { name: 'Other Income', categoryType: 'income', icon: 'plus-circle', displayOrder: 8 },
]

export const ALL_DEFAULT_CATEGORIES: DefaultCategory[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
]
