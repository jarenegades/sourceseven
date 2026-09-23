import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { db } from './db.js';
import { userProfiles } from './schema.js';

export type RequestAuthorization =
  | { authorized: true; userId: string; isAdmin: boolean }
  | { authorized: false; status: 401 | 403 | 503; message: string };

let neonJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getBearerToken(req: VercelRequest): string | null {
  const authorization = req.headers.authorization;
  const match = typeof authorization === 'string'
    ? authorization.match(/^Bearer\s+([^\s]+)$/i)
    : null;
  return match && match[1].length <= 16_384 ? match[1] : null;
}

export async function authenticateRequest(req: VercelRequest): Promise<RequestAuthorization> {
  const token = getBearerToken(req);
  if (!token) return { authorized: false, status: 401, message: 'Authentication required' };

  const neonBaseUrl = process.env.NEON_AUTH_BASE_URL;
  const neonJwksUrl = process.env.NEON_AUTH_JWKS_URL;
  if (neonBaseUrl || neonJwksUrl) {
    if (!neonBaseUrl || !neonJwksUrl) {
      return { authorized: false, status: 503, message: 'Neon Auth server configuration is incomplete' };
    }

    let neonUserId: string;
    try {
      neonJwks ||= createRemoteJWKSet(new URL(neonJwksUrl));
      const { payload } = await jwtVerify(token, neonJwks, { issuer: new URL(neonBaseUrl).origin });
      if (typeof payload.sub !== 'string' || !payload.sub) {
        return { authorized: false, status: 401, message: 'Invalid or expired session' };
      }
      neonUserId = payload.sub;
    } catch (error) {
      console.error('Neon Auth token validation failed:', error instanceof Error ? error.message : 'unknown error');
      return { authorized: false, status: 401, message: 'Invalid or expired session' };
    }

    try {
      const [profile] = await db.select({ isAdmin: userProfiles.isAdmin })
        .from(userProfiles)
        .where(eq(userProfiles.neonAuthUserId, neonUserId))
        .limit(1);

      return { authorized: true, userId: neonUserId, isAdmin: profile?.isAdmin === true };
    } catch (error) {
      console.error('Neon Auth profile lookup failed:', error instanceof Error ? error.message : 'unknown error');
      return { authorized: false, status: 503, message: 'Unable to verify account permissions' };
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { authorized: false, status: 503, message: 'Authentication provider is not configured' };
  }

  try {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // getUser(token) validates the access token with Supabase Auth. Never trust
    // client-supplied metadata or user_metadata as an authorization source.
    const { data: { user }, error: authError } = await client.auth.getUser(token);
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

    return { authorized: true, userId: user.id, isAdmin: profile?.is_admin === true };
  } catch (error) {
    console.error('Supabase admin authorization failed:', error instanceof Error ? error.message : 'unknown error');
    return { authorized: false, status: 503, message: 'Unable to verify administrator access' };
  }
}

export async function authorizeAdmin(req: VercelRequest): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; status: 401 | 403 | 503; message: string }
> {
  const authorization = await authenticateRequest(req);
  if (authorization.authorized === false) return authorization;
  if (!authorization.isAdmin) {
    return { authorized: false, status: 403, message: 'Administrator access required' };
  }
  return { authorized: true, userId: authorization.userId };
}
