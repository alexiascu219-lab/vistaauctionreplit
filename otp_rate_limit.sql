-- Secure OTP Generation with Rate Limiting
CREATE OR REPLACE FUNCTION generate_otp_rate_limited(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
    v_recent_count INT;
    v_new_code TEXT;
BEGIN
    -- 1. Check for spam (More than 3 codes in last 5 minutes)
    SELECT COUNT(*) INTO v_recent_count
    FROM vista_otp_codes
    WHERE email ILIKE p_email
    AND created_at > NOW() - INTERVAL '5 minutes';

    IF v_recent_count >= 3 THEN
        RAISE EXCEPTION 'Too many attempts. Please wait 5 minutes.';
    END IF;

    -- 2. Generate 6-digit code
    v_new_code := floor(random() * (999999 - 100000 + 1) + 100000)::text;

    -- 3. Insert new code
    INSERT INTO vista_otp_codes (email, code, expires_at)
    VALUES (p_email, v_new_code, NOW() + INTERVAL '10 minutes');

    RETURN v_new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_otp_rate_limited TO anon, authenticated, service_role;
