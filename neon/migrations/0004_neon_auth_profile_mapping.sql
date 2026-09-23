-- Link Neon Auth identities to the app's existing UUID profile keys.
-- Run on the Neon main branch after Neon Auth is enabled.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime_user') THEN
    RAISE EXCEPTION 'Required role app_runtime_user does not exist';
  END IF;
END
$$;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS neon_auth_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_neon_auth_user_id_key
  ON public.user_profiles (neon_auth_user_id);

CREATE OR REPLACE FUNCTION public.sync_neon_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  display_name TEXT := COALESCE(NULLIF(NEW.name, ''), '');
  first_name_value TEXT := NULLIF(split_part(display_name, ' ', 1), '');
  last_name_value TEXT := NULLIF(btrim(substr(display_name, length(split_part(display_name, ' ', 1)) + 1)), '');
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    neon_auth_user_id,
    is_admin
  )
  VALUES (
    pg_catalog.gen_random_uuid(),
    NEW.email,
    first_name_value,
    last_name_value,
    NEW.id,
    false
  )
  ON CONFLICT (neon_auth_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(public.user_profiles.first_name, EXCLUDED.first_name),
    last_name = COALESCE(public.user_profiles.last_name, EXCLUDED.last_name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS source_sevens_profile_on_neon_auth_user
  ON neon_auth."user";

CREATE TRIGGER source_sevens_profile_on_neon_auth_user
  AFTER INSERT ON neon_auth."user"
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_neon_auth_user_profile();

GRANT SELECT ON TABLE public.user_profiles TO app_runtime_user;

COMMIT;
