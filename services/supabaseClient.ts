
import { createClient } from '@supabase/supabase-js';

// Sanitização robusta: remove aspas simples, duplas e espaços extras que o Vercel pode incluir
const sanitizeEnv = (val?: string) => val?.replace(/['"]/g, '').trim() || '';

const supabaseUrl = sanitizeEnv(process.env.SUPABASE_URL || 'https://lvlflziahcthajmlgmme.supabase.co');
const supabaseAnonKey = sanitizeEnv(process.env.SUPABASE_ANON_KEY || 'sb_publishable_4REfrYkRKt-FLbLetrbagw_bvu-JItj');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Radar Offline: Credenciais do Supabase não detectadas.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
