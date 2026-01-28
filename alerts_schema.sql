-- ==============================================================================
-- SYSTEM SETTINGS & ALERTS SCHEMA
-- Purpose: Global key-value store for app-wide settings (e.g., Weather Alerts).
-- ==============================================================================

-- 1. Create Table
CREATE TABLE IF NOT EXISTS vista_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Seed Initial Data (Weather Alert)
INSERT INTO vista_settings (key, value)
VALUES 
    ('system_alert', '{"active": false, "message": "Vista Auction will be closed tomorrow due to severe weather.", "level": "warning"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Enable RLS
ALTER TABLE vista_settings ENABLE ROW LEVEL SECURITY;

-- 4. Policies

-- Everyone (Anon + Authenticated) can READ settings (for the popup)
CREATE POLICY "Public Read Settings" ON vista_settings
FOR SELECT TO public
USING (true);

-- Only Admins/Managers can UPDATE settings
CREATE POLICY "Admin Update Settings" ON vista_settings
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM vista_employees 
        WHERE email = auth.jwt()->>'email' 
        AND role IN ('manager', 'Super Admin')
    )
);

-- Verification
SELECT * FROM vista_settings;
