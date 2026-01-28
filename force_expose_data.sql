-- EMERGENCY VISIBILITY TEST
-- This script TEMPORARILY disables Row Level Security to prove if permission is the blocker.

-- 1. Disable RLS (Data becomes visible to owner/RPCs 100%)
ALTER TABLE vista_applications DISABLE ROW LEVEL SECURITY;

-- 2. Explicitly Grant Select
GRANT SELECT ON vista_applications TO anon, authenticated, service_role;

-- 3. Run a quick check (This output won't be seen, but ensures no errors)
DO $$
BEGIN
    PERFORM count(*) FROM vista_applications;
END $$;
