-- ============================================================
-- GYM MANAGEMENT SAAS - COMPLETE DATABASE SCHEMA
-- PostgreSQL / Supabase
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('Admin', 'Manager', 'Trainer');
CREATE TYPE payment_method AS ENUM ('Cash', 'QR');
CREATE TYPE package_type AS ENUM ('Monthly', 'Quarterly', 'Half Year', 'Yearly', 'Special Category');
CREATE TYPE expense_category AS ENUM ('Rent', 'Electricity', 'Equipment', 'Maintenance', 'Marketing', 'Misc');
CREATE TYPE verification_status AS ENUM ('Pending', 'Approved', 'Rejected');
CREATE TYPE notification_target AS ENUM ('Admin', 'Manager', 'Trainer', 'All');
CREATE TYPE salary_payment_type AS ENUM ('Cash', 'Bank Transfer', 'UPI');

-- ============================================================
-- TABLE: gyms
-- ============================================================

CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_name TEXT NOT NULL,
  gym_logo TEXT,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  payment_qr TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  subscription_plan TEXT DEFAULT 'basic',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: users (Staff - Admin/Manager/Trainer)
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'Trainer',
  is_active BOOLEAN DEFAULT TRUE,
  avatar TEXT,
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, gym_id)
);

-- ============================================================
-- TABLE: packages
-- ============================================================

CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type package_type NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: students
-- ============================================================

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  image TEXT,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  membership_expiry DATE,
  trainer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verification_status verification_status NOT NULL DEFAULT 'Pending',
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT FALSE,
  payment_type payment_method,
  amount_paid DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: payments
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  received_by UUID REFERENCES users(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_note TEXT,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: expenses
-- ============================================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category expense_category NOT NULL DEFAULT 'Misc',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  receipt_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: trainer_salary
-- ============================================================

CREATE TABLE trainer_salary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  salary_amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_type salary_payment_type NOT NULL DEFAULT 'Cash',
  paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: verification_requests
-- ============================================================

CREATE TABLE verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status verification_status NOT NULL DEFAULT 'Pending',
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: notifications
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_role notification_target NOT NULL DEFAULT 'All',
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  notification_type TEXT DEFAULT 'general',
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================

CREATE INDEX idx_users_gym_id ON users(gym_id);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_students_gym_id ON students(gym_id);
CREATE INDEX idx_students_trainer_id ON students(trainer_id);
CREATE INDEX idx_students_verification ON students(verification_status);
CREATE INDEX idx_students_expiry ON students(membership_expiry);
CREATE INDEX idx_payments_gym_id ON payments(gym_id);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_expenses_gym_id ON expenses(gym_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_trainer_salary_gym_id ON trainer_salary(gym_id);
CREATE INDEX idx_notifications_gym_id ON notifications(gym_id);
CREATE INDEX idx_notifications_user ON notifications(target_user_id);
CREATE INDEX idx_verification_gym_id ON verification_requests(gym_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gyms_updated_at BEFORE UPDATE ON gyms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_requests_updated_at BEFORE UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Auto-activate student after approval
CREATE OR REPLACE FUNCTION handle_student_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
    UPDATE students
    SET is_active = TRUE,
        verification_status = 'Approved',
        verified_by = NEW.verified_by,
        verified_at = NOW()
    WHERE id = NEW.student_id;
  END IF;
  IF NEW.status = 'Rejected' AND OLD.status != 'Rejected' THEN
    UPDATE students
    SET verification_status = 'Rejected'
    WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_verification_status_change
  AFTER UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION handle_student_verification();

-- Function: Create verification request when student added (trainer-added only)
CREATE OR REPLACE FUNCTION create_verification_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status = 'Pending' THEN
    INSERT INTO verification_requests (gym_id, student_id, trainer_id, status)
    VALUES (NEW.gym_id, NEW.id, NEW.created_by, 'Pending');
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_student_insert
  AFTER INSERT ON students
  FOR EACH ROW EXECUTE FUNCTION create_verification_request();

-- Function: get dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_gym_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  current_month_start DATE := DATE_TRUNC('month', CURRENT_DATE);
  current_month_end DATE := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
BEGIN
  SELECT json_build_object(
    'total_students', (SELECT COUNT(*) FROM students WHERE gym_id = p_gym_id),
    'active_students', (SELECT COUNT(*) FROM students WHERE gym_id = p_gym_id AND is_active = TRUE),
    'revenue_this_month', COALESCE((
      SELECT SUM(amount) FROM payments
      WHERE gym_id = p_gym_id
      AND payment_date BETWEEN current_month_start AND current_month_end
    ), 0),
    'expense_this_month', COALESCE((
      SELECT SUM(amount) FROM expenses
      WHERE gym_id = p_gym_id
      AND expense_date BETWEEN current_month_start AND current_month_end
    ), 0),
    'salary_this_month', COALESCE((
      SELECT SUM(salary_amount) FROM trainer_salary
      WHERE gym_id = p_gym_id
      AND payment_date BETWEEN current_month_start AND current_month_end
    ), 0),
    'pending_verification', (
      SELECT COUNT(*) FROM verification_requests
      WHERE gym_id = p_gym_id AND status = 'Pending'
    ),
    'expired_memberships', (
      SELECT COUNT(*) FROM students
      WHERE gym_id = p_gym_id AND is_active = TRUE AND membership_expiry < CURRENT_DATE
    ),
    'expiring_7_days', (
      SELECT COUNT(*) FROM students
      WHERE gym_id = p_gym_id AND is_active = TRUE
      AND membership_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    ),
    'expiring_3_days', (
      SELECT COUNT(*) FROM students
      WHERE gym_id = p_gym_id AND is_active = TRUE
      AND membership_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
    ),
    'trainer_count', (
      SELECT COUNT(*) FROM users
      WHERE gym_id = p_gym_id AND role = 'Trainer' AND is_active = TRUE
    ),
    'manager_count', (
      SELECT COUNT(*) FROM users
      WHERE gym_id = p_gym_id AND role = 'Manager' AND is_active = TRUE
    )
  ) INTO result;
  RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function: get monthly revenue chart data
CREATE OR REPLACE FUNCTION get_monthly_revenue(p_gym_id UUID, p_months INTEGER DEFAULT 6)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(monthly_data ORDER BY month_start) INTO result
  FROM (
    SELECT
      TO_CHAR(DATE_TRUNC('month', payment_date), 'Mon') as month_label,
      DATE_TRUNC('month', payment_date) as month_start,
      COALESCE(SUM(amount), 0) as revenue
    FROM payments
    WHERE gym_id = p_gym_id
    AND payment_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' * (p_months - 1)
    GROUP BY DATE_TRUNC('month', payment_date)
  ) monthly_data;
  RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ============================================================
-- DEFAULT PACKAGES INSERT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION create_default_packages(p_gym_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO packages (gym_id, name, type, price, duration_days) VALUES
    (p_gym_id, 'Monthly Membership', 'Monthly', 800.00, 30),
    (p_gym_id, 'Quarterly Membership', 'Quarterly', 2100.00, 90),
    (p_gym_id, 'Half Year Membership', 'Half Year', 3600.00, 180),
    (p_gym_id, 'Yearly Membership', 'Yearly', 6000.00, 365),
    (p_gym_id, 'Special Category', 'Special Category', 500.00, 30);
END;
$$ language 'plpgsql' SECURITY DEFINER;
