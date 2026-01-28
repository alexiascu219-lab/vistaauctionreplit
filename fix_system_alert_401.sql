-- Enable public read access for system_alert in vista_settings
-- This prevents 401 errors when anonymous users load the app and fetch alerts

-- 1. Ensure RLS is enabled
ALTER TABLE vista_settings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy if it exists
DROP POLICY IF EXISTS "Public Read System Alert" ON vista_settings;

-- 3. Create policy to allow anonymous SELECT on ONLY the system_alert key
CREATE POLICY "Public Read System Alert" ON vista_settings
FOR SELECT TO anon
USING (key = 'system_alert');

-- 4. Grant SELECT permission to anon/authenticated
GRANT SELECT ON vista_settings TO anon, authenticated;

-- Verification
SELECT * FROM pg_policies WHERE tablename = 'vista_settings';
