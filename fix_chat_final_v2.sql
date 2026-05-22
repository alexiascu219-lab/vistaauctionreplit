-- COMPREHENSIVE FIX for Chat Functionality (VERSION 2 - TEXT ID FIX)
-- Addresses: "operator does not exist: text = uuid" by switching RPCs to accept TEXT.

-- 1. Fix Schema: Ensure 'last_updated' exists (Safe to run)
DO $$
BEGIN
    BEGIN
        ALTER TABLE vista_unread_counts ADD COLUMN last_updated TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- 2. Clean up OLD UUID versions to avoid ambiguity
DROP FUNCTION IF EXISTS get_applicant_messages(UUID, TEXT);
DROP FUNCTION IF EXISTS send_applicant_message(UUID, TEXT, TEXT, TEXT, TEXT);

-- 3. Recreate get_applicant_messages using TEXT for IDs
CREATE OR REPLACE FUNCTION get_applicant_messages(p_application_id TEXT, p_email TEXT)
RETURNS TABLE (
    id BIGINT,
    application_id TEXT,  -- Changed to TEXT to match table
    sender_id TEXT,       -- Changed to TEXT
    content TEXT,
    is_external BOOLEAN,
    attachment_url TEXT,
    attachment_type TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Validation
    IF NOT EXISTS (
        SELECT 1 FROM vista_applications va
        WHERE va.id = p_application_id -- No casting needed, both are TEXT now
        AND va.email ILIKE p_email
    ) THEN
        RAISE EXCEPTION 'Access Denied: Application mapping failed.';
    END IF;

    RETURN QUERY
    SELECT 
        m.id,
        m.application_id::TEXT, -- Ensure cast if underlying column differs, but likely text
        m.sender_id::TEXT,
        m.content,
        m.is_external,
        m.attachment_url,
        m.attachment_type,
        m.read_at,
        m.created_at
    FROM vista_applicant_messages m
    WHERE m.application_id = p_application_id -- Text comparison
    ORDER BY m.created_at ASC;
END;
$$;

-- 4. Recreate send_applicant_message using TEXT for IDs
CREATE OR REPLACE FUNCTION send_applicant_message(
    p_application_id TEXT,
    p_email TEXT,
    p_message TEXT,
    p_attachment_url TEXT DEFAULT NULL,
    p_attachment_type TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_sender_id TEXT;
BEGIN
    -- Verify identity
    IF NOT EXISTS (
        SELECT 1 FROM vista_applications va
        WHERE va.id = p_application_id 
        AND va.email ILIKE p_email
    ) THEN
        RAISE EXCEPTION 'Verification failed. Cannot send message.';
    END IF;

    v_sender_id := p_application_id;

    INSERT INTO vista_applicant_messages (
        application_id,
        sender_id,
        content,
        is_external,
        attachment_url,
        attachment_type
    ) VALUES (
        p_application_id, -- Implicit cast to uuid? No, schema is likely text if table FK failed
        v_sender_id,
        p_message,
        FALSE, 
        p_attachment_url,
        p_attachment_type
    );

    -- Update Unread Count
    INSERT INTO public.vista_unread_counts (application_id, unread_count, last_updated)
    VALUES (p_application_id, 1, NOW())
    ON CONFLICT (application_id)
    DO UPDATE SET 
        unread_count = vista_unread_counts.unread_count + 1,
        last_updated = NOW();
END;
$$;

-- 5. Grant Permissions
GRANT EXECUTE ON FUNCTION get_applicant_messages(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION send_applicant_message(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
