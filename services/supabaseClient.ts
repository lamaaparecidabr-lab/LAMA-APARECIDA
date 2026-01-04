
import { createClient } from '@supabase/supabase-js';

// No Supabase, a Anon Key é pública por design, mas priorizamos o ambiente
// Fix: Use process.env instead of import.meta.env to avoid TypeScript property 'env' errors on ImportMeta
const supabaseUrl = (process.env.SUPABASE_URL || 'https://lvlflziahcthajmlgmme.supabase.co').trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_4REfrYkRKt-FLbLetrbagw_bvu-JItj').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Atenção: Credenciais do Supabase não detectadas. Verifique as Variáveis de Ambiente.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
