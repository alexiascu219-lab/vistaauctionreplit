-- FIX: Grant INSERT permissions for settings (Upsert requires Insert + Update)
-- Also ensuring the table exists and has proper initial data.

CREATE TABLE IF NOT EXISTS vista_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Ensure RLS is on
ALTER TABLE vista_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Admin Update Settings" ON vista_settings;
DROP POLICY IF EXISTS "Public Read Settings" ON vista_settings;
DROP POLICY IF EXISTS "Admin Manage Settings" ON vista_settings;

-- 1. READ: Everyone can read
CREATE POLICY "Public Read Settings" ON vista_settings
FOR SELECT TO public
USING (true);

-- 2. ALL (Insert/Update/Delete): Managers/Admins only
CREATE POLICY "Admin Manage Settings" ON vista_settings
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM vista_employees 
        WHERE email = auth.jwt()->>'email' 
        AND role IN ('manager', 'owner', 'Super Admin')
    )
);

-- Seed defaults just in case
INSERT INTO vista_settings (key, value)
VALUES 
    ('system_alert', '{"active": false, "message": "Vista Auction will be closed tomorrow due to severe weather.", "level": "info"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
