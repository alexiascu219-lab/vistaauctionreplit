-- FIX: CHAT SENDER ATTRIBUTION BUG
-- Problem: 'send_applicant_message' was marking messages as 'Internal' (is_external = false).
-- Result: Applicant messages looked like they came from HR.
-- Fix: Set is_external = TRUE for this function (since it is used by Applicants).

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
        is_external,  -- <--- THE FIX
        attachment_url,
        attachment_type
    ) VALUES (
        p_application_id,
        p_application_id, 
        p_message,
        TRUE,         -- <--- CHANGED FROM FALSE TO TRUE. Applicant = External.
        p_attachment_url,
        p_attachment_type
    );

    -- Trigger will handle unread count updates automatically
END;
$$;

-- Grant permissions again just to be safe
GRANT EXECUTE ON FUNCTION send_applicant_message(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
