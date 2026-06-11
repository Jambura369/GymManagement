-- ============================================================
-- Migration 005: Subscription Plans + Gym Subscription Fields
-- ============================================================

-- ── 1. Create subscription_plans table ───────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT        NOT NULL UNIQUE,
  monthly_price  INTEGER     NOT NULL DEFAULT 0,   -- INR, 0 = free
  annual_price   INTEGER     NOT NULL DEFAULT 0,   -- INR billed annually (full year amount)
  trial_days     INTEGER     NOT NULL DEFAULT 0,
  features       JSONB       NOT NULL DEFAULT '{}',
  limits         JSONB       NOT NULL DEFAULT '{}',
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Add subscription columns to gyms ──────────────────────
ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS plan_id                UUID        REFERENCES subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT        NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- ── 3. Insert the 4 subscription plans ───────────────────────
INSERT INTO subscription_plans (name, monthly_price, annual_price, trial_days, features, limits)
VALUES

-- ── Free Trial ────────────────────────────────────────────────
(
  'Free Trial',
  0,
  0,
  14,
  '{
    "attendance": true,
    "membership_management": true,
    "fee_collection": true,
    "expense_tracking": true,
    "basic_dashboard": true,
    "staff_management": false,
    "basic_reports": false,
    "renewal_reminders": false,
    "trainer_management": false,
    "advanced_reports": false,
    "whatsapp_reminders": false,
    "qr_attendance": false,
    "workout_plans": false,
    "diet_plans": false,
    "progress_tracking": false,
    "transformation_gallery": false,
    "lead_management": false,
    "custom_branding": false,
    "multi_branch": false,
    "franchise_dashboard": false,
    "white_label": false,
    "custom_domain": false,
    "api_access": false,
    "ai_assistant": false,
    "ai_renewal_prediction": false,
    "priority_support": false
  }',
  '{"members": 50, "trainers": 1, "branches": 1, "staff": 2}'
),

-- ── Starter ───────────────────────────────────────────────────
-- ₹999/mo  |  ₹9,990/yr  (save ~17% = ~2 months free)
(
  'Starter',
  999,
  9990,
  0,
  '{
    "attendance": true,
    "membership_management": true,
    "fee_collection": true,
    "expense_tracking": true,
    "basic_dashboard": true,
    "staff_management": true,
    "basic_reports": true,
    "renewal_reminders": true,
    "trainer_management": false,
    "advanced_reports": false,
    "whatsapp_reminders": false,
    "qr_attendance": false,
    "workout_plans": false,
    "diet_plans": false,
    "progress_tracking": false,
    "transformation_gallery": false,
    "lead_management": false,
    "custom_branding": false,
    "multi_branch": false,
    "franchise_dashboard": false,
    "white_label": false,
    "custom_domain": false,
    "api_access": false,
    "ai_assistant": false,
    "ai_renewal_prediction": false,
    "priority_support": false
  }',
  '{"members": 200, "trainers": 5, "branches": 1, "staff": 5}'
),

-- ── Professional ──────────────────────────────────────────────
-- ₹2,499/mo  |  ₹24,990/yr  (save ~17%)
(
  'Professional',
  2499,
  24990,
  0,
  '{
    "attendance": true,
    "membership_management": true,
    "fee_collection": true,
    "expense_tracking": true,
    "basic_dashboard": true,
    "staff_management": true,
    "basic_reports": true,
    "renewal_reminders": true,
    "trainer_management": true,
    "advanced_reports": true,
    "whatsapp_reminders": true,
    "qr_attendance": true,
    "workout_plans": true,
    "diet_plans": true,
    "progress_tracking": true,
    "transformation_gallery": true,
    "lead_management": true,
    "custom_branding": true,
    "multi_branch": false,
    "franchise_dashboard": false,
    "white_label": false,
    "custom_domain": false,
    "api_access": false,
    "ai_assistant": false,
    "ai_renewal_prediction": false,
    "priority_support": false
  }',
  '{"members": 1000, "trainers": 20, "branches": 3, "staff": 20}'
),

-- ── Enterprise ────────────────────────────────────────────────
-- ₹4,999/mo  |  ₹49,990/yr  (save ~17%)
(
  'Enterprise',
  4999,
  49990,
  0,
  '{
    "attendance": true,
    "membership_management": true,
    "fee_collection": true,
    "expense_tracking": true,
    "basic_dashboard": true,
    "staff_management": true,
    "basic_reports": true,
    "renewal_reminders": true,
    "trainer_management": true,
    "advanced_reports": true,
    "whatsapp_reminders": true,
    "qr_attendance": true,
    "workout_plans": true,
    "diet_plans": true,
    "progress_tracking": true,
    "transformation_gallery": true,
    "lead_management": true,
    "custom_branding": true,
    "multi_branch": true,
    "franchise_dashboard": true,
    "white_label": true,
    "custom_domain": true,
    "api_access": true,
    "ai_assistant": true,
    "ai_renewal_prediction": true,
    "priority_support": true
  }',
  '{"members": -1, "trainers": -1, "branches": -1, "staff": -1}'
)

ON CONFLICT (name) DO UPDATE SET
  monthly_price = EXCLUDED.monthly_price,
  annual_price  = EXCLUDED.annual_price,
  trial_days    = EXCLUDED.trial_days,
  features      = EXCLUDED.features,
  limits        = EXCLUDED.limits,
  updated_at    = NOW();

-- ── 4. Set existing gyms to Free Trial plan & trial status ────
UPDATE gyms
SET
  plan_id              = (SELECT id FROM subscription_plans WHERE name = 'Free Trial'),
  subscription_status  = 'trial',
  trial_ends_at        = created_at + INTERVAL '14 days'
WHERE
  plan_id IS NULL;

-- ── 5. RLS: anyone authenticated can read plans ───────────────
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_read_all" ON subscription_plans;
CREATE POLICY "plans_read_all"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);
