-- 1. Add scheduling-specific columns to vista_applications
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_applications' AND column_name='reschedule_requested') THEN
        ALTER TABLE vista_applications ADD COLUMN reschedule_requested BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_applications' AND column_name='suggested_interview_date') THEN
        ALTER TABLE vista_applications ADD COLUMN suggested_interview_date TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Update RPC to include new fields and ensure field naming consistency
-- We keep the existing check_application_status signature but add columns to the RETURN TABLE
DROP FUNCTION IF EXISTS check_application_status(text, text);
CREATE OR REPLACE FUNCTION check_application_status(p_email TEXT, p_full_name TEXT) 
RETURNS TABLE (
    id UUID, 
    status TEXT, 
    applied_at TIMESTAMPTZ, 
    "position" TEXT,
    full_name TEXT,
    interview_date TIMESTAMPTZ,
    reschedule_requested BOOLEAN,
    suggested_interview_date TIMESTAMPTZ
) 
LANGUAGE sql
SECURITY DEFINER 
STABLE
AS $$
    SELECT 
        id::UUID,
        status, 
        COALESCE(applied_at, now()) as applied_at, 
        COALESCE(position, 'Applicant') as "position",
        full_name,
        interview_date,
        COALESCE(reschedule_requested, FALSE) as reschedule_requested,
        suggested_interview_date
    FROM vista_applications 
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
    AND (
        LOWER(full_name) ILIKE '%' || LOWER(TRIM(p_full_name)) || '%'
        OR LOWER(TRIM(p_full_name)) ILIKE '%' || LOWER(full_name) || '%'
    )
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION check_application_status(text, text) TO anon;
GRANT EXECUTE ON FUNCTION check_application_status(text, text) TO authenticated;
