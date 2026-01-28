-- Ensure RLS is enabled (Security Best Practice)
ALTER TABLE vista_applications ENABLE ROW LEVEL SECURITY;

-- 1. Grant Permissions to Roles
GRANT SELECT, INSERT, UPDATE, DELETE ON vista_applications TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON vista_applications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON vista_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON vista_applications TO authenticated;

-- 2. Create Policy for Service Role (RPCs usually run as this or postgres)
-- This allows the "SECURITY DEFINER" functions to effectively see everything.
DROP POLICY IF EXISTS "Service Role Full Access" ON vista_applications;
CREATE POLICY "Service Role Full Access" ON vista_applications
    FOR ALL
    TO service_role, postgres
    USING (true)
    WITH CHECK (true);

-- 3. Create Policy for Anon/Authenticated (if needed for public insert)
-- We strictly limit SELECT to avoid leaking data, but allow INSERT for new applicants.
DROP POLICY IF EXISTS "Enable insert for everyone" ON vista_applications;
CREATE POLICY "Enable insert for everyone" ON vista_applications
    FOR INSERT
    TO public
    WITH CHECK (true);

-- 4. Allow reading your own application (Optional, if we weren't using RPC)
-- But for RPC "get_application_secure", the RPC itself handles the auth logic.
