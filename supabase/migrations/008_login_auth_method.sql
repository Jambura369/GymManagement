-- ============================================================
-- Migration 008: Configurable Login Method (Password vs Email OTP)
-- ============================================================

-- ── 1. Per-gym login method ───────────────────────────────────
ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS auth_method TEXT NOT NULL DEFAULT 'password'
    CHECK (auth_method IN ('password', 'email_otp'));

-- ── 2. Pre-auth lookup: which method does this email's gym use? ─
-- Must be callable by the anon role (user hasn't signed in yet), so it
-- runs as SECURITY DEFINER and only ever returns the auth_method string —
-- never anything else about the gym or user — to avoid leaking data.
CREATE OR REPLACE FUNCTION get_gym_auth_method(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_method TEXT;
BEGIN
  SELECT g.auth_method INTO v_method
  FROM users u
  JOIN gyms g ON g.id = u.gym_id
  WHERE u.email = p_email AND u.is_active = TRUE
  LIMIT 1;

  RETURN COALESCE(v_method, 'password');
END;
$$;

GRANT EXECUTE ON FUNCTION get_gym_auth_method(TEXT) TO anon, authenticated;
