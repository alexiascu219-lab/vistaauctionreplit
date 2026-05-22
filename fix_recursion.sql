-- ==========================================
-- FIX RECURSION SCRIPT
-- Resolves 'infinite recursion detected' error (42P17)
-- ==========================================

-- 1. Create a Secure Helper Function to get role
-- "SECURITY DEFINER" means this function runs with the permissions of the Creator (Admin),
-- bypassing RLS checks on the table itself. This breaks the infinite loop.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.vista_employees
    WHERE id = auth.uid();
    
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Policies to use the new function

-- A. Fix vista_employees (The "Fortress")
ALTER TABLE public.vista_employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can manage employees" ON public.vista_employees;

CREATE POLICY "Managers can manage employees"
ON public.vista_employees FOR ALL
TO authenticated
USING (
    public.get_my_role() IN ('manager', 'admin', 'owner', 'super_admin')
);

-- B. Fix vista_applications (Staff Access)
DROP POLICY IF EXISTS "Staff can view applications" ON public.vista_applications;
DROP POLICY IF EXISTS "Staff can update applications" ON public.vista_applications;
DROP POLICY IF EXISTS "Managers can delete applications" ON public.vista_applications;

CREATE POLICY "Staff can view applications"
ON public.vista_applications FOR SELECT
TO authenticated
USING (
    public.get_my_role() IS NOT NULL
);

CREATE POLICY "Staff can update applications"
ON public.vista_applications FOR UPDATE
TO authenticated
USING (
    public.get_my_role() IS NOT NULL
);

CREATE POLICY "Managers can delete applications"
ON public.vista_applications FOR DELETE
TO authenticated
USING (
    public.get_my_role() IN ('manager', 'admin', 'owner')
);
