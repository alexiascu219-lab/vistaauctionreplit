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

-- The manager portal uses its own passcode gate (not Supabase auth), so
-- approve/deny/respond run with the anon key. Updates/deletes are public,
-- consistent with the public insert/select policies on this low-sensitivity
-- internal table.
DROP POLICY IF EXISTS "Public can update pickups requests" ON vista_pickups_requests;
CREATE POLICY "Public can update pickups requests"
ON vista_pickups_requests FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete pickups requests" ON vista_pickups_requests;
CREATE POLICY "Public can delete pickups requests"
ON vista_pickups_requests FOR DELETE
TO public
USING (true);
