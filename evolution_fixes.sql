-- 1. Performance Optimization: Indexing
CREATE INDEX IF NOT EXISTS idx_vista_applications_email_lower ON vista_applications (LOWER(email));

-- 2. Standardize Schema (Safety First)
DO $$ 
BEGIN 
    -- Rename fullName to full_name ONLY if full_name doesn't already exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_applications' AND column_name='fullName') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_applications' AND column_name='full_name') THEN
        ALTER TABLE vista_applications RENAME COLUMN "fullName" TO full_name;
    END IF;

    -- Rename appliedAt to applied_at ONLY if applied_at doesn't already exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_applications' AND column_name='appliedAt') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_applications' AND column_name='applied_at') THEN
        ALTER TABLE vista_applications RENAME COLUMN "appliedAt" TO applied_at;
    END IF;

    -- Ensure status has a default
    ALTER TABLE vista_applications ALTER COLUMN status SET DEFAULT 'New';

    -- Add New Fields (Columns for referrals, experience, and interview data)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_applications' AND column_name='referring_employee') THEN
        ALTER TABLE vista_applications ADD COLUMN referring_employee TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_applications' AND column_name='other_authorizations') THEN
        ALTER TABLE vista_applications ADD COLUMN other_authorizations TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_applications' AND column_name='previous_experience') THEN
        ALTER TABLE vista_applications ADD COLUMN previous_experience TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_applications' AND column_name='interview_date') THEN
        ALTER TABLE vista_applications ADD COLUMN interview_date TIMESTAMPTZ;
    END IF;
    
END $$;

-- 3. High-Performance Static RPC (Fixed with explicit UUID casting)
-- We use id::UUID to ensure the return type matches the TABLE declaration.
DROP FUNCTION IF EXISTS check_application_status(text, text);
CREATE OR REPLACE FUNCTION check_application_status(p_email TEXT, p_full_name TEXT) 
RETURNS TABLE (
    id UUID, 
    status TEXT, 
    applied_at TIMESTAMPTZ, 
    "position" TEXT,
    full_name TEXT
) 
LANGUAGE sql
SECURITY DEFINER 
STABLE
AS $$
    SELECT 
        id::UUID, -- Explicit cast to UUID to resolve type mismatch errors
        status, 
        COALESCE(applied_at, now()) as applied_at, 
        COALESCE(position, 'Applicant') as "position",
        full_name
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