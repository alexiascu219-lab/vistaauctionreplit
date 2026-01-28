-- ==============================================================================
-- SECURE SCHEDULING RPC
-- Purpose: Allow anonymous candidates to confirm their interview slots securely.
-- Why? Direct UPDATE permissions on the public table are too risky.
-- ==============================================================================

-- 1. Clean up potential duplicates (Fixes PGRST203 Ambiguity)
DROP FUNCTION IF EXISTS confirm_candidate_interview(UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS confirm_candidate_interview(TEXT, TIMESTAMPTZ);

-- 2. Create the Function (Runs as Admin)
CREATE OR REPLACE FUNCTION confirm_candidate_interview(
    p_application_id TEXT, -- Changed to TEXT to prevent client-side type issues
    p_interview_date TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: Bypasses RLS by running as owner
AS $$
BEGIN
    UPDATE vista_applications
    SET 
        status = 'Interviewing',
        -- Only update interview_date if a value is provided. 
        -- If NULL (Manual Layout), keep the Webhook's value.
        interview_date = COALESCE(p_interview_date, interview_date),
        reschedule_requested = false,
        notes = COALESCE(notes, '') || E'\n[System]: Interview confirmed via Scheduler.'
    WHERE id::text = p_application_id; -- Explicit cast ensures match whether ID is UUID or TEXT
END;
$$;

-- 2. Grant Access to the Public (Anonymous Users)
-- This allows the Schedule Page to call this function without being logged in.
GRANT EXECUTE ON FUNCTION confirm_candidate_interview(TEXT, TIMESTAMPTZ) TO anon;
GRANT EXECUTE ON FUNCTION confirm_candidate_interview(TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_candidate_interview(TEXT, TIMESTAMPTZ) TO service_role;

-- 3. Verification Output
SELECT 'Function confirm_candidate_interview created successfully' as result;
