-- MASTER SECURITY POLICY: Supabase Lockdown & Reschedule Handshake (FIXED v6)
-- Run this in your Supabase SQL Editor

-- 1. Ensure Dependencies Exist
CREATE TABLE IF NOT EXISTS training_courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('PDF', 'Video', 'Quiz')),
  required BOOLEAN DEFAULT FALSE,
  content_url TEXT,
  video_url TEXT,
  estimated_duration_minutes INTEGER DEFAULT 5,
  minimum_time_seconds INTEGER DEFAULT 180,
  quiz_required BOOLEAN DEFAULT FALSE,
  quiz_questions JSONB,
  passing_score INTEGER DEFAULT 80,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vista_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_email TEXT NOT NULL,
  course_name TEXT NOT NULL,
  status TEXT DEFAULT 'Assigned',
  assigned_at TIMESTAMP DEFAULT NOW(),
  time_spent_seconds INTEGER DEFAULT 0,
  scroll_progress INTEGER DEFAULT 0,
  video_watch_percentage INTEGER DEFAULT 0,
  quiz_score INTEGER,
  quiz_attempts INTEGER DEFAULT 0,
  engagement_checkpoints JSONB DEFAULT '[]',
  completion_verified BOOLEAN DEFAULT FALSE
);

-- 2. Schema Enhancements
ALTER TABLE vista_applications ADD COLUMN IF NOT EXISTS reschedule_requested_by TEXT;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE vista_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vista_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vista_training ENABLE ROW LEVEL SECURITY;

-- 4. Define Access Policies

-- HR Portal: Authenticated users (HR staff) have full access to manage everything
DROP POLICY IF EXISTS "HR_Staff_Full_Access" ON vista_applications;
CREATE POLICY "HR_Staff_Full_Access" ON vista_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "HR_Staff_Full_Access_Users" ON vista_employees;
CREATE POLICY "HR_Staff_Full_Access_Users" ON vista_employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "HR_Staff_Full_Access_Courses" ON training_courses;
CREATE POLICY "HR_Staff_Full_Access_Courses" ON training_courses FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "HR_Staff_Full_Access_Training" ON vista_training;
CREATE POLICY "HR_Staff_Full_Access_Training" ON vista_training FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public: Allow candidates to SUBMIT their initial application
DROP POLICY IF EXISTS "Public_Submit_Application" ON vista_applications;
CREATE POLICY "Public_Submit_Application" ON vista_applications 
    FOR INSERT TO anon WITH CHECK (true);

-- 5. Secure Handshake Functions (Security Definer)

-- Search Function
DROP FUNCTION IF EXISTS check_application_status(text, text);
CREATE OR REPLACE FUNCTION check_application_status(p_email TEXT, p_full_name TEXT) 
RETURNS TABLE (
    id UUID, 
    status TEXT, 
    applied_at TIMESTAMPTZ, 
    "position" TEXT,
    full_name TEXT,
    interview_date TIMESTAMPTZ,
    reschedule_requested BOOLEAN,
    suggested_interview_date TIMESTAMPTZ,
    reschedule_requested_by TEXT
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT 
        id::UUID,
        status, 
        COALESCE(applied_at, now()) as applied_at, 
        COALESCE(position, 'Applicant') as "position",
        full_name,
        interview_date,
        COALESCE(reschedule_requested, FALSE) as reschedule_requested,
        suggested_interview_date,
        reschedule_requested_by
    FROM vista_applications 
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
    AND (
        LOWER(full_name) ILIKE '%' || LOWER(TRIM(p_full_name)) || '%'
        OR LOWER(TRIM(p_full_name)) ILIKE '%' || LOWER(full_name) || '%'
    )
    LIMIT 1;
$$;

-- Request Reschedule
DROP FUNCTION IF EXISTS request_candidate_reschedule(UUID, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS request_candidate_reschedule(TEXT, TEXT, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION request_candidate_reschedule(p_app_id TEXT, p_email TEXT, p_suggested_date TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE vista_applications
    SET 
        suggested_interview_date = p_suggested_date,
        reschedule_requested_by = 'candidate',
        reschedule_requested = true
    WHERE id::text = p_app_id 
      AND LOWER(TRIM(email)) = LOWER(TRIM(p_email));
END;
$$;

-- Confirm Reschedule
DROP FUNCTION IF EXISTS confirm_candidate_reschedule(UUID, TEXT);
DROP FUNCTION IF EXISTS confirm_candidate_reschedule(TEXT, TEXT);
CREATE OR REPLACE FUNCTION confirm_candidate_reschedule(p_app_id TEXT, p_email TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE vista_applications
    SET 
        interview_date = suggested_interview_date,
        suggested_interview_date = NULL,
        reschedule_requested_by = NULL,
        reschedule_requested = false
    WHERE id::text = p_app_id 
      AND LOWER(TRIM(email)) = LOWER(TRIM(p_email))
      AND reschedule_requested_by = 'hr'; 
END;
$$;

-- 6. Grant Permissions
-- Generic Table permissions for HR staff
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Explicitly enable DELETE for authenticated
GRANT DELETE ON vista_applications TO authenticated;
GRANT DELETE ON vista_employees TO authenticated;

-- Public Access permissions (Anon)
GRANT SELECT ON vista_applications TO anon;
GRANT INSERT ON vista_applications TO anon;

-- Function Execution
GRANT EXECUTE ON FUNCTION check_application_status(text, text) TO anon;
GRANT EXECUTE ON FUNCTION request_candidate_reschedule(TEXT, TEXT, TIMESTAMPTZ) TO anon;
GRANT EXECUTE ON FUNCTION confirm_candidate_reschedule(TEXT, TEXT) TO anon;
