-- ============================================================================
-- Label Studio — reusable sticker templates (Vista Auction)
-- Run in the Supabase SQL editor (idempotent).
--
-- Each template is a small design model: label size in dots + a list of
-- elements (text, barcode, box, line) whose values can contain ${variables}.
-- The web Label Studio edits these; printing renders them to ZPL and drops the
-- result into vista_print_jobs.data.zpl so the print agent prints it verbatim.
-- ============================================================================

CREATE TABLE IF NOT EXISTS vista_label_templates (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    width       INT NOT NULL DEFAULT 609,   -- dots (3" @ 203 dpi)
    height      INT NOT NULL DEFAULT 406,   -- dots (2" @ 203 dpi)
    dpi         INT NOT NULL DEFAULT 203,
    variables   JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{key,label,default}]
    elements    JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{id,type,x,y,...}]
    archived    BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_label_templates_updated ON vista_label_templates(updated_at DESC);

ALTER TABLE vista_label_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON vista_label_templates TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view label templates" ON vista_label_templates;
CREATE POLICY "Public can view label templates" ON vista_label_templates FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public can insert label templates" ON vista_label_templates;
CREATE POLICY "Public can insert label templates" ON vista_label_templates FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update label templates" ON vista_label_templates;
CREATE POLICY "Public can update label templates" ON vista_label_templates FOR UPDATE TO public USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public can delete label templates" ON vista_label_templates;
CREATE POLICY "Public can delete label templates" ON vista_label_templates FOR DELETE TO public USING (true);

-- ---- Seed: a cart sticker + a big lot-number tag (only when table is empty)
DO $seed$
BEGIN
IF NOT EXISTS (SELECT 1 FROM vista_label_templates) THEN
INSERT INTO vista_label_templates (name, description, width, height, dpi, variables, elements) VALUES
(
  'Cart sticker', '3" x 2" cart tag — scannable QR + big cart number', 609, 406, 203,
  '[
    {"key":"cart_number","label":"Cart number","default":"302"},
    {"key":"prefix","label":"Location prefix","default":"CLT1-GL"}
  ]'::jsonb,
  '[
    {"id":"qr","type":"barcode","x":40,"y":44,"module":10,"symbology":"qr","value":"${prefix}-${cart_number#4}"},
    {"id":"cd","type":"text","x":41,"y":262,"w":208,"size":26,"align":"center","value":"${prefix}-${cart_number#4}"},
    {"id":"nm","type":"text","x":258,"y":92,"w":341,"size":150,"align":"center","font":"archivo","value":"${cart_number}"},
    {"id":"st","type":"text","x":10,"y":352,"w":589,"size":28,"align":"center","value":"Vistaauction.com"}
  ]'::jsonb
),
(
  'Lot number (large)', 'Big centered lot number', 609, 406, 203,
  '[{"key":"number","label":"Lot number","default":"397"}]'::jsonb,
  '[
    {"id":"t1","type":"text","x":30,"y":34,"size":34,"value":"VISTA AUCTION"},
    {"id":"l1","type":"line","x":30,"y":92,"w":549,"thickness":3,"orient":"h"},
    {"id":"t2","type":"text","x":40,"y":150,"size":200,"value":"${number}"},
    {"id":"b1","type":"barcode","x":40,"y":360,"height":36,"module":2,"symbology":"code128","showText":true,"value":"${number}"}
  ]'::jsonb
);
END IF;
END $seed$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE vista_label_templates;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
