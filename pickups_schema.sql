-- Pickups Department Request System
-- Run this in your Supabase SQL Editor (already applied to the live project).
--
-- One flexible table backs the 3 request types (lunch, floor_wave, zebra).
-- Type-specific fields live in the JSONB `details` column so each request
-- type stays clean without a wide, sparse schema.

CREATE TABLE IF NOT EXISTS vista_pickups_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    type TEXT NOT NULL CHECK (type IN ('lunch', 'floor_wave', 'zebra')),
    requester_name TEXT NOT NULL,
    requester_email TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Denied', 'Responded')),
    manager_response TEXT,
    responded_by TEXT,
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pickups_status ON vista_pickups_requests(status);
CREATE INDEX IF NOT EXISTS idx_pickups_type ON vista_pickups_requests(type);
CREATE INDEX IF NOT EXISTS idx_pickups_created ON vista_pickups_requests(created_at DESC);

ALTER TABLE vista_pickups_requests ENABLE ROW LEVEL SECURITY;

-- Staff (anon) can submit requests
DROP POLICY IF EXISTS "Public can submit pickups requests" ON vista_pickups_requests;
CREATE POLICY "Public can submit pickups requests"
ON vista_pickups_requests FOR INSERT
TO public
WITH CHECK (true);

-- Staff can see request status (internal tool, low sensitivity)
DROP POLICY IF EXISTS "Public can view pickups requests" ON vista_pickups_requests;
CREATE POLICY "Public can view pickups requests"
ON vista_pickups_requests FOR SELECT
TO public
USING (true);

-- Only authenticated managers can approve / deny / respond
DROP POLICY IF EXISTS "Managers can update pickups requests" ON vista_pickups_requests;
CREATE POLICY "Managers can update pickups requests"
ON vista_pickups_requests FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated managers can delete
DROP POLICY IF EXISTS "Managers can delete pickups requests" ON vista_pickups_requests;
CREATE POLICY "Managers can delete pickups requests"
ON vista_pickups_requests FOR DELETE
TO authenticated
USING (true);
