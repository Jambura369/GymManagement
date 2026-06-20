-- ============================================================
-- Migration 010: Add-ons marketplace
--   - add_ons: catalog managed by super admin
--   - gym_add_ons: per-gym purchases/cancellations
--   - Backs the gym-owner "Add-Ons" tab and super-admin Add-On
--     Management page, both of which were previously hardcoded
--     mock data in the frontend.
-- ============================================================

CREATE TABLE IF NOT EXISTS add_ons (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT        NOT NULL,
  key           TEXT        NOT NULL UNIQUE,
  description   TEXT,
  icon          TEXT        NOT NULL DEFAULT '⚙️',
  monthly_price DECIMAL(10,2) NOT NULL,
  annual_price  DECIMAL(10,2) NOT NULL,
  category      TEXT,
  highlights    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  subscribers   INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_add_ons (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id        UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  add_on_id     UUID        NOT NULL REFERENCES add_ons(id) ON DELETE CASCADE,
  billing_cycle TEXT        NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  price         DECIMAL(10,2) NOT NULL,
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  purchased_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  renews_at     TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gym_add_ons_gym_id ON gym_add_ons(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_add_ons_add_on_id ON gym_add_ons(add_on_id);
-- One active purchase per (gym, add-on) at a time — re-subscribing after
-- cancellation inserts a new row rather than reactivating the old one.
CREATE UNIQUE INDEX IF NOT EXISTS uq_gym_add_ons_active ON gym_add_ons(gym_id, add_on_id) WHERE active;

DROP TRIGGER IF EXISTS trg_add_ons_updated_at ON add_ons;
CREATE TRIGGER trg_add_ons_updated_at
  BEFORE UPDATE ON add_ons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Atomic subscriber counter, used after a purchase ──────────
CREATE OR REPLACE FUNCTION increment_addon_subscribers(addon_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE add_ons SET subscribers = subscribers + 1 WHERE id = addon_id;
$$;

GRANT EXECUTE ON FUNCTION increment_addon_subscribers TO authenticated;

-- ── Seed catalog (mirrors the add-ons previously hardcoded in
--    GymSubscription.jsx so the marketplace isn't empty on first load) ──
INSERT INTO add_ons (name, key, description, icon, monthly_price, annual_price, category, sort_order)
VALUES
  ('WhatsApp Automation',  'whatsapp_automation', 'Automated reminders & campaigns', '💬', 499,  399,  'Communication',  0),
  ('AI Fitness Assistant', 'ai_assistant',        'Smart workout & diet plans',      '🤖', 999,  799,  'AI',             1),
  ('SMS Package',          'sms_package',         '1,000 SMS credits/month',         '📱', 299,  249,  'Communication',  2),
  ('White Label Branding', 'white_label',         'Your logo, your brand',           '🎨', 1999, 1599, 'Branding',       3),
  ('Additional Branch',    'extra_branch',        'One extra location',              '🏢', 999,  799,  'Infrastructure', 4),
  ('Extra Staff Seats',    'extra_staff',         '5 additional staff accounts',     '👥', 299,  249,  'Staff',          5),
  ('Custom Domain',        'custom_domain',       'members.yourgym.com',             '🌐', 599,  479,  'Branding',       6),
  ('Premium Support',      'premium_support',     '2-hour response SLA',             '🎧', 499,  399,  'Support',        7)
ON CONFLICT (key) DO NOTHING;

-- ── RLS ────────────────────────────────────────────────────────
-- Both tables are written exclusively through the GymManagmentAdmin
-- backend, which connects with the service-role key (bypasses RLS).
-- Policies below only matter if a client ever queries Supabase directly.
ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_add_ons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active add-ons" ON add_ons FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Super admins can view all add-ons" ON add_ons FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Gym staff can view own gym add-ons" ON gym_add_ons FOR SELECT
  USING (gym_id = get_my_gym_id());

CREATE POLICY "Super admins can view all gym add-ons" ON gym_add_ons FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin');
