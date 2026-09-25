-- Allow the server-side, admin-authorized shipping settings endpoint to update
-- configured shipping methods. Do not grant these writes to browser clients.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime_user') THEN
    RAISE EXCEPTION 'Required role app_runtime_user does not exist';
  END IF;
END
$$;

GRANT SELECT ON TABLE public.shipping_methods TO app_runtime_user;
GRANT UPDATE (
  name,
  description,
  price,
  free_shipping_threshold,
  estimated_delivery,
  display_order,
  is_active,
  updated_at
) ON TABLE public.shipping_methods TO app_runtime_user;

COMMIT;
