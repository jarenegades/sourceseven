import { createInternalNeonAuth } from '@neondatabase/auth';
import { SupabaseAuthAdapter } from '@neondatabase/auth/vanilla/adapters';
import type { SupabaseAuthAdapterInstance } from '@neondatabase/auth/vanilla/adapters';
import { supabase } from './supabaseClient';

const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL?.trim();

const neonAuth = neonAuthUrl
  ? createInternalNeonAuth<SupabaseAuthAdapterInstance>(neonAuthUrl, { adapter: SupabaseAuthAdapter() })
  : null;

export const neonAuthClient = neonAuth?.adapter ?? null;

export async function getAuthAccessToken(): Promise<string | null> {
  if (neonAuthClient) {
    try {
      return await neonAuth?.getJWTToken() ?? null;
    } catch (error) {
      console.error('Unable to read Neon Auth session token:', error);
      return null;
    }
  }

  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  return error ? null : data.session?.access_token ?? null;
}
