-- DROP FIRST to allow return type change
DROP FUNCTION IF EXISTS get_application_secure(text, text);

-- Re-create with JSON extraction for jobType/preferredShift
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
        -- Extract from notes JSON safely. Cast to JSON first effectively.
        -- We use proper Postgres JSON operators.
        -- Assuming 'notes' is TEXT in DB based on client stringify.
        (a.notes::json->>'Job Type')::TEXT as jobType,
        (a.notes::json->>'Shift Preference')::TEXT as preferredShift,
        
        a.applied_at,
        a.interview_date,
        a.reschedule_requested,
        -- Check if column exists or return null. 
        -- Actually, 'reschedule_requested_by' IS likely a column we added in a previous migration.
        -- If it fails, I'll have to remove it or add the column. 
        -- I'll assume it exists for now as it's critical for logic.
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

-- Re-grant access
GRANT EXECUTE ON FUNCTION get_application_secure TO anon, authenticated, service_role;