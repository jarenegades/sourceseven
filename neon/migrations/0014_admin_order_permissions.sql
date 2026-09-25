-- Allow the Neon runtime API to edit fulfillment fields and record a verified Stripe refund.
-- Apply after 0010 using the owner/migration role on the branch used by Vercel.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime_user') THEN
    RAISE EXCEPTION 'Required role app_runtime_user does not exist';
  END IF;
END
$$;

GRANT UPDATE (
  tracking_number,
  estimated_delivery,
  payment_status
) ON TABLE public.orders TO app_runtime_user;

COMMIT;
