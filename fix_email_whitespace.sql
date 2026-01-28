-- 1. CLEAN UP DATA: Remove hidden whitespace from emails
UPDATE vista_applications
SET email = TRIM(email);

-- 2. Update RPC to be whitespace aggressive
CREATE OR REPLACE FUNCTION get_application_secure(p_email TEXT, p_otp_code TEXT)
RETURNS SETOF vista_applications AS $$
DECLARE
    v_valid_otp BOOLEAN;
BEGIN
    -- Verify OTP
    SELECT EXISTS(
        SELECT 1 FROM vista_otp_codes
        WHERE TRIM(email) ILIKE TRIM(p_email)
        AND code = p_otp_code
        AND expires_at > NOW()
    ) INTO v_valid_otp;

    IF NOT v_valid_otp THEN
        RAISE EXCEPTION 'Invalid or Expired OTP';
    END IF;

    -- Return Data (Whitespace insensitive)
    RETURN QUERY
    SELECT *
    FROM vista_applications
    WHERE TRIM(email) ILIKE TRIM(p_email)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
