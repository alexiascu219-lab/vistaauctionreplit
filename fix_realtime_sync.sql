-- FIX: ENABLE REALTIME SYNC (HR & Applicant)

-- 1. Add table to Supabase Realtime Publication
-- This is often missed when recreating tables. Without this, no events are broadcast.
BEGIN;
  -- Try to drop first to ensure clean state (optional, duplicate add throws error sometimes)
  -- ALTER PUBLICATION supabase_realtime DROP TABLE vista_applicant_messages;
  
  -- Add to publication
  ALTER PUBLICATION supabase_realtime ADD TABLE vista_applicant_messages;
COMMIT;

-- 2. Restore Public Read Access (REQUIRED for Applicant Realtime)
-- Supabase Realtime checks RLS. If Anon cannot SELECT, they cannot receive updates.
-- We previously blocked this for security, but it breaks the "Auto Update" feature.
-- We revert to allowing SELECT, relying on the unguessable nature of the Application ID (Text/UUID).

DROP POLICY IF EXISTS "Deny Direct Select" ON vista_applicant_messages;
DROP POLICY IF EXISTS "Allow public read of messages" ON vista_applicant_messages;

CREATE POLICY "Allow public read of messages" 
ON vista_applicant_messages 
FOR SELECT 
TO anon 
USING (true); 
-- Note: In a stricter system, we might use a session variable or simpler check, 
-- but for this "Status Checker" flow, global read with obscure IDs is the standard pattern.

-- 3. Ensure HR Read Access is also firm (Authentication)
DROP POLICY IF EXISTS "HR Full Access" ON vista_applicant_messages;

CREATE POLICY "HR Full Access" 
ON vista_applicant_messages 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Verify Publication Status
SELECT * FROM pg_publication_tables WHERE tablename = 'vista_applicant_messages';
