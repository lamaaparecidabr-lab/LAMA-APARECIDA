
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://rvlcokbfaoksfxyevdys.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2bGNva2JmYW9rc2Z4eWV2ZHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1ODQ5MTYsImV4cCI6MjA5NDE2MDkxNn0.B-BgX6uV6piRIuLyemNNyQHiY--rN-9ysoAwdISSldI').trim();

/**
 * L.A.M.A. SUPABASE CLIENT
 * Integração oficial com o backend Supabase.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Log to help diagnose "Failed to fetch"
if (!import.meta.env.VITE_SUPABASE_URL && supabaseUrl.includes('unrlbtgidichndjzevtv')) {
  console.warn("Supabase: Usando URL fallback. Se encontrar 'Failed to fetch', verifique suas variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
}

// Check for suspicious key format
if (supabaseAnonKey.startsWith('sb_publishable_')) {
  console.error("Supabase: A chave 'sb_publishable_...' parece ser do Clerk e não do Supabase. Verifique sua VITE_SUPABASE_ANON_KEY (deve começar com eyJ...).");
}
