-- 1. Ecosystem Cleanup (Remove Training)
DROP TABLE IF EXISTS vista_training;

-- 2. Ensure Roles Column Exists & Update Constraints
DO $$ 
BEGIN 
    -- Drop the old constraint that is causing the error
    ALTER TABLE vista_employees DROP CONSTRAINT IF EXISTS vista_employees_role_check;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_employees' AND column_name='role') THEN
        ALTER TABLE vista_employees ADD COLUMN role TEXT DEFAULT 'hr_employee';
    END IF;

    -- Add the NEW constraint that allows our new roles
    ALTER TABLE vista_employees ADD CONSTRAINT vista_employees_role_check 
    CHECK (role IN ('manager', 'assistant_manager', 'hr_employee', 'Super Admin', 'HR Manager', 'authenticated'));

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_employees' AND column_name='mfa_enabled') THEN
        ALTER TABLE vista_employees ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_employees' AND column_name='full_name') THEN
        ALTER TABLE vista_employees ADD COLUMN full_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_employees' AND column_name='avatar_url') THEN
        ALTER TABLE vista_employees ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- 2. Create Users in Supabase Auth (auth.users)
-- We perform a "Clean & Rebuild" to ensure no ghost records from previous failed runs.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    manager_id UUID := gen_random_uuid();
    asst_id UUID := gen_random_uuid();
    hr1_id UUID := gen_random_uuid();
    hr2_id UUID := gen_random_uuid();
    hr3_id UUID := gen_random_uuid();
    default_pass_hash TEXT := crypt('vistahr2026', gen_salt('bf'));
BEGIN
    -- PURGE existing test accounts to avoid partial-success ghosts
    DELETE FROM auth.users WHERE email IN ('manager@vistaauction.com', 'assistant@vistaauction.com', 'hr1@vistaauction.com', 'hr2@vistaauction.com', 'hr3@vistaauction.com');

    -- Create Manager
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES (manager_id, '00000000-0000-0000-0000-000000000000', 'manager@vistaauction.com', default_pass_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"System Manager"}', now(), now(), 'authenticated', 'authenticated', '', '', '', '');
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
    VALUES (gen_random_uuid(), manager_id, format('{"sub":"%s","email":"%s"}', manager_id, 'manager@vistaauction.com')::jsonb, 'email', now(), now(), now(), manager_id::text);

    -- Create Assistant Manager
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES (asst_id, '00000000-0000-0000-0000-000000000000', 'assistant@vistaauction.com', default_pass_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Assistant Manager"}', now(), now(), 'authenticated', 'authenticated', '', '', '', '');

    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
    VALUES (gen_random_uuid(), asst_id, format('{"sub":"%s","email":"%s"}', asst_id, 'assistant@vistaauction.com')::jsonb, 'email', now(), now(), now(), asst_id::text);

    -- Create HR Employees
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES (hr1_id, '00000000-0000-0000-0000-000000000000', 'hr1@vistaauction.com', default_pass_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"HR Staff 1"}', now(), now(), 'authenticated', 'authenticated', '', '', '', '');
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
    VALUES (gen_random_uuid(), hr1_id, format('{"sub":"%s","email":"%s"}', hr1_id, 'hr1@vistaauction.com')::jsonb, 'email', now(), now(), now(), hr1_id::text);

    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES (hr2_id, '00000000-0000-0000-0000-000000000000', 'hr2@vistaauction.com', default_pass_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"HR Staff 2"}', now(), now(), 'authenticated', 'authenticated', '', '', '', '');
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
    VALUES (gen_random_uuid(), hr2_id, format('{"sub":"%s","email":"%s"}', hr2_id, 'hr2@vistaauction.com')::jsonb, 'email', now(), now(), now(), hr2_id::text);

    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES (hr3_id, '00000000-0000-0000-0000-000000000000', 'hr3@vistaauction.com', default_pass_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"HR Staff 3"}', now(), now(), 'authenticated', 'authenticated', '', '', '', '');
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
    VALUES (gen_random_uuid(), hr3_id, format('{"sub":"%s","email":"%s"}', hr3_id, 'hr3@vistaauction.com')::jsonb, 'email', now(), now(), now(), hr3_id::text);
END $$;

-- 3. Seed/Sync Profiles in Public Schema
INSERT INTO vista_employees (email, full_name, role, mfa_enabled)
VALUES 
    ('manager@vistaauction.com', 'System Manager', 'manager', true),
    ('assistant@vistaauction.com', 'Assistant Manager', 'assistant_manager', true),
    ('hr1@vistaauction.com', 'HR Staff 1', 'hr_employee', true),
    ('hr2@vistaauction.com', 'HR Staff 2', 'hr_employee', true),
    ('hr3@vistaauction.com', 'HR Staff 3', 'hr_employee', true)
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role, mfa_enabled = EXCLUDED.mfa_enabled;

UPDATE vista_employees 
SET role = 'manager', mfa_enabled = false 
WHERE email = 'hr@vistaauction.com';

-- 4. Secure RBAC Functions & Policies
-- We use a SECURITY DEFINER function to avoid infinite recursion in policies.

CREATE OR REPLACE FUNCTION public.get_my_role() 
RETURNS text AS $$
  SELECT role FROM public.vista_employees WHERE email = auth.jwt()->>'email';
$$ LANGUAGE sql SECURITY DEFINER;

-- Clear old policies
DROP POLICY IF EXISTS "Manager_Full_Access" ON vista_employees;
DROP POLICY IF EXISTS "Asst_Manager_Access" ON vista_employees;
DROP POLICY IF EXISTS "Self_Visibility" ON vista_employees;
DROP POLICY IF EXISTS "HR_Staff_Full_Access_Users" ON vista_employees;
DROP POLICY IF EXISTS "Admin_Manager_Access" ON vista_employees;
DROP POLICY IF EXISTS "Asst_Manager_Limited_Access" ON vista_employees;
DROP POLICY IF EXISTS "General_Select_Visibility" ON vista_employees;
DROP POLICY IF EXISTS "Self_Update" ON vista_employees;

-- Policy for Full Access (Managers & Admins)
CREATE POLICY "Admin_Manager_Access" ON vista_employees 
FOR ALL TO authenticated 
USING (
    public.get_my_role() IN ('manager', 'Super Admin')
);

-- Policy for Assistant Managers
CREATE POLICY "Asst_Manager_Limited_Access" ON vista_employees 
FOR ALL TO authenticated 
USING (
    public.get_my_role() = 'assistant_manager'
)
WITH CHECK (
    role = 'hr_employee'
);

-- Policy for General Visibility (Everyone can see the list, but not edit)
CREATE POLICY "General_Select_Visibility" ON vista_employees 
FOR SELECT TO authenticated 
USING (true);

-- Policy for Individual Profiling (Everyone can update their own profile)
CREATE POLICY "Self_Update" ON vista_employees 
FOR UPDATE TO authenticated 
USING (email = auth.jwt()->>'email');
