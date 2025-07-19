// src/js/supabaseClient.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
