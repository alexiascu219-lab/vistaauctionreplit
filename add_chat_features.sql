-- Add Reactions and Replies to Chat Tables

-- 1. Internal Chat (vista_chat_comments)
ALTER TABLE public.vista_chat_comments 
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.vista_chat_comments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vista_chat_comments_reply_to ON public.vista_chat_comments(reply_to_id);

-- 2. External Chat (vista_applicant_messages)
ALTER TABLE public.vista_applicant_messages
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.vista_applicant_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vista_applicant_messages_reply_to ON public.vista_applicant_messages(reply_to_id);

-- 3. Utility Function for toggle_reaction (Optional but recommended for concurrent edits)
-- Usage: select toggle_reaction('vista_chat_comments', 'msg_uuid', 'user_uuid', '👍');
CREATE OR REPLACE FUNCTION toggle_reaction(
  table_name TEXT,
  message_id UUID,
  user_id UUID,
  emoji TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_reactions JSONB;
  new_reactions JSONB;
  actors JSONB;
BEGIN
  -- Dynamic SQL to get current reactions
  EXECUTE format('SELECT reactions FROM %I WHERE id = $1', table_name)
  INTO current_reactions
  USING message_id;

  IF current_reactions IS NULL THEN
    current_reactions := '{}'::jsonb;
  END IF;

  -- Get current actors for this emoji
  actors := current_reactions -> emoji;
  
  IF actors IS NULL THEN
    actors := '[]'::jsonb;
  END IF;

  -- Toggle Logic
  IF actors @> to_jsonb(user_id) THEN
    -- Remove user
    actors := actors - user_id::text;
    -- If empty, remove the key entirely? Or keep empty list? Let's keep empty list for simplicity or remove if desired.
    -- To remove key: new_reactions := current_reactions - emoji; (if empty)
  ELSE
    -- Add user
    actors := actors || to_jsonb(user_id);
  END IF;

  -- Update the JSONB
  new_reactions := jsonb_set(current_reactions, ARRAY[emoji], actors);

  -- Perform Update
  EXECUTE format('UPDATE %I SET reactions = $1 WHERE id = $2', table_name)
  USING new_reactions, message_id;

  RETURN new_reactions;
END;
$$;
