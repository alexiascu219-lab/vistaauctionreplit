-- ============================================================================
-- Cart Floor-Plan Layouts — Vista Auction
-- Run this in your Supabase SQL Editor (idempotent, safe to re-run).
--
-- Adds the visual floor-plan editor to the Cart Yard:
--   * vista_cart_layout — one editable layout per area (racks, zones, labels,
--     doors) stored as a JSONB array of elements.
--   * vista_carts.pos_x / pos_y — a cart's position on its area's plan
--     (percent of the canvas, 0..100). NULL means "not placed yet".
-- Requires cart_tracking_schema.sql to have been run first.
-- ============================================================================

ALTER TABLE vista_carts ADD COLUMN IF NOT EXISTS pos_x REAL;
ALTER TABLE vista_carts ADD COLUMN IF NOT EXISTS pos_y REAL;

CREATE TABLE IF NOT EXISTS vista_cart_layout (
    zone       TEXT PRIMARY KEY CHECK (zone IN ('inside', 'outside')),
    elements   JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vista_cart_layout ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON vista_cart_layout TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view cart layout" ON vista_cart_layout;
CREATE POLICY "Public can view cart layout" ON vista_cart_layout FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public can upsert cart layout" ON vista_cart_layout;
CREATE POLICY "Public can upsert cart layout" ON vista_cart_layout FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update cart layout" ON vista_cart_layout;
CREATE POLICY "Public can update cart layout" ON vista_cart_layout FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Save (upsert) an area's layout.
CREATE OR REPLACE FUNCTION carts_save_layout(
    p_zone TEXT, p_elements JSONB, p_by TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE v_zone TEXT := lower(coalesce(p_zone, ''));
BEGIN
    IF v_zone NOT IN ('inside', 'outside') THEN
        RETURN json_build_object('error', 'Invalid area');
    END IF;
    INSERT INTO vista_cart_layout (zone, elements, updated_by, updated_at)
    VALUES (v_zone, coalesce(p_elements, '[]'::jsonb), p_by, now())
    ON CONFLICT (zone) DO UPDATE
        SET elements = EXCLUDED.elements, updated_by = EXCLUDED.updated_by, updated_at = now();
    RETURN json_build_object('ok', true);
END;
$$;

-- Move a cart to an (x,y) on the plan, optionally snapping its spot to a rack.
CREATE OR REPLACE FUNCTION carts_set_position(
    p_id UUID, p_x REAL, p_y REAL, p_spot TEXT DEFAULT NULL, p_by TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE rec RECORD;
BEGIN
    SELECT * INTO rec FROM vista_carts WHERE id = p_id;
    IF rec.id IS NULL THEN RETURN json_build_object('error', 'Cart not found'); END IF;
    UPDATE vista_carts
       SET pos_x = p_x, pos_y = p_y,
           spot = CASE WHEN p_spot IS NOT NULL THEN nullif(trim(p_spot), '') ELSE spot END,
           updated_by = p_by, updated_at = now()
     WHERE id = p_id;
    RETURN json_build_object('ok', true);
END;
$$;

-- Recreate carts_move so switching AREA clears the on-plan position (the cart
-- is now in a different room and needs re-placing there).
CREATE OR REPLACE FUNCTION carts_move(
    p_id UUID, p_zone TEXT, p_spot TEXT DEFAULT NULL, p_by TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_zone TEXT := lower(coalesce(p_zone, ''));
    v_spot TEXT := nullif(trim(coalesce(p_spot, '')), '');
    rec RECORD;
    v_zone_changed BOOLEAN;
BEGIN
    IF v_zone NOT IN ('inside', 'outside') THEN
        RETURN json_build_object('error', 'Pick an area (inside or outside)');
    END IF;
    SELECT * INTO rec FROM vista_carts WHERE id = p_id;
    IF rec.id IS NULL THEN RETURN json_build_object('error', 'Cart not found'); END IF;
    IF rec.zone = v_zone AND coalesce(rec.spot, '') = coalesce(v_spot, '') THEN
        RETURN json_build_object('ok', true, 'unchanged', true);
    END IF;
    v_zone_changed := rec.zone <> v_zone;
    UPDATE vista_carts
       SET zone = v_zone, spot = v_spot, updated_by = p_by, updated_at = now(),
           pos_x = CASE WHEN v_zone_changed THEN NULL ELSE pos_x END,
           pos_y = CASE WHEN v_zone_changed THEN NULL ELSE pos_y END
     WHERE id = p_id;
    INSERT INTO vista_cart_events
        (cart_id, cart_number, action, from_zone, to_zone, from_spot, to_spot, moved_by)
    VALUES (rec.id, rec.cart_number, 'move', rec.zone, v_zone, rec.spot, v_spot, p_by);
    RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION carts_save_layout(TEXT, JSONB, TEXT)              FROM PUBLIC;
REVOKE ALL ON FUNCTION carts_set_position(UUID, REAL, REAL, TEXT, TEXT)  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION carts_save_layout(TEXT, JSONB, TEXT)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION carts_set_position(UUID, REAL, REAL, TEXT, TEXT) TO anon, authenticated;

-- Starter layouts so the editor opens with something to rearrange.
INSERT INTO vista_cart_layout (zone, elements) VALUES
('inside', '[
  {"id":"i-stage","type":"area","x":4,"y":6,"w":40,"h":34,"label":"Staging","color":"amber"},
  {"id":"i-rackA","type":"rack","x":6,"y":52,"w":38,"h":10,"label":"Rack A","color":"slate"},
  {"id":"i-rackB","type":"rack","x":6,"y":70,"w":38,"h":10,"label":"Rack B","color":"slate"},
  {"id":"i-reg","type":"label","x":62,"y":12,"w":26,"h":8,"label":"Registers","color":"slate"},
  {"id":"i-rackC","type":"rack","x":60,"y":34,"w":10,"h":46,"label":"Rack C","color":"slate"},
  {"id":"i-rackD","type":"rack","x":78,"y":34,"w":10,"h":46,"label":"Rack D","color":"slate"},
  {"id":"i-door","type":"door","x":46,"y":86,"w":14,"h":5,"label":"Dock door","color":"emerald"}
]'::jsonb),
('outside', '[
  {"id":"o-store","type":"label","x":3,"y":2.5,"w":21,"h":6,"label":"Storefront","color":"slate"},
  {"id":"o-wall1","type":"wall","x":28.6,"y":2,"w":1.6,"h":58,"label":"","color":"slate"},
  {"id":"o-wall2","type":"wall","x":67.6,"y":2,"w":1.6,"h":26,"label":"","color":"slate"},
  {"id":"o-door","type":"door","x":26.4,"y":25,"w":3.4,"h":9,"label":"Main door","color":"emerald"},
  {"id":"o-552","type":"area","x":4,"y":34,"w":13,"h":25,"label":"552-563","color":"violet"},
  {"id":"o-510","type":"area","x":31,"y":3,"w":13,"h":56,"label":"510-551","color":"amber"},
  {"id":"o-433","type":"area","x":44.5,"y":3,"w":12,"h":56,"label":"433-473","color":"lime"},
  {"id":"o-397","type":"area","x":70,"y":3,"w":20,"h":60,"label":"397-432","color":"sky"},
  {"id":"o-492","type":"area","x":33,"y":72,"w":12,"h":25,"label":"492-509","color":"rose"},
  {"id":"o-474","type":"area","x":46,"y":72,"w":12,"h":25,"label":"474-491","color":"orange"},
  {"id":"o-booth","type":"rack","x":80,"y":66,"w":8,"h":7,"label":"Booth","color":"slate"}
]'::jsonb)
ON CONFLICT (zone) DO NOTHING;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE vista_cart_layout;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
