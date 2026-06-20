-- ============================================================
-- Migration 011: Subscription payments
--   - subscription_payments: records each Razorpay order created
--     for a gym's plan upgrade/renewal, and its outcome.
--   - Backs the mobile in-app checkout flow (upgradePlan /
--     activateSubscription) and the super-admin revenue summary
--     (getRevenueSummary, which already queried this table before
--     it existed).
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_payments (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id                UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  plan_id               UUID        NOT NULL REFERENCES subscription_plans(id),
  billing_cycle         TEXT        NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  amount                DECIMAL(10,2) NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed')),
  razorpay_order_id     TEXT        NOT NULL,
  razorpay_payment_id   TEXT,
  coupon_code           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_gym_id ON subscription_payments(gym_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_order_id ON subscription_payments(razorpay_order_id);

-- ── RLS ────────────────────────────────────────────────────────
-- Written exclusively through the GymManagmentAdmin backend, which
-- connects with the service-role key (bypasses RLS). Policies below
-- only matter if a client ever queries Supabase directly.
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gym staff can view own gym payments" ON subscription_payments FOR SELECT
  USING (gym_id = get_my_gym_id());

CREATE POLICY "Super admins can view all payments" ON subscription_payments FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin');
