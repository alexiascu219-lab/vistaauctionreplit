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


-- ============================================================================
-- PER-MANAGER ACCOUNTS (username/password; separate from HR / Supabase auth)
-- ============================================================================
-- Passwords are bcrypt-hashed via pgcrypto and never leave the database; auth
-- happens through a SECURITY DEFINER RPC. The table has RLS enabled with no
-- policies, so the anon/auth keys cannot read the hashes directly. Accounts
-- are provisioned by an admin (seeded below) — there is no self-signup.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS pickups_managers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

ALTER TABLE pickups_managers ENABLE ROW LEVEL SECURITY;
-- (no policies => no direct client access; use the RPC below)

CREATE OR REPLACE FUNCTION pickups_manager_login(p_username TEXT, p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_username TEXT := lower(trim(p_username));
    rec RECORD;
BEGIN
    SELECT id, name, username, password_hash, active INTO rec
    FROM pickups_managers WHERE username = v_username;
    IF rec.id IS NULL OR rec.active = FALSE
       OR rec.password_hash <> crypt(p_password, rec.password_hash) THEN
        RETURN json_build_object('error', 'Invalid username or password');
    END IF;
    UPDATE pickups_managers SET last_login = now() WHERE id = rec.id;
    RETURN json_build_object('id', rec.id, 'name', rec.name, 'username', rec.username);
END;
$$;

REVOKE ALL ON FUNCTION pickups_manager_login(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pickups_manager_login(TEXT, TEXT) TO anon, authenticated;

-- Provision manager accounts (idempotent; re-running resets the password).
INSERT INTO pickups_managers (name, username, password_hash) VALUES
  ('Tom Bentkovsky',   'tomb',  crypt('tombentkovsky123',    gen_salt('bf'))),
  ('Mark Borishkevich','markb', crypt('markborishkevich123', gen_salt('bf'))),
  ('Kate Kravchenko',  'katek', crypt('katekravchenko123',   gen_salt('bf')))
ON CONFLICT (username) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      name = EXCLUDED.name,
      active = TRUE;
