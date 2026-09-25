-- Permissions for server-managed reviews and currency rates.
-- Apply with the owner/migration role on the Neon branch used by Vercel.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime_user') THEN
    RAISE EXCEPTION 'Required role app_runtime_user does not exist';
  END IF;
END
$$;

GRANT SELECT ON TABLE public.product_reviews, public.reviews, public.currency_rates TO app_runtime_user;
GRANT INSERT (product_id, user_id, rating, title, comment) ON TABLE public.product_reviews TO app_runtime_user;
GRANT UPDATE (rating, title, comment, updated_at) ON TABLE public.product_reviews TO app_runtime_user;
GRANT DELETE ON TABLE public.product_reviews TO app_runtime_user;
GRANT INSERT (currency, rate, source, updated_by_user_id) ON TABLE public.currency_rates TO app_runtime_user;
GRANT UPDATE (rate, source, updated_by_user_id, updated_at) ON TABLE public.currency_rates TO app_runtime_user;

-- The existing rating trigger runs with the invoking role and updates product totals.
GRANT UPDATE (rating, review_count, updated_at) ON TABLE public.products TO app_runtime_user;

COMMIT;
