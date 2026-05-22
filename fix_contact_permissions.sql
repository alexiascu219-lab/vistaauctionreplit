-- FIX: Grant DELETE permission to staff for contact messages
-- Without this, RLS blocks the delete operation after a reply is sent.

DROP POLICY IF EXISTS "Staff can delete messages" ON vista_contact_messages;

CREATE POLICY "Staff can delete messages" 
ON vista_contact_messages FOR DELETE 
TO authenticated 
USING (true);

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'vista_contact_messages';
