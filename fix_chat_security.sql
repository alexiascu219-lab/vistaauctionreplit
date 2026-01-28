-- SECURE CHAT RPC: Fetch messages without direct table access
-- This ensures applicants can read their OWN chat history securely.

-- 1. Create the fetch function
CREATE OR REPLACE FUNCTION get_applicant_messages(p_application_id UUID, p_email TEXT)
RETURNS TABLE (
    id BIGINT,
    application_id UUID,
    sender_id UUID,
    content TEXT,
    is_external BOOLEAN,
    attachment_url TEXT,
    attachment_type TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Verify email matches application_id
    IF NOT EXISTS (
        SELECT 1 FROM vista_applications 
        WHERE id = p_application_id 
        AND email ILIKE p_email
    ) THEN
        RAISE EXCEPTION 'Access Denied: Application mapping failed.';
    END IF;

    RETURN QUERY
    SELECT 
        m.id,
        m.application_id,
        m.sender_id,
        m.content,
        m.is_external,
        m.attachment_url,
        m.attachment_type,
        m.read_at,
        m.created_at
    FROM vista_applicant_messages m
    WHERE m.application_id = p_application_id
    ORDER BY m.created_at ASC;
END;
$$;

-- 2. Create the send function (Clean old versions first to avoid ambiguity)
-- We drop both common signatures to ensure we start fresh
DROP FUNCTION IF EXISTS send_applicant_message(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_applicant_message(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION send_applicant_message(
    p_application_id UUID, 
    p_email TEXT, 
    p_message TEXT,
    p_attachment_url TEXT DEFAULT NULL,
    p_attachment_type TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Verify identity
    IF NOT EXISTS (
        SELECT 1 FROM vista_applications 
        WHERE id = p_application_id 
        AND email ILIKE p_email
    ) THEN
        RAISE EXCEPTION 'Verification failed. Cannot send message.';
    END IF;

    INSERT INTO vista_applicant_messages (
        application_id, 
        sender_id,           -- Using application_id as sender_id for applicants
        content, 
        is_external,         -- TRUE for applicant
        attachment_url,
        attachment_type
    ) VALUES (
        p_application_id,
        p_application_id,    -- Sender is the applicant
        p_message,
        true,                -- external = true
        p_attachment_url,
        p_attachment_type
    );
END;
$$;

-- 3. Grant permissions (Explicitly specifying arguments to avoid ambiguity)
GRANT EXECUTE ON FUNCTION get_applicant_messages(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION send_applicant_message(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 4. Enable RLS on the table to block direct access
ALTER TABLE vista_applicant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vista_applicant_messages FORCE ROW LEVEL SECURITY;

-- Block direct SELECT for anon
DROP POLICY IF EXISTS "Deny Direct Select" ON vista_applicant_messages;
CREATE POLICY "Deny Direct Select" ON vista_applicant_messages 
FOR SELECT TO anon USING (false);

-- Allow authenticated (HR) to manage everything
DROP POLICY IF EXISTS "HR Full Access" ON vista_applicant_messages;
CREATE POLICY "HR Full Access" ON vista_applicant_messages 
FOR ALL TO authenticated USING (true);

-- Verification
SELECT * FROM pg_policies WHERE tablename = 'vista_applicant_messages';

