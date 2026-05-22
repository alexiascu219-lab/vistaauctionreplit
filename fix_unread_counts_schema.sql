-- FIX: Convert 'vista_unread_counts' from a View to a Real Table with Trigger
-- VERSION 2: Uses TEXT for application_id (matching vista_applications schema)

-- 1. Drop existing objects
DROP VIEW IF EXISTS vista_unread_counts;
DROP TABLE IF EXISTS vista_unread_counts; -- In case it exists

-- 2. Create Real Table
-- CRITICAL CHANGE: application_id is TEXT, not UUID, to match vista_applications.id
CREATE TABLE vista_unread_counts (
    application_id TEXT PRIMARY KEY REFERENCES vista_applications(id) ON DELETE CASCADE,
    unread_count INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Seed Initial Data
INSERT INTO vista_unread_counts (application_id, unread_count, last_updated)
SELECT 
    application_id, -- This is already text in the messages table
    COUNT(*), 
    MAX(created_at)
FROM vista_applicant_messages
WHERE is_external = true AND read_at IS NULL
GROUP BY application_id;

-- 4. Create Trigger to keeping it valid automatically
CREATE OR REPLACE FUNCTION update_unread_count_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- If New Message (External & Unread)
    IF (TG_OP = 'INSERT') AND (NEW.is_external = true) AND (NEW.read_at IS NULL) THEN
        INSERT INTO vista_unread_counts (application_id, unread_count, last_updated)
        VALUES (NEW.application_id, 1, NOW())
        ON CONFLICT (application_id)
        DO UPDATE SET 
            unread_count = vista_unread_counts.unread_count + 1,
            last_updated = NOW();
    
    -- If Message Read
    ELSIF (TG_OP = 'UPDATE') AND (OLD.read_at IS NULL) AND (NEW.read_at IS NOT NULL) AND (NEW.is_external = true) THEN
        UPDATE vista_unread_counts
        SET unread_count = GREATEST(0, unread_count - 1),
            last_updated = NOW()
        WHERE application_id = NEW.application_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach Trigger (Optional but good hygiene)
DROP TRIGGER IF EXISTS trg_update_unread_count ON vista_applicant_messages;
CREATE TRIGGER trg_update_unread_count
AFTER INSERT OR UPDATE ON vista_applicant_messages
FOR EACH ROW EXECUTE FUNCTION update_unread_count_trigger();

-- 6. Grant Access
GRANT SELECT, INSERT, UPDATE, DELETE ON vista_unread_counts TO anon, authenticated, service_role;
