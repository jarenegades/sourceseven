-- Stripe customer mapping plus Neon-backed checkout/order writes.
-- Run on the same Neon branch as Vercel using the owner/migration role.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime_user') THEN
    RAISE EXCEPTION 'Required role app_runtime_user does not exist';
  END IF;
END
$$;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_stripe_customer_id_key
  ON public.user_profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_transaction_id_key
  ON public.orders (payment_transaction_id)
  WHERE payment_transaction_id IS NOT NULL;

GRANT SELECT (stripe_customer_id) ON TABLE public.user_profiles TO app_runtime_user;
GRANT UPDATE (stripe_customer_id) ON TABLE public.user_profiles TO app_runtime_user;

GRANT SELECT ON TABLE public.shipping_methods, public.payment_methods, public.currency_rates TO app_runtime_user;
GRANT INSERT, UPDATE ON TABLE public.orders TO app_runtime_user;
GRANT INSERT ON TABLE public.order_items, public.inventory_transactions TO app_runtime_user;
-- Existing triggers reserve order numbers and adjust inventory when a paid
-- order becomes confirmed. Keep the stock write grant column-scoped.
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO app_runtime_user;
GRANT UPDATE (stock_count, sold_count, in_stock) ON TABLE public.products TO app_runtime_user;

COMMIT;
