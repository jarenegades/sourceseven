-- Runtime permissions for the current Neon product/category API.
--
-- Run this as the Neon owner/migration role on the target branch. The role
-- password is intentionally not stored in migrations. Use the pooled
-- app_runtime_user connection string in Vercel after applying this file.
--
-- This migration covers the current product/category API only. Later phases
-- must add narrowly scoped grants for profiles, carts, orders, reviews,
-- payments, and settings as those APIs move to Neon.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime_user') THEN
    RAISE EXCEPTION 'Required role app_runtime_user does not exist';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime_user;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.products, public.categories, public.product_pricing_settings
  TO app_runtime_user;

GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public
  TO app_runtime_user;

COMMIT;
