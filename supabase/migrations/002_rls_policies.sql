-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- GYM MANAGEMENT SAAS
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_salary ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get current user's gym_id
CREATE OR REPLACE FUNCTION get_my_gym_id()
RETURNS UUID AS $$
  SELECT gym_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current user's id
CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if admin or manager
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT role IN ('Admin', 'Manager') FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'Admin' FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- GYMS TABLE POLICIES
-- ============================================================

-- Users can read their own gym
CREATE POLICY "Users can view own gym"
  ON gyms FOR SELECT
  USING (id = get_my_gym_id());

-- Only admins can update gym
CREATE POLICY "Admin can update own gym"
  ON gyms FOR UPDATE
  USING (id = get_my_gym_id() AND is_admin());

-- Anyone can insert during registration (handled via service role in registration flow)
CREATE POLICY "Service role can insert gym"
  ON gyms FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================
-- USERS TABLE POLICIES
-- ============================================================

-- Users can see all users in their gym
CREATE POLICY "Users can view gym members"
  ON users FOR SELECT
  USING (gym_id = get_my_gym_id());

-- Allow self-registration (new gym owner inserting their own record)
CREATE POLICY "Allow self registration"
  ON users FOR INSERT
  WITH CHECK (auth_id = auth.uid());

-- Admin/Manager can insert new users (staff)
CREATE POLICY "Admin Manager can add users"
  ON users FOR INSERT
  WITH CHECK (gym_id = get_my_gym_id() AND is_admin_or_manager());

-- Admin/Manager can update users
CREATE POLICY "Admin Manager can update users"
  ON users FOR UPDATE
  USING (gym_id = get_my_gym_id() AND is_admin_or_manager());

-- Only Admin can delete users
CREATE POLICY "Admin can delete users"
  ON users FOR DELETE
  USING (gym_id = get_my_gym_id() AND is_admin());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth_id = auth.uid());

-- ============================================================
-- PACKAGES TABLE POLICIES
-- ============================================================

-- All gym members can view packages
CREATE POLICY "Gym members can view packages"
  ON packages FOR SELECT
  USING (gym_id = get_my_gym_id());

-- Admin/Manager can manage packages
CREATE POLICY "Admin Manager can manage packages"
  ON packages FOR ALL
  USING (gym_id = get_my_gym_id() AND is_admin_or_manager());

-- ============================================================
-- STUDENTS TABLE POLICIES
-- ============================================================

-- All gym members can view students
CREATE POLICY "Gym members can view students"
  ON students FOR SELECT
  USING (gym_id = get_my_gym_id());

-- Trainers can add students (their own gym)
CREATE POLICY "Trainers can add students"
  ON students FOR INSERT
  WITH CHECK (gym_id = get_my_gym_id());

-- Admin/Manager can update any student; Trainer only their own
CREATE POLICY "Admin Manager can update students"
  ON students FOR UPDATE
  USING (
    gym_id = get_my_gym_id() AND (
      is_admin_or_manager() OR trainer_id = get_my_user_id()
    )
  );

-- Only Admin can delete students
CREATE POLICY "Admin can delete students"
  ON students FOR DELETE
  USING (gym_id = get_my_gym_id() AND is_admin());

-- ============================================================
-- PAYMENTS TABLE POLICIES
-- ============================================================

-- Admin/Manager can see all payments; Trainer sees own
CREATE POLICY "View payments by role"
  ON payments FOR SELECT
  USING (
    gym_id = get_my_gym_id() AND (
      is_admin_or_manager() OR received_by = get_my_user_id()
    )
  );

-- All gym staff can insert payments
CREATE POLICY "Gym staff can insert payments"
  ON payments FOR INSERT
  WITH CHECK (gym_id = get_my_gym_id());

-- Only Admin/Manager can update/delete payments
CREATE POLICY "Admin Manager can modify payments"
  ON payments FOR UPDATE
  USING (gym_id = get_my_gym_id() AND is_admin_or_manager());

CREATE POLICY "Admin can delete payments"
  ON payments FOR DELETE
  USING (gym_id = get_my_gym_id() AND is_admin());

-- ============================================================
-- EXPENSES TABLE POLICIES
-- ============================================================

-- Admin/Manager can view all expenses
CREATE POLICY "Admin Manager can view expenses"
  ON expenses FOR SELECT
  USING (gym_id = get_my_gym_id() AND is_admin_or_manager());

-- Admin/Manager can manage expenses
CREATE POLICY "Admin Manager can manage expenses"
  ON expenses FOR INSERT
  WITH CHECK (gym_id = get_my_gym_id() AND is_admin_or_manager());

CREATE POLICY "Admin Manager can update expenses"
  ON expenses FOR UPDATE
  USING (gym_id = get_my_gym_id() AND is_admin_or_manager());

CREATE POLICY "Admin can delete expenses"
  ON expenses FOR DELETE
  USING (gym_id = get_my_gym_id() AND is_admin());

-- ============================================================
-- TRAINER SALARY TABLE POLICIES
-- ============================================================

-- Admin/Manager can view all salaries; Trainer sees own
CREATE POLICY "View salary by role"
  ON trainer_salary FOR SELECT
  USING (
    gym_id = get_my_gym_id() AND (
      is_admin_or_manager() OR trainer_id = get_my_user_id()
    )
  );

-- Only Admin/Manager can pay salary
CREATE POLICY "Admin Manager can pay salary"
  ON trainer_salary FOR INSERT
  WITH CHECK (gym_id = get_my_gym_id() AND is_admin_or_manager());

-- ============================================================
-- VERIFICATION REQUESTS POLICIES
-- ============================================================

-- All gym staff can view verification requests
CREATE POLICY "Gym staff can view verifications"
  ON verification_requests FOR SELECT
  USING (gym_id = get_my_gym_id());

-- Any staff can create (auto-created by trigger)
CREATE POLICY "Allow insert verifications"
  ON verification_requests FOR INSERT
  WITH CHECK (gym_id = get_my_gym_id());

-- Admin/Manager can update (approve/reject)
CREATE POLICY "Admin Manager can approve verifications"
  ON verification_requests FOR UPDATE
  USING (gym_id = get_my_gym_id() AND is_admin_or_manager());

-- ============================================================
-- NOTIFICATIONS POLICIES
-- ============================================================

-- Users see notifications for their gym + their role or user-specific
CREATE POLICY "View own notifications"
  ON notifications FOR SELECT
  USING (
    gym_id = get_my_gym_id() AND (
      target_user_id = get_my_user_id()
      OR target_user_id IS NULL
      OR target_role = 'All'
      OR target_role::TEXT = get_my_role()
    )
  );

-- Admin/Manager can insert notifications
CREATE POLICY "Admin Manager can send notifications"
  ON notifications FOR INSERT
  WITH CHECK (gym_id = get_my_gym_id() AND is_admin_or_manager());

-- Users can mark own notifications as read
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (
    gym_id = get_my_gym_id() AND (
      target_user_id = get_my_user_id() OR is_admin_or_manager()
    )
  );

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Run in Supabase Dashboard > Storage
-- Create buckets: gym-logos, student-images, payment-qr, receipts

-- Storage policies are managed via Supabase Dashboard
-- or via the following SQL if using postgres directly:

INSERT INTO storage.buckets (id, name, public) VALUES
  ('gym-logos', 'gym-logos', TRUE),
  ('student-images', 'student-images', FALSE),
  ('payment-qr', 'payment-qr', FALSE),
  ('receipts', 'receipts', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to storage
CREATE POLICY "Authenticated users can upload gym logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gym-logos');

CREATE POLICY "Public can view gym logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'gym-logos');

CREATE POLICY "Authenticated users can upload student images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'student-images');

CREATE POLICY "Authenticated users can view student images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'student-images');

CREATE POLICY "Authenticated users can upload payment qr"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-qr');

CREATE POLICY "Authenticated users can view payment qr"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-qr');

CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can view receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (auth.uid() = owner);
