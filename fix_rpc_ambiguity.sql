-- FIX: Drop ambiguous functions to resolve "PGRST203: Could not choose the best candidate function"
-- We will drop both existing versions (text and uuid variants) and recreate a single, canonical one.

DROP FUNCTION IF EXISTS public.send_applicant_message(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.send_applicant_message(uuid, text, text, text, text);

-- Recreate the single canonical function accepting UUID
CREATE OR REPLACE FUNCTION public.send_applicant_message(
    p_application_id UUID,
    p_email TEXT,
    p_message TEXT,
    p_attachment_url TEXT DEFAULT NULL,
    p_attachment_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_id UUID;
BEGIN
    -- 1. For applicant-side chat, the sender is the application itself (the 'user' context)
    v_sender_id := p_application_id;

    -- 2. Insert message
    INSERT INTO public.vista_applicant_messages (
        application_id,
        sender_id,
        content,
        attachment_url,
        attachment_type,
        is_external
    ) VALUES (
        p_application_id,
        v_sender_id,
        p_message,
        p_attachment_url,
        p_attachment_type,
        FALSE -- Internal (from applicant)
    );

    -- 3. Update unread count for HR
    INSERT INTO public.vista_unread_counts (application_id, unread_count, last_updated)
    VALUES (p_application_id, 1, NOW())
    ON CONFLICT (application_id)
    DO UPDATE SET 
        unread_count = vista_unread_counts.unread_count + 1,
        last_updated = NOW();

END;
$$;

-- Grant permissions (just to be safe)
GRANT EXECUTE ON FUNCTION public.send_applicant_message(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
