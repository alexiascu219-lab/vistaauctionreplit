-- Add tracking columns to messaging table
ALTER TABLE vista_applicant_messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

-- View for HR Portal to easily see unread counts per applicant
CREATE OR REPLACE VIEW vista_unread_counts AS
SELECT 
    application_id, 
    COUNT(*) as unread_count
FROM vista_applicant_messages
WHERE is_external = true -- Message sent BY Applicant
AND read_at IS NULL      -- Not yet read by HR
GROUP BY application_id;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_application_id UUID, p_reader_is_applicant BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE vista_applicant_messages
    SET read_at = NOW()
    WHERE application_id = p_application_id
    AND is_external = NOT p_reader_is_applicant -- Mark the *other* party's messages as read
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for Google Script to check for unread messages > 5 mins old
CREATE OR REPLACE FUNCTION get_pending_chat_notifications()
RETURNS TABLE (
    msg_id BIGINT,
    applicant_email TEXT,
    applicant_name TEXT,
    message_content TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        a.email,
        a.full_name,
        m.content
    FROM vista_applicant_messages m
    JOIN vista_applications a ON m.application_id = a.id
    WHERE 
        m.is_external = false -- Message sent BY HR
        AND m.read_at IS NULL -- Not yet seen by applicant
        AND m.email_sent = false -- Not yet emailed
        AND m.created_at < (NOW() - INTERVAL '5 minutes'); -- 5 minute delay
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as sent (Batch update)
CREATE OR REPLACE FUNCTION mark_chat_notifications_sent(p_msg_ids BIGINT[])
RETURNS VOID AS $$
BEGIN
    UPDATE vista_applicant_messages
    SET email_sent = true
    WHERE id = ANY(p_msg_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION mark_messages_read TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_pending_chat_notifications TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION mark_chat_notifications_sent TO anon, authenticated, service_role;
GRANT SELECT ON vista_unread_counts TO anon, authenticated, service_role;
