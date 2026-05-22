-- Enable Row Level Security on the unread counts table
ALTER TABLE public.vista_unread_counts ENABLE ROW LEVEL SECURITY;

-- 1. Grant SELECT access to Authenticated Users (HR)
-- Triggers/System manage the data, humans only read it.
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.vista_unread_counts;

CREATE POLICY "Enable read access for authenticated users"
ON public.vista_unread_counts
FOR SELECT
TO authenticated
USING (true);

-- 2. Optional: If you want to restrict it specifically to HR roles in the future:
-- USING (auth.uid() IN (SELECT id FROM vista_employees))

-- 3. Ensure no one can manually tamper with counts via API (ReadOnly)
-- No INSERT/UPDATE/DELETE policies for 'authenticated' or 'anon'
-- (Trigger/Service Role bypasses RLS, so system updates still work)
