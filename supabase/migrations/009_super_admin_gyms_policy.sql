-- Fix: Super admin (web admin panel) sees an empty Gym Management list.
--
-- The only SELECT policy on `gyms` is "Users can view own gym", which matches
-- via get_my_gym_id() — a lookup against the `users` table (mobile app staff).
-- The super_admin account is an auth user with role stored in its JWT
-- user_metadata (set at signup by create-admin.mjs) — there is no `profiles`
-- table on this database, so get_my_gym_id() returns NULL for it and the
-- gym list comes back empty even though gyms exist.
--
-- This adds an additional permissive SELECT policy so any authenticated
-- user whose JWT user_metadata.role = 'super_admin' can read all gyms,
-- without touching the existing gym-owner policy.

DROP POLICY IF EXISTS "Super admins can view all gyms" ON gyms;

CREATE POLICY "Super admins can view all gyms"
  ON gyms FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );
