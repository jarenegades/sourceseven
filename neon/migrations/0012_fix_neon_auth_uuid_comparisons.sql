-- Neon Auth identity IDs are UUIDs, while the recovery function accepts TEXT
-- because app-side profile mappings store the ID as text. Compare text to text.
BEGIN;

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
   WHERE u.id::text = p_neon_auth_user_id;

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

COMMIT;
