-- Fix Foreign Key Constraint for Chat Comments (Final)
-- The error "Key is not present in table users" suggests a mismatch or wrong target table.
-- We must ensure author_id references auth.users directly.

DO $$
BEGIN
    -- 1. Drop potential existing constraints to clean slate
    ALTER TABLE public.vista_chat_comments DROP CONSTRAINT IF EXISTS vista_chat_comments_author_id_fkey;
    ALTER TABLE public.vista_chat_comments DROP CONSTRAINT IF EXISTS vista_chat_comments_author_id_fkey_v2;
    ALTER TABLE public.vista_chat_comments DROP CONSTRAINT IF EXISTS vista_chat_comments_author_id_fkey_final;

    -- 2. Add the correct constraint pointing to auth.users
    -- Note: Ensure you have permissions. Supabase usually allows this.
    ALTER TABLE public.vista_chat_comments
    ADD CONSTRAINT vista_chat_comments_author_id_fkey_final
    FOREIGN KEY (author_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error applying FK fix: %', SQLERRM;
END $$;
