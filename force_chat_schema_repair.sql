-- FORCE CHAT SCHEMA REPAIR
-- This script aggressively fixes the "UUID vs TEXT" mismatch by:
-- 1. Dropping all dependent functions/views to release locks.
-- 2. Forcing the table columns to TEXT.
-- 3. Recreating the logic correctly.

-- A. DROP DEPENDENCIES (Clear the path) - SAFE MODE
DO $$ 
BEGIN 
    -- Try dropping as VIEW
    BEGIN
        DROP VIEW IF EXISTS vista_unread_counts CASCADE;
    EXCEPTION WHEN wrong_object_type THEN NULL; END;

    -- Try dropping as TABLE
    BEGIN
        DROP TABLE IF EXISTS vista_unread_counts CASCADE;
    EXCEPTION WHEN wrong_object_type THEN NULL; END;
END $$;

DROP FUNCTION IF EXISTS get_applicant_messages(UUID, TEXT);
DROP FUNCTION IF EXISTS get_applicant_messages(TEXT, TEXT);
DROP FUNCTION IF EXISTS send_applicant_message(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_applicant_message(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP TRIGGER IF EXISTS trg_update_unread_count ON vista_applicant_messages;
DROP FUNCTION IF EXISTS update_unread_count_trigger();

-- B. FORCE TABLE SCHEMA UPDATE (The Critical Fix)

-- CRITICAL: Drop ALL policies first to avoid "cannot alter column used in policy" error
DROP POLICY IF EXISTS "Users can update their own applicant messages" ON vista_applicant_messages;
DROP POLICY IF EXISTS "Allow public read of messages" ON vista_applicant_messages;
DROP POLICY IF EXISTS "Allow public insert of messages" ON vista_applicant_messages;
DROP POLICY IF EXISTS "Deny Direct Select" ON vista_applicant_messages;
DROP POLICY IF EXISTS "HR Full Access" ON vista_applicant_messages;
-- Just in case, try to drop any others by name if known, otherwise we rely on these common ones.

-- We use 'USING ...::text' to successfully convert existing UUIDs to strings
ALTER TABLE vista_applicant_messages 
    ALTER COLUMN sender_id TYPE TEXT USING sender_id::text,
    ALTER COLUMN application_id TYPE TEXT USING application_id::text;

-- C. REBUILD UNREAD COUNTS (As Table)
CREATE TABLE vista_unread_counts (
    application_id TEXT PRIMARY KEY REFERENCES vista_applications(id) ON DELETE CASCADE,
    unread_count INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Data using TEXT IDs
INSERT INTO vista_unread_counts (application_id, unread_count, last_updated)
SELECT 
    application_id, 
    COUNT(*), 
    MAX(created_at)
FROM vista_applicant_messages
WHERE is_external = true AND read_at IS NULL
GROUP BY application_id;

-- Trigger for Auto-Updates
CREATE OR REPLACE FUNCTION update_unread_count_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') AND (NEW.is_external = true) AND (NEW.read_at IS NULL) THEN
        INSERT INTO vista_unread_counts (application_id, unread_count, last_updated)
        VALUES (NEW.application_id, 1, NOW())
        ON CONFLICT (application_id)
        DO UPDATE SET 
            unread_count = vista_unread_counts.unread_count + 1,
            last_updated = NOW();
    ELSIF (TG_OP = 'UPDATE') AND (OLD.read_at IS NULL) AND (NEW.read_at IS NOT NULL) AND (NEW.is_external = true) THEN
        UPDATE vista_unread_counts
        SET unread_count = GREATEST(0, unread_count - 1),
            last_updated = NOW()
        WHERE application_id = NEW.application_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_unread_count
AFTER INSERT OR UPDATE ON vista_applicant_messages
FOR EACH ROW EXECUTE FUNCTION update_unread_count_trigger();


-- D. RECREATE RPCs (With TEXT Signatures)

-- 1. Get Messages
CREATE OR REPLACE FUNCTION get_applicant_messages(p_application_id TEXT, p_email TEXT)
RETURNS TABLE (
    id UUID,             -- Kept as UUID (message ID)
    application_id TEXT, -- Fixed
    sender_id TEXT,      -- Fixed
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

-- 2. Send Message
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

    -- Insert
    INSERT INTO vista_applicant_messages (
        application_id,
        sender_id,
        content,
        is_external,
        attachment_url,
        attachment_type
    ) VALUES (
        p_application_id,
        p_application_id, -- Sender is matched to Application ID (TEXT)
        p_message,
        FALSE,
        p_attachment_url,
        p_attachment_type
    );

    -- Unread Count update handled by Trigger now!
END;
$$;


-- 3. Mark Messages Read (CRITICAL MISSING FIX)
DROP FUNCTION IF EXISTS mark_messages_read(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS mark_messages_read(TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION mark_messages_read(p_application_id TEXT, p_reader_is_applicant BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE vista_applicant_messages
    SET read_at = NOW()
    WHERE application_id = p_application_id -- TEXT comparison
    AND is_external = NOT p_reader_is_applicant -- Mark the *other* party's messages as read
    AND read_at IS NULL;
    
    -- Trigger will handle unread count updates
END;
$$;


-- E. Permissions
GRANT EXECUTE ON FUNCTION get_applicant_messages(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION send_applicant_message(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION mark_messages_read(TEXT, BOOLEAN) TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON vista_unread_counts TO anon, authenticated, service_role;
