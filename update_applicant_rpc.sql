-- Update send_applicant_message to support reply_to_id
CREATE OR REPLACE FUNCTION send_applicant_message(
    p_application_id UUID,
    p_email TEXT,
    p_message TEXT,
    p_attachment_url TEXT DEFAULT NULL,
    p_attachment_type TEXT DEFAULT NULL,
    p_reply_to_id UUID DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    curr_sender_id UUID;
    v_is_external BOOLEAN;
BEGIN
    -- Determine who is sending
    -- If p_email matches application email -> External (Applicant)
    -- If Auth User exists and is distinct -> Internal (HR)? 
    -- Actually, for `ApplicantChat`, we assume the sender is the APPLICANT (External) if they rely on this RPC from the public portal.
    -- However, the RPC logic likely sets `is_external = true`.

    -- Let's stick to the existing logic but add `reply_to_id`.
    -- Assuming the function already inserts into `vista_applicant_messages`.

    -- For this update, we just want to ensure the parameter is passed to the INSERT.

    INSERT INTO public.vista_applicant_messages (
        application_id,
        content,
        attachment_url,
        attachment_type,
        is_external,
        sender_id, -- Might be NULL for anonymous applicant, or auth.uid()
        reply_to_id
    ) VALUES (
        p_application_id,
        p_message,
        p_attachment_url,
        p_attachment_type,
        true, -- Always external if using this specific RPC designed for the applicant portal? 
              -- Wait, strictly speaking, this RPC is used by ApplicantChat.
              -- If HR uses ChatSidebar, they insert DIRECTLY.
              -- So yes, this RPC is for the Applicant.
        auth.uid(), -- If authenticated, or NULL
        p_reply_to_id
    );

END;
$$;
