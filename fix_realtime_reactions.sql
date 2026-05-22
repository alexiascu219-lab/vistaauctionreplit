-- Enable Replica Identity Full for Chat Tables to ensure Realtime works for all columns
ALTER TABLE public.vista_chat_comments REPLICA IDENTITY FULL;
ALTER TABLE public.vista_applicant_messages REPLICA IDENTITY FULL;

-- Ensure Publication exists (Supabase default is 'supabase_realtime')
-- We can't easily check this via SQL in all environments, but we can try to add the table if it's missing from a custom one, 
-- but normally Supabase handles this via Dashboard. 
-- However, forcing REPLICA IDENTITY FULL is a good step for "reload required" issues.

-- Also, verify specific column permissions aren't blocking it (RLS). 
-- If user can SELECT the row, they should get the update.
