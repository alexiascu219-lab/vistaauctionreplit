-- Fix 409 Conflict / Key Violation in Chat Comments
-- Issue: The 'author_id' was checking against 'vista_employees', but the user ID comes from 'auth.users'.
-- If the user isn't in 'vista_employees' (e.g. Super Admin or new user), the insert fails.

DO $$
BEGIN
    -- 1. Drop the strict constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vista_chat_comments_author_id_fkey') THEN
        ALTER TABLE public.vista_chat_comments DROP CONSTRAINT vista_chat_comments_author_id_fkey;
    END IF;

    -- 2. Create a new, correct constraint linking to the REAL Auth system
    -- check if it doesn't exist first to avoid double-run errors
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vista_chat_comments_author_id_fkey_v2') THEN
        ALTER TABLE public.vista_chat_comments 
        ADD CONSTRAINT vista_chat_comments_author_id_fkey_v2 
        FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
END $$;
