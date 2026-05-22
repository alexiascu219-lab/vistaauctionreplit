-- FIX: ENABLE REALTIME FOR ALL INDICATORS
-- Problem: The "Inquiry Dot" and "Unread Chat Dot" are not updating instantly.
-- Cause: The tables 'vista_unread_counts' and 'vista_contact_messages' are not in the Realtime Publication.

BEGIN;
  -- 1. Add 'vista_unread_counts' (Fixes persistent red chat dot)
  ALTER PUBLICATION supabase_realtime ADD TABLE vista_unread_counts;
  
  -- 2. Add 'vista_contact_messages' (Fixes missing Inquiry pulse)
  ALTER PUBLICATION supabase_realtime ADD TABLE vista_contact_messages;
COMMIT;

-- 3. Ensure HR has permission to READ contact messages (Inquiries)
-- If this was missing, HR would see 0 messages and no dot.
ALTER TABLE vista_contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR Read Inquiries" ON vista_contact_messages;

CREATE POLICY "HR Read Inquiries"
ON vista_contact_messages
FOR SELECT
TO authenticated
USING (true); -- Allow all authenticated staff to read inquiries

-- 4. Verify
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
