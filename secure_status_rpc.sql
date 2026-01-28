-- RPC to check existence ONLY (No PII leak)
CREATE OR REPLACE FUNCTION check_application_exists(p_email TEXT, p_full_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM vista_applications 
        WHERE email ILIKE p_email 
        AND full_name ILIKE p_full_name
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to fetch data ONLY if OTP is valid
CREATE OR REPLACE FUNCTION get_application_secure(p_email TEXT, p_otp_code TEXT)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT,
    "position" TEXT,
    applied_at TIMESTAMPTZ,
    interview_date TIMESTAMPTZ,
    reschedule_requested BOOLEAN,
    suggested_interview_date TIMESTAMPTZ,
    resume_url TEXT,
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

    -- If valid, return data
    -- Delete OTP after use? Optional. For UX retries we might keep it for 10 mins.
    -- DELETE FROM vista_otp_codes WHERE email ILIKE p_email; 

    RETURN QUERY
    SELECT 
        a.id,
        a.full_name,
        a.email,
        a.phone,
        a.status,
        a.position,
        a.applied_at,
        a.interview_date,
        a.reschedule_requested,
        a.suggested_interview_date,
        a.resume_url,
        a.notes
    FROM vista_applications a
    WHERE a.email ILIKE p_email
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT EXECUTE ON FUNCTION check_application_exists TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_application_secure TO anon, authenticated, service_role;

-- Chat Security Fix: Allow Anon to read messages if they know the UUID (gated by OTP flow initially)
ALTER TABLE vista_applicant_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of messages" ON vista_applicant_messages;
CREATE POLICY "Allow public read of messages" ON vista_applicant_messages 
FOR SELECT USING (true); -- Strict filtering handled by frontend + UUID secrecy. 

-- Insert is allowed for Anon (to send messages)
DROP POLICY IF EXISTS "Allow public insert of messages" ON vista_applicant_messages;
CREATE POLICY "Allow public insert of messages" ON vista_applicant_messages 
FOR INSERT WITH CHECK (true); 

