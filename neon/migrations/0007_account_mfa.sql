-- App-level TOTP for Neon Auth accounts. Secrets are AES-256-GCM encrypted by
-- the Vercel API; MFA_ENCRYPTION_KEY must be configured before enabling MFA.
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_account_mfa (
  profile_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  encrypted_secret TEXT NOT NULL,
  enabled_at TIMESTAMPTZ,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  recovery_code_hashes TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_account_mfa
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovery_code_hashes TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.user_account_mfa_sessions (
  neon_session_id TEXT PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS user_account_mfa_sessions_profile_expiry_idx
  ON public.user_account_mfa_sessions (profile_id, expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_account_mfa, public.user_account_mfa_sessions TO app_runtime_user;

-- The server checks the supplied Neon Auth session id against the managed
-- session row before it can enroll, verify, or disable a factor.
GRANT USAGE ON SCHEMA neon_auth TO app_runtime_user;
GRANT SELECT (id, "userId", "expiresAt") ON TABLE neon_auth."session" TO app_runtime_user;

COMMIT;
