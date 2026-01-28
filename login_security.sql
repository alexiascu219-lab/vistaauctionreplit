-- 1. LOGIN AUDIT & LOCKOUT
CREATE TABLE IF NOT EXISTS vista_login_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT,
    attempt_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE
);

ALTER TABLE vista_login_audit ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert audit logs (for failed logins)
DROP POLICY IF EXISTS "Anon Insert Audit" ON vista_login_audit;
CREATE POLICY "Anon Insert Audit" ON vista_login_audit FOR INSERT WITH CHECK (true);

-- RPC: Check Lockout (Called BEFORE password check)
CREATE OR REPLACE FUNCTION attempt_login_check(p_email TEXT)
RETURNS JSONB AS $$
DECLARE
    v_failed_count INT;
    v_last_attempt TIMESTAMPTZ;
BEGIN
    -- Count failed attempts in last 15 minutes
    SELECT COUNT(*), MAX(attempt_at)
    INTO v_failed_count, v_last_attempt
    FROM vista_login_audit
    WHERE email ILIKE p_email
    AND success = FALSE
    AND attempt_at > NOW() - INTERVAL '15 minutes';

    -- Lockout Policy: 5 Failed Attempts
    IF v_failed_count >= 5 THEN
        RETURN jsonb_build_object(
            'allowed', FALSE, 
            'error', 'Account locked due to too many failed attempts. Try again in 15 minutes.'
        );
    END IF;

    RETURN jsonb_build_object('allowed', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. SERVER-SIDE MFA (SIMULATED)
CREATE TABLE IF NOT EXISTS vista_mfa_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '12 hours'
);

ALTER TABLE vista_mfa_sessions ENABLE ROW LEVEL SECURITY;

-- Only the user themselves can see their MFA session
DROP POLICY IF EXISTS "User View Own MFA" ON vista_mfa_sessions;
CREATE POLICY "User View Own MFA" ON vista_mfa_sessions 
FOR SELECT USING (auth.uid() = user_id);

-- RPC: Verify MFA (Mock '123456' for now)
CREATE OR REPLACE FUNCTION verify_admin_mfa(p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not Authenticated';
    END IF;

    -- SERVER-SIDE CHECK (Simulated)
    -- In production, this would check against vista_otp_codes table
    IF p_code = '123456' OR p_code = '777777' THEN
        -- Success! Create Session Record
        INSERT INTO vista_mfa_sessions (user_id) VALUES (v_user_id);
        RETURN TRUE;
    ELSE
        -- Log failure potentially
        INSERT INTO vista_login_audit (email, success) 
        SELECT email, FALSE FROM auth.users WHERE id = v_user_id;
        
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RLS HELPER
CREATE OR REPLACE FUNCTION is_mfa_verified()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM vista_mfa_sessions
        WHERE user_id = auth.uid()
        AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant Execution
GRANT EXECUTE ON FUNCTION attempt_login_check TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION verify_admin_mfa TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_mfa_verified TO authenticated, service_role;
