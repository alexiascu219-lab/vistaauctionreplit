import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lovfbqnuxdihjidxacet.supabase.co';
const supabaseAnonKey = 'sb_secret_JeCHXZLTwcm2_En1kW8pKw_qni86lQC';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
