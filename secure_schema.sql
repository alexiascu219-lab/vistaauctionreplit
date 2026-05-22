-- ==========================================
-- SECURITY LOCKDOWN SCRIPT v1.0
-- ==========================================

-- 1. RATE LIMITING FOR APPLICATIONS
-- Prevent spam by limiting submissions per email/phone to 1 per 24 hours.

CREATE OR REPLACE FUNCTION public.check_application_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_count INTEGER;
BEGIN
    -- Check for existing applications with same email or phone in last 24 hours
    SELECT COUNT(*) INTO recent_count
    FROM public.vista_applications
    WHERE (email = NEW.email OR phone = NEW.phone)
    AND applied_at > (NOW() - INTERVAL '24 hours');

    IF recent_count > 0 THEN
        RAISE EXCEPTION 'Rate Limit Exceeded: You have already applied in the last 24 hours.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to ensure clean slate
DROP TRIGGER IF EXISTS tr_rate_limit_applications ON public.vista_applications;

CREATE TRIGGER tr_rate_limit_applications
BEFORE INSERT ON public.vista_applications
FOR EACH ROW
EXECUTE FUNCTION public.check_application_rate_limit();


-- 2. HARDENING VISTA_EMPLOYEES (THE "FORTRESS")
-- Only Admins/Managers can touch this table.

ALTER TABLE public.vista_employees ENABLE ROW LEVEL SECURITY;

-- Policy: VIEW (Everyone authenticated can view - needed for chat/profile lookups)
DROP POLICY IF EXISTS "Authenticated can view employees" ON public.vista_employees;
CREATE POLICY "Authenticated can view employees"
ON public.vista_employees FOR SELECT
TO authenticated
USING (true);

-- Policy: INSERT/UPDATE/DELETE (Strictly Managers/Admins only)
-- Note: We trust the `role` column in the table itself for this check, 
-- ensuring no regular user can promote themselves.
DROP POLICY IF EXISTS "Managers can manage employees" ON public.vista_employees;
CREATE POLICY "Managers can manage employees"
ON public.vista_employees FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.vista_employees
        WHERE id = auth.uid() 
        AND role IN ('manager', 'admin', 'owner', 'super_admin')
    )
);


-- 3. HARDENING VISTA_APPLICATIONS
-- Public INSERTS allowed, but UPDATES restricted to Staff.

ALTER TABLE public.vista_applications ENABLE ROW LEVEL SECURITY;

-- Policy: INSERT (Public - Anon & Auth)
DROP POLICY IF EXISTS "Public can submit applications" ON public.vista_applications;
CREATE POLICY "Public can submit applications"
ON public.vista_applications FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: SELECT (Staff Only)
DROP POLICY IF EXISTS "Staff can view applications" ON public.vista_applications;
CREATE POLICY "Staff can view applications"
ON public.vista_applications FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.vista_employees
        WHERE id = auth.uid()
    )
);

-- Policy: UPDATE (Staff Only - Candidates cannot edit after submission)
DROP POLICY IF EXISTS "Staff can update applications" ON public.vista_applications;
CREATE POLICY "Staff can update applications"
ON public.vista_applications FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.vista_employees
        WHERE id = auth.uid()
    )
);

-- Policy: DELETE (Managers Only)
DROP POLICY IF EXISTS "Managers can delete applications" ON public.vista_applications;
CREATE POLICY "Managers can delete applications"
ON public.vista_applications FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.vista_employees
        WHERE id = auth.uid() 
        AND role IN ('manager', 'admin', 'owner')
    )
);
