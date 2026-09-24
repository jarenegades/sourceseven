-- Runtime permissions for authenticated customer account APIs.
-- Run as the Neon owner/migration role on the same branch used by Vercel.
-- Vercel continues using the pooled app_runtime_user connection.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime_user') THEN
    RAISE EXCEPTION 'Required role app_runtime_user does not exist';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime_user;

-- Limit profile visibility and updates to customer-facing columns. is_admin is
-- readable only because the existing server authorization check needs it.
REVOKE ALL PRIVILEGES ON TABLE public.user_profiles FROM app_runtime_user;
GRANT SELECT (
  id, email, first_name, last_name, phone, avatar_url,
  is_admin, created_at, updated_at, neon_auth_user_id
) ON TABLE public.user_profiles TO app_runtime_user;
GRANT UPDATE (first_name, last_name, phone, avatar_url)
  ON TABLE public.user_profiles TO app_runtime_user;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.user_addresses,
             public.user_notification_preferences,
             public.cart_items,
             public.wishlist_items
  TO app_runtime_user;

GRANT SELECT ON TABLE public.orders, public.order_items TO app_runtime_user;

COMMIT;
