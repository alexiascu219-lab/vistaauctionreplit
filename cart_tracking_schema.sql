-- ============================================================================
-- Cart Location Tracking — Vista Auction
-- Run this in your Supabase SQL Editor (safe to re-run; it is idempotent).
--
-- Tracks every physical cart and which AREA it is in right now: the INSIDE
-- area or the OUTSIDE carts area. Every move is written to an event log so the
-- board can show a live activity feed and per-cart history.
--
-- Design mirrors the Pickups department tables: this is a low-sensitivity
-- internal tool, so the anon key is allowed to read/write through public RLS
-- policies, and atomic writes go through SECURITY DEFINER RPCs.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- CARTS: one row per physical cart, holding its CURRENT location.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vista_carts (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cart_number TEXT NOT NULL UNIQUE,               -- e.g. "12", "A3", "Blue-4"
    zone        TEXT NOT NULL DEFAULT 'inside'
                CHECK (zone IN ('inside', 'outside')),
    spot        TEXT,                               -- optional exact spot, e.g. "Bay 3", "By the ramp"
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'attention', 'out_of_service')),
    notes       TEXT,
    updated_by  TEXT,                               -- who last moved / touched it
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carts_zone   ON vista_carts(zone);
CREATE INDEX IF NOT EXISTS idx_carts_status ON vista_carts(status);
CREATE INDEX IF NOT EXISTS idx_carts_number ON vista_carts(cart_number);

ALTER TABLE vista_carts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON vista_carts TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view carts" ON vista_carts;
CREATE POLICY "Public can view carts" ON vista_carts FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can insert carts" ON vista_carts;
CREATE POLICY "Public can insert carts" ON vista_carts FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update carts" ON vista_carts;
CREATE POLICY "Public can update carts" ON vista_carts FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete carts" ON vista_carts;
CREATE POLICY "Public can delete carts" ON vista_carts FOR DELETE TO public USING (true);

-- ---------------------------------------------------------------------------
-- CART EVENTS: append-only log of everything that happens to a cart.
-- cart_number is denormalized so history survives even if a cart is deleted.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vista_cart_events (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cart_id     UUID REFERENCES vista_carts(id) ON DELETE SET NULL,
    cart_number TEXT NOT NULL,
    action      TEXT NOT NULL DEFAULT 'move'
                CHECK (action IN ('move', 'create', 'status', 'note', 'print', 'delete')),
    from_zone   TEXT,
    to_zone     TEXT,
    from_spot   TEXT,
    to_spot     TEXT,
    moved_by    TEXT,
    note        TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_events_created ON vista_cart_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_events_cart    ON vista_cart_events(cart_id);

ALTER TABLE vista_cart_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON vista_cart_events TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view cart events" ON vista_cart_events;
CREATE POLICY "Public can view cart events" ON vista_cart_events FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can insert cart events" ON vista_cart_events;
CREATE POLICY "Public can insert cart events" ON vista_cart_events FOR INSERT TO public WITH CHECK (true);

-- ============================================================================
-- RPCs — atomic writes (update cart + append event in one call).
-- All run with the anon key; the app calls these instead of touching the two
-- tables separately so the board and the history never drift apart.
-- ============================================================================

-- Add a brand-new cart (or return a clear error if the number is taken).
CREATE OR REPLACE FUNCTION carts_add(
    p_cart_number TEXT,
    p_zone TEXT DEFAULT 'inside',
    p_spot TEXT DEFAULT NULL,
    p_by TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_number TEXT := trim(p_cart_number);
    v_zone   TEXT := lower(coalesce(p_zone, 'inside'));
    v_id     UUID;
BEGIN
    IF v_number IS NULL OR v_number = '' THEN
        RETURN json_build_object('error', 'Cart number is required');
    END IF;
    IF v_zone NOT IN ('inside', 'outside') THEN
        v_zone := 'inside';
    END IF;
    IF EXISTS (SELECT 1 FROM vista_carts WHERE lower(cart_number) = lower(v_number)) THEN
        RETURN json_build_object('error', 'Cart ' || v_number || ' already exists');
    END IF;

    INSERT INTO vista_carts (cart_number, zone, spot, updated_by)
    VALUES (v_number, v_zone, nullif(trim(coalesce(p_spot, '')), ''), p_by)
    RETURNING id INTO v_id;

    INSERT INTO vista_cart_events (cart_id, cart_number, action, to_zone, to_spot, moved_by, note)
    VALUES (v_id, v_number, 'create', v_zone, nullif(trim(coalesce(p_spot, '')), ''), p_by, 'Cart added');

    RETURN json_build_object('ok', true, 'id', v_id);
END;
$$;

-- Move a cart to a zone (and optionally an exact spot). No-ops that don't
-- change anything still succeed but are not logged, to keep the feed clean.
CREATE OR REPLACE FUNCTION carts_move(
    p_id UUID,
    p_zone TEXT,
    p_spot TEXT DEFAULT NULL,
    p_by TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_zone TEXT := lower(coalesce(p_zone, ''));
    v_spot TEXT := nullif(trim(coalesce(p_spot, '')), '');
    rec RECORD;
BEGIN
    IF v_zone NOT IN ('inside', 'outside') THEN
        RETURN json_build_object('error', 'Pick an area (inside or outside)');
    END IF;

    SELECT * INTO rec FROM vista_carts WHERE id = p_id;
    IF rec.id IS NULL THEN
        RETURN json_build_object('error', 'Cart not found');
    END IF;

    -- Nothing actually changed — succeed quietly without a log entry.
    IF rec.zone = v_zone AND coalesce(rec.spot, '') = coalesce(v_spot, '') THEN
        RETURN json_build_object('ok', true, 'unchanged', true);
    END IF;

    UPDATE vista_carts
       SET zone = v_zone, spot = v_spot, updated_by = p_by, updated_at = now()
     WHERE id = p_id;

    INSERT INTO vista_cart_events
        (cart_id, cart_number, action, from_zone, to_zone, from_spot, to_spot, moved_by)
    VALUES
        (rec.id, rec.cart_number, 'move', rec.zone, v_zone, rec.spot, v_spot, p_by);

    RETURN json_build_object('ok', true);
END;
$$;

-- Update a cart's status (active / attention / out_of_service) and/or notes.
CREATE OR REPLACE FUNCTION carts_set_status(
    p_id UUID,
    p_status TEXT,
    p_notes TEXT DEFAULT NULL,
    p_by TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_status TEXT := lower(coalesce(p_status, ''));
    rec RECORD;
BEGIN
    IF v_status NOT IN ('active', 'attention', 'out_of_service') THEN
        RETURN json_build_object('error', 'Invalid status');
    END IF;
    SELECT * INTO rec FROM vista_carts WHERE id = p_id;
    IF rec.id IS NULL THEN
        RETURN json_build_object('error', 'Cart not found');
    END IF;

    UPDATE vista_carts
       SET status = v_status,
           notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
           updated_by = p_by, updated_at = now()
     WHERE id = p_id;

    INSERT INTO vista_cart_events (cart_id, cart_number, action, moved_by, note)
    VALUES (rec.id, rec.cart_number, 'status', p_by,
            'Status → ' || v_status || coalesce(' · ' || nullif(trim(coalesce(p_notes, '')), ''), ''));

    RETURN json_build_object('ok', true);
END;
$$;

-- Remove a cart (logs a final 'delete' event so history is preserved).
CREATE OR REPLACE FUNCTION carts_remove(
    p_id UUID,
    p_by TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    rec RECORD;
BEGIN
    SELECT * INTO rec FROM vista_carts WHERE id = p_id;
    IF rec.id IS NULL THEN
        RETURN json_build_object('error', 'Cart not found');
    END IF;

    INSERT INTO vista_cart_events (cart_id, cart_number, action, from_zone, from_spot, moved_by, note)
    VALUES (NULL, rec.cart_number, 'delete', rec.zone, rec.spot, p_by, 'Cart removed');

    DELETE FROM vista_carts WHERE id = p_id;
    RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION carts_add(TEXT, TEXT, TEXT, TEXT)         FROM PUBLIC;
REVOKE ALL ON FUNCTION carts_move(UUID, TEXT, TEXT, TEXT)        FROM PUBLIC;
REVOKE ALL ON FUNCTION carts_set_status(UUID, TEXT, TEXT, TEXT)  FROM PUBLIC;
REVOKE ALL ON FUNCTION carts_remove(UUID, TEXT)                  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION carts_add(TEXT, TEXT, TEXT, TEXT)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION carts_move(UUID, TEXT, TEXT, TEXT)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION carts_set_status(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION carts_remove(UUID, TEXT)                 TO anon, authenticated;

-- ============================================================================
-- SEED: a starter fleet so the board isn't empty on first load.
-- Safe to keep — ON CONFLICT DO NOTHING means re-running never duplicates.
-- Delete these rows once you've added your real carts.
-- ============================================================================
INSERT INTO vista_carts (cart_number, zone, spot, status) VALUES
    ('1',  'inside',  'Staging',        'active'),
    ('2',  'inside',  'Staging',        'active'),
    ('3',  'inside',  'Register lane',  'active'),
    ('4',  'inside',  NULL,             'active'),
    ('5',  'inside',  NULL,             'attention'),
    ('6',  'outside', 'By the ramp',    'active'),
    ('7',  'outside', 'By the ramp',    'active'),
    ('8',  'outside', 'Loading dock',   'active'),
    ('9',  'outside', NULL,             'active'),
    ('10', 'outside', NULL,             'out_of_service')
ON CONFLICT (cart_number) DO NOTHING;

-- Optional: enable Supabase Realtime so every station's board updates live.
-- (Ignore the "already member" notice if you run this twice.)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE vista_carts;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE vista_cart_events;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
