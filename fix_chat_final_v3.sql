-- FINAL CHAT FIX V3 (Schema & Logic Alignment)
-- Problem: Table used UUIDs, but data model requires TEXT (for Applicant IDs).
-- Fix: Convert columns to TEXT and align RPC signatures.

-- 1. ALTER TABLE to support TEXT IDs (Safe operation: UUID casts to TEXT automatically)
DO $$
BEGIN
    -- Change sender_id to TEXT so it can store "Applicant IDs" (Strings) OR "HR UUIDs"
    EXECUTE 'ALTER TABLE vista_applicant_messages ALTER COLUMN sender_id TYPE TEXT';
    
    -- Ensure application_id is TEXT (matches vista_applications.id)
    EXECUTE 'ALTER TABLE vista_applicant_messages ALTER COLUMN application_id TYPE TEXT';

EXCEPTION WHEN OTHERS THEN 
    -- If already text or other error, just log/continue
    RAISE NOTICE 'Skipping column alter (might already be done): %', SQLERRM;
END $$;


-- 2. Validate Schema for Unread Counts
DO $$
BEGIN
    BEGIN
        ALTER TABLE vista_unread_counts ADD COLUMN last_updated TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;


-- 3. Recreate get_applicant_messages
-- FIX: Return type for 'id' is UUID (matches table), 'sender_id' is TEXT
DROP FUNCTION IF EXISTS get_applicant_messages(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_applicant_messages(UUID, TEXT); -- Drop old version too

CREATE OR REPLACE FUNCTION get_applicant_messages(p_application_id TEXT, p_email TEXT)
RETURNS TABLE (
    id UUID,             -- Table uses UUID for message PK
    application_id TEXT, 
    sender_id TEXT,      -- Now TEXT
    content TEXT,
    is_external BOOLEAN,
    attachment_url TEXT,
    attachment_type TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Validation: Ensure connection to valid application
    IF NOT EXISTS (
        SELECT 1 FROM vista_applications va
        WHERE va.id = p_application_id 
        AND va.email ILIKE p_email
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


-- 4. Recreate send_applicant_message
DROP FUNCTION IF EXISTS send_applicant_message(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_applicant_message(UUID, TEXT, TEXT, TEXT, TEXT); -- Drop old version

CREATE OR REPLACE FUNCTION send_applicant_message(
    p_application_id TEXT,
    p_email TEXT,
    p_message TEXT,
    p_attachment_url TEXT DEFAULT NULL,
    p_attachment_type TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Verify identity
    IF NOT EXISTS (
        SELECT 1 FROM vista_applications va
        WHERE va.id = p_application_id 
        AND va.email ILIKE p_email
    ) THEN
        RAISE EXCEPTION 'Verification failed. Cannot send message.';
    END IF;

    -- Insert using TEXT application_id associated with the sender
    INSERT INTO vista_applicant_messages (
        application_id,
        sender_id,           -- Now TEXT, so we can put p_application_id here securely
        content,
        is_external,
        attachment_url,
        attachment_type
    ) VALUES (
        p_application_id,
        p_application_id,    -- Sender is the Applicant (ID string)
        p_message,
        FALSE,               -- Internal/Applicant message
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
