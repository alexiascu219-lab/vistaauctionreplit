-- 1. Enable REPLICA IDENTITY FULL for all chat tables
-- This ensures that Supabase sends the complete row data on UPDATE and DELETE events
ALTER TABLE public.vista_developer_chat REPLICA IDENTITY FULL;
ALTER TABLE public.vista_chat_comments REPLICA IDENTITY FULL;
ALTER TABLE public.vista_applicant_messages REPLICA IDENTITY FULL;

-- 2. Ensure all tables are in the realtime publication
DO $$
BEGIN
  -- Developer Chat
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'vista_developer_chat'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vista_developer_chat;
  END IF;

  -- Team Chat (internal)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'vista_chat_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vista_chat_comments;
  END IF;

  -- Applicant Messages (external)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'vista_applicant_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vista_applicant_messages;
  END IF;
END
$$;
