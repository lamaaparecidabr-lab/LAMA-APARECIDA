
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://unrlbtgidichndjzevtv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_83RWqDN1dWvczMxB6zFDPQ_cR7HiGwK';

/**
 * L.A.M.A. SUPABASE CLIENT
 * Integração oficial com o backend Supabase.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Log to help diagnose "Failed to fetch"
if (!import.meta.env.VITE_SUPABASE_URL && supabaseUrl.includes('unrlbtgidichndjzevtv')) {
  console.warn("Supabase: Usando URL fallback. Se encontrar 'Failed to fetch', verifique suas variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
}
