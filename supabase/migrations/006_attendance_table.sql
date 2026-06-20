-- Attendance table: tracks daily check-in/check-out per student per gym
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_at TIMESTAMPTZ,
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate check-ins for the same student on the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_student_date
  ON attendance (student_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_gym_date
  ON attendance (gym_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_student_id
  ON attendance (student_id);

-- RLS: users belong to a gym via the public.users table (auth_id = auth.uid())
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gym staff can view attendance"
  ON attendance FOR SELECT
  USING (
    gym_id IN (
      SELECT gym_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Gym staff can insert attendance"
  ON attendance FOR INSERT
  WITH CHECK (
    gym_id IN (
      SELECT gym_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Gym staff can update attendance"
  ON attendance FOR UPDATE
  USING (
    gym_id IN (
      SELECT gym_id FROM public.users WHERE auth_id = auth.uid()
    )
  );
