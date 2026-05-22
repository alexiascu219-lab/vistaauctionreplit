-- 1. Create Developer Chat Table 
CREATE TABLE IF NOT EXISTS public.vista_developer_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_role TEXT,
  message TEXT,
  image_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.vista_developer_chat ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Allow any authenticated user to read chat messages
CREATE POLICY "Enable read access for all authenticated users" 
ON public.vista_developer_chat 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow any authenticated user to insert messages
CREATE POLICY "Enable insert access for authenticated users" 
ON public.vista_developer_chat 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 4. Set up Real-time replication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'vista_developer_chat'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vista_developer_chat;
  END IF;
END
$$;

-- 5. Inject Mock Applicants
INSERT INTO public.vista_applications (full_name, email, phone, position, status, notes, referring_employee, previous_experience)
VALUES 
  ('John Doe', 'john.doe@example.com', '555-0101', 'Sales Representative', 'New', '{"Shift Preference": "Mon-Fri Morning"}', null, null),
  ('Jane Smith', 'jane.smith@example.com', '555-0102', 'Customer Service', 'Interviewing', '{"Shift Preference": "Afternoon"}', null, 'Retail'),
  ('Alice Johnson', 'alice.johnson@example.com', '555-0103', 'Account Manager', 'Pending', '{"Location Preference": "Charlotte, NC"}', null, null),
  ('Bob Brown', 'bob.brown@example.com', '555-0104', 'Sales Representative', 'New', '{}', 'Sarah Connor', null),
  ('Charlie Davis', 'charlie.davis@example.com', '555-0105', 'Logistics', 'New', '{"Shift Preference": "Weekend"}', null, null)
ON CONFLICT DO NOTHING;
