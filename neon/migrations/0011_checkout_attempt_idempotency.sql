-- Make customer order submission idempotent across retries for card and
-- non-card checkout attempts.
BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_attempt_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_user_checkout_attempt_key
  ON public.orders (user_id, checkout_attempt_id)
  WHERE checkout_attempt_id IS NOT NULL;

COMMIT;
