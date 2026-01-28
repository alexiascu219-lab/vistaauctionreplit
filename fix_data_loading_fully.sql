-- 1. Ensure columns exist safely
DO $$
BEGIN
    -- Add reschedule_requested_by if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vista_applications' AND column_name = 'reschedule_requested_by') THEN
        ALTER TABLE vista_applications ADD COLUMN reschedule_requested_by TEXT;
    END IF;

    -- Add resume_data if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vista_applications' AND column_name = 'resume_data') THEN
        ALTER TABLE vista_applications ADD COLUMN resume_data TEXT;
    END IF;
END $$;

-- 2. Drop existing RPC
DROP FUNCTION IF EXISTS get_application_secure(text, text);

-- 3. Re-create RPC with SAFE JSON parsing
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
        -- Safe JSON Extraction
        CASE 
            WHEN a.notes IS NULL OR length(a.notes) < 2 THEN NULL 
            ELSE (a.notes::json->>'Job Type')::TEXT 
        END as jobType,
        CASE 
            WHEN a.notes IS NULL OR length(a.notes) < 2 THEN NULL 
            ELSE (a.notes::json->>'Shift Preference')::TEXT 
        END as preferredShift,
        
        a.applied_at,
        a.interview_date,
        a.reschedule_requested,
        a.reschedule_requested_by, -- Now guaranteed to exist
        a.suggested_interview_date,
        a.resume_url,
        a.resume_data, -- Now guaranteed to exist
        a.notes
    FROM vista_applications a
    WHERE a.email ILIKE p_email
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_application_secure TO anon, authenticated, service_role;
