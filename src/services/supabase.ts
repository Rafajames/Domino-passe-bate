import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase opcional. Sem variáveis de ambiente o app roda 100% offline
 * e os recursos online aparecem como "em breve".
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** Carregado sob demanda: o modo offline não baixa o SDK. */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return client;
}
