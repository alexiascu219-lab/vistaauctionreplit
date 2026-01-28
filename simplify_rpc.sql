-- EMERGENCY DEBUG: Simplify RPC to match Table Schema exactly
-- This removes likely "Column Mismatch" errors.

DROP FUNCTION IF EXISTS get_application_secure(text, text);

CREATE OR REPLACE FUNCTION get_application_secure(p_email TEXT, p_otp_code TEXT)
RETURNS SETOF vista_applications AS $$
DECLARE
    v_valid_otp BOOLEAN;
BEGIN
    -- 1. Security Check
    SELECT EXISTS(
        SELECT 1 FROM vista_otp_codes
        WHERE email ILIKE p_email
        AND code = p_otp_code
        AND expires_at > NOW()
    ) INTO v_valid_otp;

    IF NOT v_valid_otp THEN
        RAISE EXCEPTION 'Invalid or Expired OTP';
    END IF;

    -- 2. Return Raw Table Data (Matches Schema 1:1)
    RETURN QUERY
    SELECT *
    FROM vista_applications
    WHERE email ILIKE p_email
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT EXECUTE ON FUNCTION get_application_secure TO anon, authenticated, service_role;
