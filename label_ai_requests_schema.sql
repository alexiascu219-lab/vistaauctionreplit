-- ============================================================================
-- AI label-design requests — the "Claude Routine" queue (Vista Auction)
-- Run in the Supabase SQL editor (idempotent).
--
-- The Label Studio drops a design request here; a Claude Code Routine picks up
-- pending rows, generates the label design JSON, and writes it back. The Studio
-- watches the row (Realtime) and loads the design when status = 'done'.
-- ============================================================================

CREATE TABLE IF NOT EXISTS vista_label_ai_requests (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt       TEXT NOT NULL,
    base         JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { width, height }
    provider     TEXT NOT NULL DEFAULT 'claude',
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'processing', 'done', 'error')),
    result       JSONB,                                -- the generated template model
    error        TEXT,
    image        TEXT,                                 -- optional base64 JPEG data URL (vision reference)
    requested_by TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Reference image for vision designs (added after initial deploy).
ALTER TABLE vista_label_ai_requests ADD COLUMN IF NOT EXISTS image TEXT;

CREATE INDEX IF NOT EXISTS idx_label_ai_status  ON vista_label_ai_requests(status);
CREATE INDEX IF NOT EXISTS idx_label_ai_created ON vista_label_ai_requests(created_at DESC);

ALTER TABLE vista_label_ai_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON vista_label_ai_requests TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view ai requests" ON vista_label_ai_requests;
CREATE POLICY "Public can view ai requests" ON vista_label_ai_requests FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public can insert ai requests" ON vista_label_ai_requests;
CREATE POLICY "Public can insert ai requests" ON vista_label_ai_requests FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update ai requests" ON vista_label_ai_requests;
CREATE POLICY "Public can update ai requests" ON vista_label_ai_requests FOR UPDATE TO public USING (true) WITH CHECK (true);

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE vista_label_ai_requests;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
