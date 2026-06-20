-- ============================================================
-- Migration 007: Professional Tier Features
--   - Invoice generation, payment history, supplement stock
-- ============================================================

-- ── 1. Flag the 3 new features on existing subscription plans ──
UPDATE subscription_plans
SET features = features || '{"invoice_generation": false, "payment_history": false, "supplement_stock": false}'::jsonb
WHERE name IN ('Free Trial', 'Starter');

UPDATE subscription_plans
SET features = features || '{"invoice_generation": true, "payment_history": true, "supplement_stock": true}'::jsonb
WHERE name IN ('Professional', 'Enterprise');

-- ── 2. Supplement stock tables ───────────────────────────────
CREATE TABLE IF NOT EXISTS supplements (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id               UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  category             TEXT,
  unit                 TEXT        NOT NULL DEFAULT 'pcs',
  cost_price           DECIMAL(10,2),
  selling_price        DECIMAL(10,2) NOT NULL,
  quantity             INTEGER     NOT NULL DEFAULT 0,
  low_stock_threshold  INTEGER     NOT NULL DEFAULT 5,
  description          TEXT,
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplements_gym_id ON supplements(gym_id);

CREATE TABLE IF NOT EXISTS supplement_transactions (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id            UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  supplement_id     UUID        NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
  type              TEXT        NOT NULL CHECK (type IN ('Add', 'Sell')),
  quantity          INTEGER     NOT NULL CHECK (quantity > 0),
  price_per_unit    DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  student_id        UUID        REFERENCES students(id) ON DELETE SET NULL,
  notes             TEXT,
  recorded_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
  transaction_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplement_txn_gym_id ON supplement_transactions(gym_id);
CREATE INDEX IF NOT EXISTS idx_supplement_txn_supplement_id ON supplement_transactions(supplement_id);
CREATE INDEX IF NOT EXISTS idx_supplement_txn_date ON supplement_transactions(transaction_date);

DROP TRIGGER IF EXISTS trg_supplements_updated_at ON supplements;
CREATE TRIGGER trg_supplements_updated_at
  BEFORE UPDATE ON supplements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 3. Atomic stock-adjusting RPC ────────────────────────────
-- Runs the quantity update + transaction insert as a single statement so
-- stock counts can never drift out of sync with the transaction log.
CREATE OR REPLACE FUNCTION record_supplement_transaction(
  p_gym_id UUID,
  p_supplement_id UUID,
  p_type TEXT,
  p_quantity INTEGER,
  p_price_per_unit DECIMAL,
  p_student_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL,
  p_transaction_date DATE DEFAULT CURRENT_DATE
)
RETURNS supplement_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_qty INTEGER;
  v_txn supplement_transactions;
BEGIN
  IF p_gym_id != get_my_gym_id() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_type NOT IN ('Add', 'Sell') THEN
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  SELECT quantity INTO v_current_qty
  FROM supplements
  WHERE id = p_supplement_id AND gym_id = p_gym_id
  FOR UPDATE;

  IF v_current_qty IS NULL THEN
    RAISE EXCEPTION 'Supplement not found';
  END IF;

  IF p_type = 'Sell' AND v_current_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Only % unit(s) left', v_current_qty;
  END IF;

  UPDATE supplements
  SET quantity = quantity + CASE WHEN p_type = 'Add' THEN p_quantity ELSE -p_quantity END
  WHERE id = p_supplement_id;

  INSERT INTO supplement_transactions (
    gym_id, supplement_id, type, quantity, price_per_unit, total_amount,
    student_id, notes, recorded_by, transaction_date
  )
  VALUES (
    p_gym_id, p_supplement_id, p_type, p_quantity, p_price_per_unit,
    p_price_per_unit * p_quantity, p_student_id, p_notes, p_recorded_by, p_transaction_date
  )
  RETURNING * INTO v_txn;

  RETURN v_txn;
END;
$$;

GRANT EXECUTE ON FUNCTION record_supplement_transaction TO authenticated;

-- ── 4. RLS ────────────────────────────────────────────────────
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gym staff can view supplements" ON supplements FOR SELECT
  USING (gym_id = get_my_gym_id());

CREATE POLICY "Admin Manager can manage supplements" ON supplements FOR INSERT
  WITH CHECK (gym_id = get_my_gym_id() AND is_admin_or_manager());

CREATE POLICY "Admin Manager can update supplements" ON supplements FOR UPDATE
  USING (gym_id = get_my_gym_id() AND is_admin_or_manager());

CREATE POLICY "Admin Manager can delete supplements" ON supplements FOR DELETE
  USING (gym_id = get_my_gym_id() AND is_admin_or_manager());

CREATE POLICY "Gym staff can view supplement transactions" ON supplement_transactions FOR SELECT
  USING (gym_id = get_my_gym_id());

-- INSERT/UPDATE/DELETE intentionally have no policies: all writes go through
-- the record_supplement_transaction() SECURITY DEFINER function above.
