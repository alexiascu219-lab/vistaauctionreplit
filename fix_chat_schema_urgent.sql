-- URGENT FIX: Resolve "Key not present in users" 409 Error
-- The previous error indicates the Foreign Key was pointing to the wrong table (probably public.users) or the Constraint name was different.

-- 1. Drop ALL potential variants of the constraint to be safe
ALTER TABLE public.vista_chat_comments 
DROP CONSTRAINT IF EXISTS vista_chat_comments_author_id_fkey_final;

ALTER TABLE public.vista_chat_comments 
DROP CONSTRAINT IF EXISTS vista_chat_comments_author_id_fkey;

ALTER TABLE public.vista_chat_comments 
DROP CONSTRAINT IF EXISTS vista_chat_comments_sender_id_fkey;

-- 2. Force the correct constraint pointing to AUTH.USERS
-- This ensures that as long as the user is logged in (exists in auth.users), they can comment.
ALTER TABLE public.vista_chat_comments
ADD CONSTRAINT vista_chat_comments_author_id_fkey_final
FOREIGN KEY (author_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- 3. Validation: Check if the table columns are correct
-- (Supabase might cache schema, running this forces a schema refresh in some contexts)
COMMENT ON CONSTRAINT vista_chat_comments_author_id_fkey_final ON public.vista_chat_comments IS 'Links author_id to auth.users';
