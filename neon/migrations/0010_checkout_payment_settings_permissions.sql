-- Allow authenticated server-side admins to update checkout payment options.
-- The Vercel runtime role can update only the settings columns used by the API.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime_user') THEN
    RAISE EXCEPTION 'Required role app_runtime_user does not exist';
  END IF;
END
$$;

REVOKE UPDATE ON TABLE public.payment_methods FROM app_runtime_user;
REVOKE UPDATE (name, description, is_active, display_order, updated_at)
  ON TABLE public.payment_methods FROM app_runtime_user;
GRANT UPDATE (name, description, is_active, display_order, updated_at)
  ON TABLE public.payment_methods TO app_runtime_user;

-- The order API only changes status after payment validation. Remove the
-- broader table-level UPDATE grant from migration 0006.
REVOKE UPDATE ON TABLE public.orders FROM app_runtime_user;
REVOKE UPDATE (status, updated_at) ON TABLE public.orders FROM app_runtime_user;
GRANT UPDATE (status, updated_at) ON TABLE public.orders TO app_runtime_user;

COMMIT;
