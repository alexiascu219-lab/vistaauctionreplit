-- 1. Create Developer Chat Table 
CREATE TABLE IF NOT EXISTS public.vista_developer_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_role TEXT,
  message TEXT,
  image_url TEXT,
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
WITH CHECK (true);

-- Allow users to delete their own messages (optional)
CREATE POLICY "Enable delete for users based on user_id" 
ON public.vista_developer_chat 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 4. Set up Real-time replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.vista_developer_chat;
