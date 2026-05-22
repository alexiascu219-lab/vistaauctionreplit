-- FIX: RESTORE RLS POLICIES FOR HR CHAT
-- The previous schema repair script dropped policies but didn't re-add them.
-- This locked HR out of the chat table.

-- 1. Enable RLS (Ensure it's on)
ALTER TABLE vista_applicant_messages ENABLE ROW LEVEL SECURITY;

-- 2. Grant Permissions for HR (Authenticated Users)
-- HR uses direct table access in ChatSidebar.jsx, so they need this policy.
DROP POLICY IF EXISTS "HR Full Access" ON vista_applicant_messages;

CREATE POLICY "HR Full Access" 
ON vista_applicant_messages 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. Block Direct Public Access (Safety Check)
-- Applicants use RPCs (SECURITY DEFINER), so they don't need direct table access.
DROP POLICY IF EXISTS "Deny Direct Select" ON vista_applicant_messages;

CREATE POLICY "Deny Direct Select" 
ON vista_applicant_messages 
FOR SELECT 
TO anon 
USING (false);

-- 4. Verify Policy Existence
SELECT * FROM pg_policies WHERE tablename = 'vista_applicant_messages';
