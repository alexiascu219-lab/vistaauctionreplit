-- Create the missing 'verify_applicant_status' RPC function
-- This function wraps the logic to return a JSON object { success: true, data: ... }
-- which matches exactly what StatusPage.jsx expects.

CREATE OR REPLACE FUNCTION verify_applicant_status(p_email TEXT, p_otp_code TEXT)
RETURNS JSONB AS $$
DECLARE
    v_app_record RECORD;
    v_valid_otp BOOLEAN;
BEGIN
    -- 1. Validate OTP
    SELECT EXISTS(
        SELECT 1 FROM vista_otp_codes
        WHERE email ILIKE p_email
        AND code = p_otp_code
        AND expires_at > NOW()
    ) INTO v_valid_otp;

    IF NOT v_valid_otp THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired OTP code.');
    END IF;

    -- 2. Fetch Application Data (Using the same logic as get_application_secure)
    SELECT 
        a.id,
        a.full_name,
        a.email,
        a.phone,
        a.status,
        a.position,
        a.job_type as "jobType",        -- Mapping to camelCase if needed
        a.preferred_shift as "preferredShift",
        a.applied_at,
        a.interview_date,
        a.reschedule_requested,
        a.reschedule_requested_by,
        a.suggested_interview_date,
        a.resume_url,
        a.notes
    INTO v_app_record
    FROM vista_applications a
    WHERE a.email ILIKE p_email
    LIMIT 1;

    IF v_app_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Application not found for this email.');
    END IF;

    -- 3. Return Success JSON
    RETURN jsonb_build_object(
        'success', true, 
        'data', row_to_json(v_app_record)
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION verify_applicant_status(TEXT, TEXT) TO anon, authenticated, service_role;
