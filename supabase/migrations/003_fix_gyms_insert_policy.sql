-- Fix: Ensure gyms INSERT policy exists so new gym owners can register.
-- The initial migration may not have been fully applied on the live instance.

DROP POLICY IF EXISTS "Service role can insert gym" ON gyms;

CREATE POLICY "Service role can insert gym"
  ON gyms FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);
