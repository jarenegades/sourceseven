import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { pool } from './db.js';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encryptionKey(): Buffer {
  const configured = process.env.MFA_ENCRYPTION_KEY;
  if (!configured) throw new Error('MFA_ENCRYPTION_KEY is not configured');
  const key = Buffer.from(configured, 'base64');
  if (key.length !== 32) throw new Error('MFA_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  return key;
}

export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let result = '';
  for (let i = 0; i < bits.length; i += 5) result += BASE32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return result;
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: 10 }, () => randomBytes(5).toString('hex').toUpperCase());
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.replace(/[^a-f0-9]/gi, '').toUpperCase()).digest('hex');
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((value) => value.toString('base64url')).join('.');
}

export function decryptTotpSecret(value: string): string {
  const [ivValue, tagValue, ciphertextValue] = value.split('.');
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error('Stored authenticator key is invalid');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]).toString('utf8');
}

function decodeBase32(secret: string): Buffer {
  const clean = secret.replace(/=+$/g, '').toUpperCase();
  let bits = '';
  for (const char of clean) {
    const value = BASE32.indexOf(char);
    if (value < 0) throw new Error('Authenticator key is invalid');
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(binary % 1_000_000).padStart(6, '0');
}

export function verifyTotp(secret: string, supplied: unknown, now = Date.now()): boolean {
  if (typeof supplied !== 'string' || !/^\d{6}$/.test(supplied)) return false;
  const actual = Buffer.from(supplied);
  const step = Math.floor(now / 30_000);
  for (let offset = -1; offset <= 1; offset += 1) {
    const expected = Buffer.from(totp(secret, step + offset));
    if (timingSafeEqual(actual, expected)) return true;
  }
  return false;
}

export async function getActiveNeonSession(neonUserId: string, sessionId: string | null) {
  if (!sessionId || sessionId.length > 256) return null;
  const result = await pool.query<{ id: string; expires_at: Date | string }>(
    `SELECT id, "expiresAt" AS expires_at
     FROM neon_auth."session"
     WHERE id = $1 AND "userId" = $2 AND "expiresAt" > NOW()
     LIMIT 1`, [sessionId, neonUserId],
  );
  return result.rows[0] ?? null;
}

export async function isMfaSessionVerified(profileId: string, sessionId: string | null): Promise<boolean> {
  if (!sessionId) return false;
  const result = await pool.query(
    `SELECT 1 FROM public.user_account_mfa m
     JOIN public.user_account_mfa_sessions s ON s.profile_id = m.profile_id
     WHERE m.profile_id = $1 AND m.enabled_at IS NOT NULL
       AND s.neon_session_id = $2 AND s.expires_at > NOW() LIMIT 1`, [profileId, sessionId],
  );
  return result.rowCount === 1;
}
