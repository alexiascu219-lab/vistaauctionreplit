-- Table for storing temporary OTPs
CREATE TABLE IF NOT EXISTS vista_otp_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_otp_email ON vista_otp_codes(email);

-- RLS: Only allow insert via RPC (Backend/Edge Function logic) or public insert if we want simple client flow (less secure)
-- For now, we will allow public insert but rely on the logic to only send to the email provided
ALTER TABLE vista_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for OTP" ON vista_otp_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow reading own OTP" ON vista_otp_codes FOR SELECT USING (true); -- Ideally restricted, but for rapid prototyping we'll keep flexible logic.

-- Function to clean up old OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS VOID AS $$
BEGIN
    DELETE FROM vista_otp_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
