import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { VercelRequest } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { db, pool } from './db.js';
import { userProfiles } from './schema.js';
import { getActiveNeonSession, isMfaSessionVerified } from './mfa.js';

export type RequestAuthorization =
  | { authorized: true; userId: string; isAdmin: boolean }
  | { authorized: false; status: 401 | 403 | 428 | 503; message: string };

let neonJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getBearerToken(req: VercelRequest): string | null {
  const authorization = req.headers.authorization;
  const match = typeof authorization === 'string'
    ? authorization.match(/^Bearer\s+([^\s]+)$/i)
    : null;
  return match && match[1].length <= 16_384 ? match[1] : null;
}

export async function authenticateRequest(req: VercelRequest, options: { allowUnverifiedMfa?: boolean } = {}): Promise<RequestAuthorization> {
  const token = getBearerToken(req);
  if (!token) return { authorized: false, status: 401, message: 'Authentication required' };

  const neonBaseUrl = process.env.NEON_AUTH_BASE_URL;
  const neonJwksUrl = process.env.NEON_AUTH_JWKS_URL;
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
    let [profile] = await db.select({ id: userProfiles.id, isAdmin: userProfiles.isAdmin })
      .from(userProfiles)
      .where(eq(userProfiles.neonAuthUserId, neonUserId))
      .limit(1);

    // If an app profile was accidentally removed, recreate it from the
    // authoritative Neon Auth identity before account APIs use the mapping.
    if (!profile) {
      await pool.query('SELECT public.ensure_neon_auth_user_profile($1)', [neonUserId]);
      [profile] = await db.select({ id: userProfiles.id, isAdmin: userProfiles.isAdmin })
        .from(userProfiles)
        .where(eq(userProfiles.neonAuthUserId, neonUserId))
        .limit(1);
    }

    if (profile && !options.allowUnverifiedMfa) {
      const sessionIdHeader = req.headers['x-neon-session-id'];
      const sessionId = typeof sessionIdHeader === 'string' ? sessionIdHeader : null;
      const mfaEnabled = await pool.query(
        'SELECT 1 FROM public.user_account_mfa WHERE profile_id = $1 AND enabled_at IS NOT NULL LIMIT 1', [profile.id],
      );
      if (mfaEnabled.rowCount) {
        if (!(await getActiveNeonSession(neonUserId, sessionId))) {
          return { authorized: false, status: 401, message: 'Neon Auth session is no longer active' };
        }
        if (!(await isMfaSessionVerified(profile.id, sessionId))) {
          return { authorized: false, status: 428, message: 'Authenticator verification is required for this session' };
        }
      }
    }
    return { authorized: true, userId: neonUserId, isAdmin: profile?.isAdmin === true };
  } catch (error) {
    console.error('Neon Auth profile lookup failed:', error instanceof Error ? error.message : 'unknown error');
    return { authorized: false, status: 503, message: 'Unable to verify account permissions' };
  }
}

export async function authorizeAdmin(req: VercelRequest): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; status: 401 | 403 | 428 | 503; message: string }
> {
  const authorization = await authenticateRequest(req);
  if (authorization.authorized === false) return authorization;
  if (!authorization.isAdmin) {
    return { authorized: false, status: 403, message: 'Administrator access required' };
  }
  return { authorized: true, userId: authorization.userId };
}
