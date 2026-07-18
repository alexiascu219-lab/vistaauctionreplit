import { createClient } from '@supabase/supabase-js';

// Public project URL + publishable (anon) key. These are safe to ship — they're
// already in the browser bundle and every table is gated by Row Level Security.
// Kept as fallbacks so the app works even if the VITE_ env vars aren't set on
// the host; a real VITE_SUPABASE_* env var always wins when present.
const SUPABASE_URL_FALLBACK = 'https://lovfbqnuxdihjidxacet.supabase.co';
const SUPABASE_ANON_FALLBACK = 'sb_publishable_xnr_6Ad9e9_-tgfOrXsGtw_z6oxB6X_';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_FALLBACK;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
