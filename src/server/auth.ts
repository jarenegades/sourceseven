import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

export type AdminAuthorization =
  | { authorized: true; userId: string }
  | { authorized: false; status: 401 | 403 | 503; message: string };

export async function authorizeSupabaseAdmin(req: VercelRequest): Promise<AdminAuthorization> {
  const authorization = req.headers.authorization;
  const match = typeof authorization === 'string'
    ? authorization.match(/^Bearer\s+([^\s]+)$/i)
    : null;

  if (!match || match[1].length > 16_384) {
    return { authorized: false, status: 401, message: 'Authentication required' };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { authorized: false, status: 503, message: 'Authentication provider is not configured' };
  }

  try {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${match[1]}` } },
    });

    // getUser(token) validates the access token with Supabase Auth. Never trust
    // client-supplied metadata or user_metadata as an authorization source.
    const { data: { user }, error: authError } = await client.auth.getUser(match[1]);
    if (authError || !user) {
      return { authorized: false, status: 401, message: 'Invalid or expired session' };
    }

    // RLS permits a user to read only their own profile; is_admin in this
    // trusted row is the authorization authority for these product writes.
    const { data: profile, error: profileError } = await client
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Admin profile lookup failed:', profileError.message);
      return { authorized: false, status: 503, message: 'Unable to verify administrator access' };
    }
    if (profile?.is_admin !== true) {
      return { authorized: false, status: 403, message: 'Administrator access required' };
    }

    return { authorized: true, userId: user.id };
  } catch (error) {
    console.error('Supabase admin authorization failed:', error instanceof Error ? error.message : 'unknown error');
    return { authorized: false, status: 503, message: 'Unable to verify administrator access' };
  }
}
