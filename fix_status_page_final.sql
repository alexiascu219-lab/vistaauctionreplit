-- 1. Defensively ADD COLUMNS (Safe to run multiple times)
DO $$
BEGIN
    BEGIN
        ALTER TABLE vista_applications ADD COLUMN reschedule_requested_by TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE vista_applications ADD COLUMN resume_data TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE vista_applications ADD COLUMN job_type TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE vista_applications ADD COLUMN preferred_shift TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- 2. Drop existing RPC to avoid return type conflicts
DROP FUNCTION IF EXISTS get_application_secure(text, text);

-- 3. Create RPC with SUPER SAFE selection
CREATE OR REPLACE FUNCTION get_application_secure(p_email TEXT, p_otp_code TEXT)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT,
    "position" TEXT,
    jobType TEXT, 
    preferredShift TEXT, 
    applied_at TIMESTAMPTZ,
    interview_date TIMESTAMPTZ,
    reschedule_requested BOOLEAN,
    reschedule_requested_by TEXT, 
    suggested_interview_date TIMESTAMPTZ,
    resume_url TEXT,
    resume_data TEXT, 
    notes TEXT
) AS $$
DECLARE
    v_valid_otp BOOLEAN;
BEGIN
    -- Verify OTP
    SELECT EXISTS(
        SELECT 1 FROM vista_otp_codes
        WHERE email ILIKE p_email
        AND code = p_otp_code
        AND expires_at > NOW()
    ) INTO v_valid_otp;

    IF NOT v_valid_otp THEN
        RAISE EXCEPTION 'Invalid or Expired OTP';
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        a.full_name,
        a.email,
        a.phone,
        a.status,
        a.position,
        -- Robust JSON Parsing: Only try parsing if it starts with {
        CASE 
            WHEN a.notes LIKE '{%' THEN (a.notes::json->>'Job Type')::TEXT
            ELSE NULL 
        END as jobType,
        CASE 
            WHEN a.notes LIKE '{%' THEN (a.notes::json->>'Shift Preference')::TEXT
            ELSE NULL 
        END as preferredShift,
        
        a.applied_at,
        a.interview_date,
        a.reschedule_requested,
        -- Select simple columns, we ensured they exist above
        a.reschedule_requested_by,
        a.suggested_interview_date,
        a.resume_url,
        a.resume_data,
        a.notes
    FROM vista_applications a
    WHERE a.email ILIKE p_email
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_application_secure TO anon, authenticated, service_role;
