-- Self-heal an app profile accidentally deleted while the Neon Auth identity
-- remains. The function looks up the identity itself; callers cannot choose
-- the profile email, admin status, or profile UUID.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime_user') THEN
    RAISE EXCEPTION 'Required role app_runtime_user does not exist';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.ensure_neon_auth_user_profile(p_neon_auth_user_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  auth_email TEXT;
  display_name TEXT;
  first_name_value TEXT;
  last_name_value TEXT;
  profile_id UUID;
BEGIN
  SELECT u.email, u.name
    INTO auth_email, display_name
    FROM neon_auth."user" AS u
   WHERE u.id = p_neon_auth_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  display_name := COALESCE(NULLIF(display_name, ''), '');
  first_name_value := NULLIF(pg_catalog.split_part(display_name, ' ', 1), '');
  last_name_value := NULLIF(
    pg_catalog.btrim(pg_catalog.substr(display_name, pg_catalog.length(pg_catalog.split_part(display_name, ' ', 1)) + 1)),
    ''
  );

  INSERT INTO public.user_profiles (
    id, email, first_name, last_name, neon_auth_user_id, is_admin
  )
  VALUES (
    pg_catalog.gen_random_uuid(), auth_email, first_name_value, last_name_value,
    p_neon_auth_user_id, false
  )
  ON CONFLICT (neon_auth_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(public.user_profiles.first_name, EXCLUDED.first_name),
    last_name = COALESCE(public.user_profiles.last_name, EXCLUDED.last_name)
  RETURNING id INTO profile_id;

  RETURN profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_neon_auth_user_profile(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_neon_auth_user_profile(TEXT) TO app_runtime_user;

COMMIT;
