
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://unrlbtgidichndjzevtv.supabase.co';
const supabaseAnonKey = 'sb_publishable_83RWqDN1dWvczMxB6zFDPQ_cR7HiGwK';

/**
 * L.A.M.A. SUPABASE CLIENT
 * Integração oficial com o backend Supabase.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
