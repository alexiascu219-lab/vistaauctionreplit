import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lovfbqnuxdihjidxacet.supabase.co';
const supabaseAnonKey = 'sb_publishable_xnr_6Ad9e9_-tgfOrXsGtw_z6oxB6X_';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
