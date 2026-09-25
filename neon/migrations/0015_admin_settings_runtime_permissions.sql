-- Runtime grants for the server-side, admin-authorized settings endpoints.
-- Apply with the owner/migration role on the Neon branch used by Vercel.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime_user') THEN
    RAISE EXCEPTION 'Required role app_runtime_user does not exist';
  END IF;
END
$$;

GRANT SELECT ON TABLE public.payment_gateway_settings,
  public.order_notification_settings, public.supplier_notification_routes TO app_runtime_user;

GRANT UPDATE (merchant_id, secret_key, client_key, environment,
  fee_handling, platform_fee_percentage, is_enabled, updated_at)
  ON TABLE public.payment_gateway_settings TO app_runtime_user;

GRANT UPDATE (notifications_enabled, admin_emails, updated_at)
  ON TABLE public.order_notification_settings TO app_runtime_user;

GRANT INSERT (email, category_id, subcategory_id, is_enabled), DELETE
  ON TABLE public.supplier_notification_routes TO app_runtime_user;

COMMIT;
