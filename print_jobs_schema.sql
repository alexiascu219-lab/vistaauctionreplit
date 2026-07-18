-- ============================================================================
-- Sticker Print Queue — Vista Auction
-- Run this in your Supabase SQL Editor (idempotent, safe to re-run).
--
-- Every "print a sticker" request — from the cart board, from a Siri voice
-- command, or from the API — lands here as a QUEUED job. A small print agent
-- running on the Windows PC next to the Zebra printer polls this table (via the
-- /api/print endpoint), prints each job on Zebra hardware, and marks it done.
--
--   queued  -> a job is waiting to be printed
--   printing-> the agent has claimed it and is sending it to the printer
--   printed -> success
--   error   -> the agent hit a problem (see error column)
--   canceled-> a human canceled it before it printed
-- ============================================================================

CREATE TABLE IF NOT EXISTS vista_print_jobs (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    template      TEXT NOT NULL DEFAULT 'cart_label',  -- which label design to use
    title         TEXT,                                -- human summary, e.g. "Cart 12"
    data          JSONB NOT NULL DEFAULT '{}'::jsonb,  -- variables for the template
    quantity      INT  NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 50),
    status        TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'printing', 'printed', 'error', 'canceled')),
    source        TEXT NOT NULL DEFAULT 'web'          -- web | cart | siri | api
                  CHECK (source IN ('web', 'cart', 'siri', 'api')),
    requested_by  TEXT,
    printer       TEXT,                                -- optional target printer name
    claimed_at    TIMESTAMPTZ,
    printed_at    TIMESTAMPTZ,
    error         TEXT,
    agent         TEXT                                 -- which agent machine handled it
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_status  ON vista_print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created ON vista_print_jobs(created_at DESC);

ALTER TABLE vista_print_jobs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON vista_print_jobs TO anon, authenticated;

-- Low-sensitivity internal tool: the web app writes/reads with the anon key.
-- The public /api/print endpoints add a shared-secret gate on top so random
-- visitors can't queue prints, and the print agent authenticates with its own
-- key. (See api/print.js and print-agent/.)
DROP POLICY IF EXISTS "Public can view print jobs" ON vista_print_jobs;
CREATE POLICY "Public can view print jobs" ON vista_print_jobs FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can insert print jobs" ON vista_print_jobs;
CREATE POLICY "Public can insert print jobs" ON vista_print_jobs FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update print jobs" ON vista_print_jobs;
CREATE POLICY "Public can update print jobs" ON vista_print_jobs FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete print jobs" ON vista_print_jobs;
CREATE POLICY "Public can delete print jobs" ON vista_print_jobs FOR DELETE TO public USING (true);

-- Optional: live queue updates across every station.
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE vista_print_jobs;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
