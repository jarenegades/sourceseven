import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../src/server/auth.js';
import { pool } from '../../src/server/db.js';
import { decryptTotpSecret, encryptTotpSecret, generateRecoveryCodes, generateTotpSecret, getActiveNeonSession, hashRecoveryCode, isMfaSessionVerified, verifyTotp } from '../../src/server/mfa.js';

function sessionIdFrom(req: VercelRequest): string | null {
  const value = req.headers['x-neon-session-id'];
  return typeof value === 'string' ? value : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.NEON_AUTH_BASE_URL) return res.status(503).json({ error: 'Neon Auth is not configured' });

  const auth = await authenticateRequest(req, { allowUnverifiedMfa: true });
  if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });

  try {
    const sessionId = sessionIdFrom(req);
    const activeSession = await getActiveNeonSession(auth.userId, sessionId);
    if (!activeSession) return res.status(401).json({ error: 'Your session is invalid. Sign in again.' });
    const profileResult = await pool.query<{ id: string; email: string | null }>(
      'SELECT id, email FROM public.user_profiles WHERE neon_auth_user_id = $1 LIMIT 1', [auth.userId],
    );
    const profile = profileResult.rows[0];
    if (!profile) return res.status(409).json({ error: 'Account profile is still being created. Try again shortly.' });

    const status = await pool.query<{ enabled_at: Date | null }>(
      'SELECT enabled_at FROM public.user_account_mfa WHERE profile_id = $1 LIMIT 1', [profile.id],
    );
    const enabled = Boolean(status.rows[0]?.enabled_at);
    if (req.method === 'GET') {
      return res.status(200).json({
        enabled,
        verifiedForThisSession: enabled ? await isMfaSessionVerified(profile.id, sessionId) : true,
      });
    }

    const body = typeof req.body === 'object' && req.body !== null ? req.body as Record<string, unknown> : {};
    if (body.action === 'begin') {
      if (enabled) return res.status(409).json({ error: 'Authenticator verification is already enabled' });
      const secret = generateTotpSecret();
      await pool.query(
        `INSERT INTO public.user_account_mfa (profile_id, encrypted_secret, enabled_at, updated_at)
         VALUES ($1, $2, NULL, NOW())
         ON CONFLICT (profile_id) DO UPDATE SET encrypted_secret = EXCLUDED.encrypted_secret, enabled_at = NULL, updated_at = NOW()`,
        [profile.id, encryptTotpSecret(secret)],
      );
      const label = encodeURIComponent(profile.email || auth.userId);
      const issuer = encodeURIComponent('Source Sevens');
      return res.status(200).json({ secret, otpauthUrl: `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30` });
    }

    if (body.action === 'verify' || body.action === 'disable') {
      const saved = await pool.query<{ encrypted_secret: string; enabled_at: Date | null; failed_attempts: number; locked_until: Date | null }>(
        'SELECT encrypted_secret, enabled_at, failed_attempts, locked_until FROM public.user_account_mfa WHERE profile_id = $1 LIMIT 1', [profile.id],
      );
      const record = saved.rows[0];
      if (!record || body.action === 'disable' && !record.enabled_at) {
        return res.status(409).json({ error: 'Set up your authenticator app first' });
      }
      if (record.locked_until && new Date(record.locked_until).getTime() > Date.now()) {
        return res.status(429).json({ error: 'Too many incorrect codes. Try again in 15 minutes.' });
      }
      let codeVerified = verifyTotp(decryptTotpSecret(record.encrypted_secret), body.code);
      if (!codeVerified && body.action === 'verify' && record.enabled_at && typeof body.code === 'string' && /^[a-f0-9]{10}$/i.test(body.code)) {
        const recovery = await pool.query(
          `UPDATE public.user_account_mfa
           SET recovery_code_hashes = array_remove(recovery_code_hashes, $2), updated_at = NOW()
           WHERE profile_id = $1 AND $2 = ANY(recovery_code_hashes)
           RETURNING profile_id`, [profile.id, hashRecoveryCode(body.code)],
        );
        codeVerified = recovery.rowCount === 1;
      }
      if (!codeVerified) {
        await pool.query(
          `UPDATE public.user_account_mfa
           SET failed_attempts = failed_attempts + 1,
               locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END,
               updated_at = NOW()
           WHERE profile_id = $1`, [profile.id],
        );
        return res.status(400).json({ error: 'That authenticator code is invalid or expired' });
      }

      await pool.query(
        'UPDATE public.user_account_mfa SET failed_attempts = 0, locked_until = NULL WHERE profile_id = $1', [profile.id],
      );

      if (body.action === 'disable') {
        await pool.query('DELETE FROM public.user_account_mfa_sessions WHERE profile_id = $1', [profile.id]);
        await pool.query('DELETE FROM public.user_account_mfa WHERE profile_id = $1', [profile.id]);
        return res.status(200).json({ enabled: false, verifiedForThisSession: true });
      }

      let recoveryCodes: string[] | undefined;
      if (!record.enabled_at) {
        recoveryCodes = generateRecoveryCodes();
        await pool.query(
          `UPDATE public.user_account_mfa SET enabled_at = NOW(), recovery_code_hashes = $2, updated_at = NOW()
           WHERE profile_id = $1`, [profile.id, recoveryCodes.map(hashRecoveryCode)],
        );
      }
      await pool.query(
        `INSERT INTO public.user_account_mfa_sessions (neon_session_id, profile_id, verified_at, expires_at)
         VALUES ($1, $2, NOW(), LEAST($3::timestamptz, NOW() + INTERVAL '12 hours'))
         ON CONFLICT (neon_session_id) DO UPDATE SET profile_id = EXCLUDED.profile_id, verified_at = NOW(), expires_at = EXCLUDED.expires_at`,
        [sessionId, profile.id, activeSession.expires_at],
      );
      return res.status(200).json({ enabled: true, verifiedForThisSession: true, ...(recoveryCodes ? { recoveryCodes } : {}) });
    }

    return res.status(400).json({ error: 'Unsupported MFA action' });
  } catch (error) {
    console.error('Account MFA operation failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(503).json({ error: error instanceof Error ? error.message : 'Unable to update two-factor authentication' });
  }
}
