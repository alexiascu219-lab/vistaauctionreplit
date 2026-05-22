-- Fix FK for vista_chat_comments to ensure it points to auth.users
-- This resolves the "Key is not present in table users" error (409 Conflict)

-- 1. Drop the constraint if it exists (handling potential naming variations)
ALTER TABLE public.vista_chat_comments 
DROP CONSTRAINT IF EXISTS vista_chat_comments_author_id_fkey_final;

ALTER TABLE public.vista_chat_comments 
DROP CONSTRAINT IF EXISTS vista_chat_comments_author_id_fkey;

-- 2. Add the correct constraint referencing AUTH.USERS
ALTER TABLE public.vista_chat_comments
ADD CONSTRAINT vista_chat_comments_author_id_fkey_final
FOREIGN KEY (author_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- 3. Verify public.users isn't the issue (Optional: if you use a profile table, you might want to ensure sync, strictly speaking auth.users is safer for chat auth)
