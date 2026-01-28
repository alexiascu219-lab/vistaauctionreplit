-- MASTER RESUME FIX: Add Storage Columns & Fix Missing Schema (FIXED v7)
-- Run this in your Supabase SQL Editor

DO $$ 
BEGIN 
    -- 1. Add URL Column (for Supabase Storage)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_applications' AND column_name='resume_url') THEN
        ALTER TABLE vista_applications ADD COLUMN resume_url TEXT;
    END IF;

    -- 2. Add Data Column (for Base64 Fallback - Bulletproof)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_applications' AND column_name='resume_data') THEN
        ALTER TABLE vista_applications ADD COLUMN resume_data TEXT;
    END IF;

    -- 3. Ensure full_name and applied_at are correctly named
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_applications' AND column_name='fullName') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vista_applications' AND column_name='full_name') THEN
        ALTER TABLE vista_applications RENAME COLUMN "fullName" TO full_name;
    END IF;
END $$;

-- 4. Enable Storage Bucket Permissions (Optional but Recommended)
-- Note: This requires the storage extension to be enabled in Supabase
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow Public (Anon) Uploads to the 'resumes' bucket
DROP POLICY IF EXISTS "Public_Upload_Resumes" ON storage.objects;
CREATE POLICY "Public_Upload_Resumes" ON storage.objects 
    FOR INSERT TO public 
    WITH CHECK (bucket_id = 'resumes');

-- Allow Public (Anon) View access to those resumes
DROP POLICY IF EXISTS "Public_View_Resumes" ON storage.objects;
CREATE POLICY "Public_View_Resumes" ON storage.objects 
    FOR SELECT TO public 
    USING (bucket_id = 'resumes');
