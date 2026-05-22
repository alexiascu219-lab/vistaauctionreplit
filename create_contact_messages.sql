-- Create Messages Table
CREATE TABLE IF NOT EXISTS vista_contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'New', -- 'New', 'Replied', 'Archived'
    internal_notes TEXT
);

-- Enable RLS
ALTER TABLE vista_contact_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow ANYONE (public) to INSERT messages
-- (So the public contact form works)
CREATE POLICY "Public can submit messages" 
ON vista_contact_messages FOR INSERT 
TO public 
WITH CHECK (true);

-- Policy: Only Authenticated Staff (HR/Admins) can VIEW/UPDATE
CREATE POLICY "Staff can view messages" 
ON vista_contact_messages FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Staff can update messages" 
ON vista_contact_messages FOR UPDATE 
TO authenticated 
USING (true);
