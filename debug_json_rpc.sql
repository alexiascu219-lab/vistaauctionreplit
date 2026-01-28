-- DEBUG RPC: Returns JSON to prove execution path
DROP FUNCTION IF EXISTS get_application_secure(text, text);

CREATE OR REPLACE FUNCTION get_application_secure(p_email TEXT, p_otp_code TEXT)
RETURNS JSON AS $$
DECLARE
    v_valid_otp BOOLEAN;
    v_record RECORD;
BEGIN
    -- 1. Security Check
    SELECT EXISTS(
        SELECT 1 FROM vista_otp_codes
        WHERE TRIM(email) ILIKE TRIM(p_email)
        AND code = p_otp_code
        AND expires_at > NOW()
    ) INTO v_valid_otp;

    IF NOT v_valid_otp THEN
        RETURN json_build_object('error', 'INVALID_OTP');
    END IF;

    -- 2. Fetch Data
    SELECT * INTO v_record
    FROM vista_applications
    WHERE TRIM(email) ILIKE TRIM(p_email)
    LIMIT 1;

    IF FOUND THEN
        RETURN row_to_json(v_record);
    ELSE
        RETURN json_build_object(
            'error', 'USER_NOT_FOUND',
            'debug_email_received', p_email,
            'debug_trim_check', (SELECT count(*) FROM vista_applications WHERE TRIM(email) ILIKE TRIM(p_email))
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_application_secure TO anon, authenticated, service_role;
