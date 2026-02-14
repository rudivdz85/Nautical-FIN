CREATE TYPE "public"."account_classification" AS ENUM('spending', 'non_spending');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('cheque', 'savings', 'credit_card', 'investment', 'loan', 'other');--> statement-breakpoint
CREATE TYPE "public"."actual_status" AS ENUM('open', 'reconciling', 'closed');--> statement-breakpoint
CREATE TYPE "public"."budget_redistribution" AS ENUM('even', 'weekly', 'weighted');--> statement-breakpoint
CREATE TYPE "public"."budget_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."category_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."debt_type" AS ENUM('home_loan', 'vehicle', 'personal_loan', 'credit_card', 'overdraft', 'store_account', 'student_loan', 'other');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('processing', 'completed', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."recurring_amount_type" AS ENUM('fixed', 'variable');--> statement-breakpoint
CREATE TYPE "public"."recurring_frequency" AS ENUM('weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."savings_goal_type" AS ENUM('emergency', 'specific', 'general');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('trial', 'basic', 'premium', 'lifetime');--> statement-breakpoint
CREATE TYPE "public"."surplus_action" AS ENUM('rollover', 'savings', 'general');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'completed', 'dismissed', 'snoozed');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('retro_reminder', 'fund_account', 'balance_low', 'recurring_failed', 'variable_recurring_confirm', 'unconfirmed_income', 'budget_threshold', 'unusual_spending', 'goal_milestone', 'bill_increase', 'savings_goal_track', 'uncategorized_transactions', 'surplus_action', 'planned_expense_reminder', 'planned_expense_warning', 'custom');--> statement-breakpoint
CREATE TYPE "public"."transaction_source" AS ENUM('manual', 'import', 'bank_sync', 'recurring');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('debit', 'credit', 'transfer');--> statement-breakpoint
CREATE TABLE "account_balance_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actual_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"expected_balance" numeric(15, 2) NOT NULL,
	"confirmed_balance" numeric(15, 2),
	"difference" numeric(15, 2),
	"is_confirmed" boolean DEFAULT false,
	"confirmed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "balance_confirmations_actual_account_idx" UNIQUE("actual_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"account_type" "account_type" NOT NULL,
	"classification" "account_classification" NOT NULL,
	"institution" varchar(100),
	"account_number_masked" varchar(20),
	"currency" varchar(3) DEFAULT 'ZAR' NOT NULL,
	"current_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"balance_as_of_date" date,
	"credit_limit" numeric(15, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_first_account" boolean DEFAULT false,
	"sync_method" varchar(20) DEFAULT 'manual',
	"bank_sync_enabled" boolean DEFAULT false,
	"bank_sync_last_at" timestamp with time zone,
	"display_order" smallint DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actual_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actual_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0',
	"transaction_count" integer DEFAULT 0,
	"budgeted_amount" numeric(15, 2),
	"variance" numeric(15, 2),
	"variance_percentage" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "actual_categories_actual_category_idx" UNIQUE("actual_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "actuals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"budget_id" uuid,
	"year" smallint NOT NULL,
	"month" smallint NOT NULL,
	"status" "actual_status" DEFAULT 'open' NOT NULL,
	"total_income" numeric(15, 2) DEFAULT '0',
	"total_expenses" numeric(15, 2) DEFAULT '0',
	"net_savings" numeric(15, 2) DEFAULT '0',
	"reconciled_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "actuals_user_year_month_idx" UNIQUE("user_id","year","month")
);
--> statement-breakpoint
CREATE TABLE "ai_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"insight_type" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"related_entity_type" varchar(50),
	"related_entity_id" uuid,
	"priority" smallint DEFAULT 5,
	"is_read" boolean DEFAULT false,
	"is_dismissed" boolean DEFAULT false,
	"valid_until" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_incomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"income_id" uuid,
	"name" varchar(100) NOT NULL,
	"expected_amount" numeric(15, 2) NOT NULL,
	"expected_date" date,
	"is_confirmed" boolean DEFAULT false,
	"actual_amount" numeric(15, 2),
	"actual_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"planned_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"rollover_amount" numeric(15, 2) DEFAULT '0',
	"surplus_action" "surplus_action" DEFAULT 'rollover',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_items_budget_category_idx" UNIQUE("budget_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"year" smallint NOT NULL,
	"month" smallint NOT NULL,
	"status" "budget_status" DEFAULT 'draft' NOT NULL,
	"total_planned_income" numeric(15, 2) DEFAULT '0',
	"total_planned_expenses" numeric(15, 2) DEFAULT '0',
	"total_planned_savings" numeric(15, 2) DEFAULT '0',
	"total_planned_debt_payments" numeric(15, 2) DEFAULT '0',
	"unallocated_amount" numeric(15, 2) DEFAULT '0',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_user_year_month_idx" UNIQUE("user_id","year","month")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(50) NOT NULL,
	"category_type" "category_type" NOT NULL,
	"parent_id" uuid,
	"icon" varchar(50),
	"color" varchar(7),
	"is_system" boolean DEFAULT false NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"display_order" smallint DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorization_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"category_id" uuid NOT NULL,
	"merchant_exact" varchar(200),
	"merchant_pattern" varchar(200),
	"description_pattern" varchar(200),
	"amount_min" numeric(15, 2),
	"amount_max" numeric(15, 2),
	"priority" smallint DEFAULT 50,
	"confidence" numeric(3, 2) DEFAULT '1.00',
	"times_applied" integer DEFAULT 0,
	"times_corrected" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_global" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"intent" varchar(50),
	"entities" jsonb,
	"action_taken" varchar(100),
	"action_result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_tracker_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"expected_income" numeric(15, 2) DEFAULT '0',
	"expected_debt_payments" numeric(15, 2) DEFAULT '0',
	"expected_expenses" numeric(15, 2) DEFAULT '0',
	"predicted_spend" numeric(15, 2) DEFAULT '0',
	"manual_override" numeric(15, 2),
	"running_balance" numeric(15, 2) DEFAULT '0',
	"has_alerts" boolean DEFAULT false,
	"alerts" jsonb,
	"is_payday" boolean DEFAULT false,
	"income_details" jsonb,
	"debt_details" jsonb,
	"expense_details" jsonb,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_tracker_cache_user_date_idx" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "debt_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"transaction_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"principal_amount" numeric(15, 2),
	"interest_amount" numeric(15, 2),
	"payment_date" date NOT NULL,
	"balance_after" numeric(15, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"linked_account_id" uuid,
	"name" varchar(100) NOT NULL,
	"debt_type" "debt_type" NOT NULL,
	"creditor" varchar(100),
	"original_amount" numeric(15, 2) NOT NULL,
	"current_balance" numeric(15, 2) NOT NULL,
	"interest_rate" numeric(5, 2),
	"interest_type" varchar(20) DEFAULT 'compound',
	"minimum_payment" numeric(15, 2),
	"fixed_payment" numeric(15, 2),
	"payment_day" smallint,
	"start_date" date,
	"expected_payoff_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duplicate_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"merchant_pattern" varchar(200),
	"amount" numeric(15, 2),
	"action" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" varchar(500) NOT NULL,
	"answer" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"display_order" smallint DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faq_items_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "incomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"recurring_id" uuid,
	"name" varchar(100) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"frequency" "recurring_frequency" DEFAULT 'monthly' NOT NULL,
	"expected_day" smallint,
	"is_confirmed" boolean DEFAULT true NOT NULL,
	"confirmation_required_monthly" boolean DEFAULT false,
	"next_expected" date,
	"last_received" date,
	"is_primary_salary" boolean DEFAULT false,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"original_name" varchar(200) NOT NULL,
	"normalized_name" varchar(200) NOT NULL,
	"is_global" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "net_worth_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"total_assets" numeric(15, 2) NOT NULL,
	"total_liabilities" numeric(15, 2) NOT NULL,
	"net_worth" numeric(15, 2) NOT NULL,
	"total_cash_spend" numeric(15, 2),
	"total_credit_available" numeric(15, 2),
	"total_savings" numeric(15, 2),
	"total_debt" numeric(15, 2),
	"breakdown" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "net_worth_snapshots_user_date_idx" UNIQUE("user_id","snapshot_date")
);
--> statement-breakpoint
CREATE TABLE "planned_one_offs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"description" varchar(255) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"expected_date" date NOT NULL,
	"is_reserved" boolean DEFAULT true NOT NULL,
	"reminder_days_before" smallint DEFAULT 14 NOT NULL,
	"reminder_threshold" numeric(15, 2) DEFAULT '1000',
	"last_reminder_sent" date,
	"last_reminder_type" varchar(20),
	"is_completed" boolean DEFAULT false,
	"actual_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"amount_type" "recurring_amount_type" DEFAULT 'fixed' NOT NULL,
	"amount" numeric(15, 2),
	"amount_max" numeric(15, 2),
	"frequency" "recurring_frequency" NOT NULL,
	"day_of_month" smallint,
	"day_of_week" smallint,
	"start_date" date NOT NULL,
	"next_occurrence" date,
	"last_occurrence" date,
	"transaction_type" "transaction_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"requires_confirmation" boolean DEFAULT false,
	"merchant_pattern" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"savings_goal_id" uuid NOT NULL,
	"transaction_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"contribution_date" date NOT NULL,
	"source" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"linked_account_id" uuid,
	"name" varchar(100) NOT NULL,
	"goal_type" "savings_goal_type" NOT NULL,
	"target_amount" numeric(15, 2),
	"current_amount" numeric(15, 2) DEFAULT '0',
	"target_date" date,
	"target_months_of_expenses" smallint,
	"monthly_contribution" numeric(15, 2),
	"priority" smallint DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statement_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"filename" varchar(255),
	"file_type" varchar(10),
	"file_url" varchar(500),
	"statement_start_date" date,
	"statement_end_date" date,
	"opening_balance" numeric(15, 2),
	"closing_balance" numeric(15, 2),
	"transactions_imported" integer DEFAULT 0,
	"transactions_duplicates" integer DEFAULT 0,
	"transactions_failed" integer DEFAULT 0,
	"status" "import_status" DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" "subscription_tier" DEFAULT 'trial' NOT NULL,
	"trial_start_date" timestamp with time zone,
	"trial_end_date" timestamp with time zone,
	"subscription_start_date" timestamp with time zone,
	"subscription_end_date" timestamp with time zone,
	"is_lifetime" boolean DEFAULT false,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surplus_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actual_id" uuid NOT NULL,
	"category_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"action" "surplus_action" NOT NULL,
	"target_savings_goal_id" uuid,
	"target_category_id" uuid,
	"is_actioned" boolean DEFAULT false,
	"actioned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_type" "task_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"due_date" date,
	"due_time" time,
	"snoozed_until" timestamp with time zone,
	"is_recurring" boolean DEFAULT false,
	"recurring_source_id" uuid,
	"related_entity_type" varchar(50),
	"related_entity_id" uuid,
	"action_path" varchar(200),
	"completed_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(20) NOT NULL,
	"field_changed" varchar(50),
	"old_value" text,
	"new_value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'ZAR' NOT NULL,
	"transaction_date" date NOT NULL,
	"posted_date" date,
	"description" varchar(500) NOT NULL,
	"merchant_original" varchar(200),
	"merchant_normalized" varchar(200),
	"notes" text,
	"transaction_type" "transaction_type" NOT NULL,
	"source" "transaction_source" DEFAULT 'manual' NOT NULL,
	"external_id" varchar(100),
	"is_recurring_instance" boolean DEFAULT false,
	"recurring_id" uuid,
	"transfer_pair_id" uuid,
	"transfer_to_account_id" uuid,
	"is_split" boolean DEFAULT false,
	"parent_transaction_id" uuid,
	"categorization_confidence" numeric(3, 2),
	"categorization_method" varchar(20),
	"is_ai_categorized" boolean DEFAULT false,
	"is_reviewed" boolean DEFAULT false,
	"import_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"preferences" jsonb DEFAULT '{"financialMonthStartDay":25,"defaultCurrency":"ZAR","theme":"system","budgetRedistribution":"even","notifications":{"inApp":true,"push":true,"desktop":true,"email":false}}'::jsonb,
	"onboarding_completed" boolean DEFAULT false,
	"is_salaried" boolean,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "account_balance_confirmations" ADD CONSTRAINT "account_balance_confirmations_actual_id_actuals_id_fk" FOREIGN KEY ("actual_id") REFERENCES "public"."actuals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_balance_confirmations" ADD CONSTRAINT "account_balance_confirmations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actual_categories" ADD CONSTRAINT "actual_categories_actual_id_actuals_id_fk" FOREIGN KEY ("actual_id") REFERENCES "public"."actuals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actual_categories" ADD CONSTRAINT "actual_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actuals" ADD CONSTRAINT "actuals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actuals" ADD CONSTRAINT "actuals_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_incomes" ADD CONSTRAINT "budget_incomes_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_incomes" ADD CONSTRAINT "budget_incomes_income_id_incomes_id_fk" FOREIGN KEY ("income_id") REFERENCES "public"."incomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_tracker_cache" ADD CONSTRAINT "daily_tracker_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_rules" ADD CONSTRAINT "duplicate_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_recurring_id_recurring_transactions_id_fk" FOREIGN KEY ("recurring_id") REFERENCES "public"."recurring_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_mappings" ADD CONSTRAINT "merchant_mappings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "net_worth_snapshots" ADD CONSTRAINT "net_worth_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_one_offs" ADD CONSTRAINT "planned_one_offs_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_one_offs" ADD CONSTRAINT "planned_one_offs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_one_offs" ADD CONSTRAINT "planned_one_offs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_one_offs" ADD CONSTRAINT "planned_one_offs_actual_transaction_id_transactions_id_fk" FOREIGN KEY ("actual_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_contributions" ADD CONSTRAINT "savings_contributions_savings_goal_id_savings_goals_id_fk" FOREIGN KEY ("savings_goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_contributions" ADD CONSTRAINT "savings_contributions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_imports" ADD CONSTRAINT "statement_imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_imports" ADD CONSTRAINT "statement_imports_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surplus_allocations" ADD CONSTRAINT "surplus_allocations_actual_id_actuals_id_fk" FOREIGN KEY ("actual_id") REFERENCES "public"."actuals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surplus_allocations" ADD CONSTRAINT "surplus_allocations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surplus_allocations" ADD CONSTRAINT "surplus_allocations_target_savings_goal_id_savings_goals_id_fk" FOREIGN KEY ("target_savings_goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surplus_allocations" ADD CONSTRAINT "surplus_allocations_target_category_id_categories_id_fk" FOREIGN KEY ("target_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_audit_log" ADD CONSTRAINT "transaction_audit_log_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_audit_log" ADD CONSTRAINT "transaction_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_id_recurring_transactions_id_fk" FOREIGN KEY ("recurring_id") REFERENCES "public"."recurring_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_to_account_id_accounts_id_fk" FOREIGN KEY ("transfer_to_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parent_transaction_id_transactions_id_fk" FOREIGN KEY ("parent_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_id_statement_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."statement_imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "accounts_user_active_idx" ON "accounts" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "actual_categories_actual_idx" ON "actual_categories" USING btree ("actual_id");--> statement-breakpoint
CREATE INDEX "actuals_user_idx" ON "actuals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_insights_user_idx" ON "ai_insights" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_insights_user_unread_idx" ON "ai_insights" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "budget_incomes_budget_idx" ON "budget_incomes" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "budget_items_budget_idx" ON "budget_items" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "budgets_user_idx" ON "budgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_user_type_idx" ON "categories" USING btree ("user_id","category_type");--> statement-breakpoint
CREATE INDEX "categorization_rules_user_idx" ON "categorization_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categorization_rules_merchant_exact_idx" ON "categorization_rules" USING btree ("merchant_exact");--> statement-breakpoint
CREATE INDEX "categorization_rules_global_idx" ON "categorization_rules" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX "chat_messages_user_idx" ON "chat_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_messages_user_date_idx" ON "chat_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "daily_tracker_cache_user_idx" ON "daily_tracker_cache" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "debt_payments_debt_idx" ON "debt_payments" USING btree ("debt_id");--> statement-breakpoint
CREATE INDEX "debt_payments_date_idx" ON "debt_payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "debts_user_idx" ON "debts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "debts_user_active_idx" ON "debts" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "duplicate_rules_user_idx" ON "duplicate_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "faq_items_category_idx" ON "faq_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "faq_items_slug_idx" ON "faq_items" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "incomes_user_idx" ON "incomes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "incomes_user_active_idx" ON "incomes" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "merchant_mappings_original_name_idx" ON "merchant_mappings" USING btree ("original_name");--> statement-breakpoint
CREATE INDEX "merchant_mappings_user_idx" ON "merchant_mappings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "net_worth_snapshots_user_idx" ON "net_worth_snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "planned_one_offs_budget_idx" ON "planned_one_offs" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "planned_one_offs_expected_date_idx" ON "planned_one_offs" USING btree ("expected_date");--> statement-breakpoint
CREATE INDEX "planned_one_offs_pending_idx" ON "planned_one_offs" USING btree ("is_completed","expected_date");--> statement-breakpoint
CREATE INDEX "recurring_user_idx" ON "recurring_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_user_active_idx" ON "recurring_transactions" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "recurring_next_occurrence_idx" ON "recurring_transactions" USING btree ("next_occurrence");--> statement-breakpoint
CREATE INDEX "savings_contributions_goal_idx" ON "savings_contributions" USING btree ("savings_goal_id");--> statement-breakpoint
CREATE INDEX "savings_goals_user_idx" ON "savings_goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "savings_goals_user_active_idx" ON "savings_goals" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "savings_goals_user_priority_idx" ON "savings_goals" USING btree ("user_id","priority");--> statement-breakpoint
CREATE INDEX "statement_imports_user_idx" ON "statement_imports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "statement_imports_account_idx" ON "statement_imports" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "surplus_allocations_actual_idx" ON "surplus_allocations" USING btree ("actual_id");--> statement-breakpoint
CREATE INDEX "tasks_user_status_idx" ON "tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "tasks_user_due_idx" ON "tasks" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "tasks_user_priority_idx" ON "tasks" USING btree ("user_id","priority");--> statement-breakpoint
CREATE INDEX "audit_transaction_idx" ON "transaction_audit_log" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "transaction_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" USING btree ("user_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_account_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_category_idx" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "transactions_user_external_idx" ON "transactions" USING btree ("user_id","external_id");--> statement-breakpoint
CREATE INDEX "transactions_recurring_idx" ON "transactions" USING btree ("recurring_id");--> statement-breakpoint
CREATE INDEX "transactions_transfer_pair_idx" ON "transactions" USING btree ("transfer_pair_id");--> statement-breakpoint
CREATE INDEX "transactions_import_idx" ON "transactions" USING btree ("import_id");--> statement-breakpoint
CREATE INDEX "transactions_user_unreviewed_idx" ON "transactions" USING btree ("user_id","is_reviewed");--> statement-breakpoint
CREATE INDEX "users_clerk_id_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");