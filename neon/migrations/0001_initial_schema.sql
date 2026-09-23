-- Sourceseven baseline schema for Neon PostgreSQL.
-- Derived from the active Supabase schema migrations. This file intentionally
-- contains no Supabase auth, RLS, Storage, or Edge Function dependencies.
-- User IDs remain UUIDs from the temporary Supabase Auth provider; user-owned
-- rows reference user_profiles so this database has no auth.users dependency.

BEGIN;

CREATE SEQUENCE public.order_number_seq START WITH 1;

CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.user_profiles.id IS 'Stable user UUID supplied by the temporary Supabase Auth provider.';

CREATE TABLE public.user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL DEFAULT 'shipping' CHECK (address_type IN ('shipping', 'billing')),
    is_default BOOLEAN NOT NULL DEFAULT false,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'United States',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    order_updates BOOLEAN NOT NULL DEFAULT true,
    promotions BOOLEAN NOT NULL DEFAULT true,
    newsletter BOOLEAN NOT NULL DEFAULT false,
    sms_alerts BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id VARCHAR(50) REFERENCES public.categories(id),
    image_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('baby', 'pharmaceutical')),
    category_id VARCHAR(50) REFERENCES public.categories(id),
    subcategory_id VARCHAR(50) REFERENCES public.categories(id),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    original_price NUMERIC(10, 2) CHECK (original_price >= 0),
    cost_price NUMERIC(10, 2) CHECK (cost_price >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'JMD', 'CAD')),
    image_url TEXT NOT NULL,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    stock_count INTEGER NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
    sold_count INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
    in_stock BOOLEAN NOT NULL DEFAULT true,
    badge VARCHAR(50),
    sku VARCHAR(100) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(200),
    comment TEXT,
    verified_purchase BOOLEAN NOT NULL DEFAULT false,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (product_id, user_id)
);

-- Retained because it exists in the Supabase migration history. The active
-- storefront review service uses product_reviews; reconcile/merge this legacy
-- table during data migration before dropping either table.
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    user_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, product_id)
);

CREATE TABLE public.wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, product_id)
);

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    status VARCHAR(20) NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'confirmed', 'in-transit', 'delivered', 'cancelled', 'refunded')),
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL,
    shipping_cost NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    shipping_method VARCHAR(20) CHECK (shipping_method IN ('standard', 'express', 'overnight')),
    tracking_number VARCHAR(100),
    estimated_delivery DATE,
    delivered_at TIMESTAMPTZ,
    shipping_full_name VARCHAR(200) NOT NULL,
    shipping_email VARCHAR(255) NOT NULL,
    shipping_phone VARCHAR(20),
    shipping_address VARCHAR(255) NOT NULL,
    shipping_city VARCHAR(100) NOT NULL,
    shipping_state VARCHAR(100) NOT NULL,
    shipping_zip_code VARCHAR(20) NOT NULL,
    shipping_country VARCHAR(100) NOT NULL DEFAULT 'United States',
    payment_method VARCHAR(30)
        CHECK (payment_method IN ('credit-card', 'debit-card', 'paypal', 'bank-transfer', 'cash-on-delivery')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_transaction_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id),
    product_name VARCHAR(255) NOT NULL,
    product_image_url TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL
        CHECK (transaction_type IN ('purchase', 'sale', 'return', 'adjustment', 'restock')),
    quantity_change INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    order_id UUID REFERENCES public.orders(id),
    notes TEXT,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.currency_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency VARCHAR(3) NOT NULL UNIQUE CHECK (currency IN ('JMD', 'CAD')),
    rate NUMERIC(10, 4) NOT NULL CHECK (rate > 0),
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.payment_gateway_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id VARCHAR(255),
    secret_key VARCHAR(500),
    client_key VARCHAR(500),
    environment VARCHAR(20) NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
    fee_handling VARCHAR(20) NOT NULL DEFAULT 'merchant' CHECK (fee_handling IN ('merchant', 'customer')),
    platform_fee_percentage NUMERIC(5, 2) NOT NULL DEFAULT 2.90 CHECK (platform_fee_percentage >= 0),
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT payment_gateway_settings_singleton CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
);
INSERT INTO public.payment_gateway_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid);

CREATE TABLE public.order_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notifications_enabled BOOLEAN NOT NULL DEFAULT false,
    admin_emails TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT order_notification_settings_singleton CHECK (id = '00000000-0000-0000-0000-000000000002'::uuid)
);
INSERT INTO public.order_notification_settings (id)
VALUES ('00000000-0000-0000-0000-000000000002'::uuid);

CREATE TABLE public.supplier_notification_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    category_id VARCHAR(100) NOT NULL,
    subcategory_id VARCHAR(100),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.shipping_methods (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    free_shipping_threshold NUMERIC(10, 2) CHECK (free_shipping_threshold >= 0),
    estimated_delivery VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payment_methods (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.product_pricing_settings (
    product_id TEXT PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
    purchase_mode VARCHAR(10) NOT NULL DEFAULT 'price' CHECK (purchase_mode IN ('price', 'quote')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.payment_methods (code, name, description, is_active, display_order)
VALUES
    ('card', 'Card Payment', 'Pay securely online by card.', true, 10),
    ('cash-on-delivery', 'Cash on Delivery', 'Pay when your order is delivered.', false, 20),
    ('bank-transfer', 'Bank Transfer', 'Place the order now; payment instructions will be provided.', false, 30);

INSERT INTO public.shipping_methods
    (code, name, description, price, free_shipping_threshold, estimated_delivery, display_order, is_active)
VALUES
    ('standard', 'Standard Shipping', 'Reliable delivery for most bearing orders.', 9.99, 50.00, '5-7 business days', 10, true),
    ('express', 'Express Shipping', 'Priority delivery for time-sensitive requirements.', 19.99, NULL, '2-3 business days', 20, true),
    ('overnight', 'Overnight Shipping', 'Next-business-day delivery where available.', 39.99, NULL, 'Next business day', 30, true);

CREATE INDEX idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX idx_user_addresses_default ON public.user_addresses(user_id, is_default);
CREATE INDEX idx_categories_parent_display_order ON public.categories(parent_id, display_order);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_active ON public.products(is_active);
CREATE INDEX idx_products_in_stock ON public.products(in_stock);
CREATE INDEX idx_products_currency ON public.products(currency);
CREATE INDEX idx_products_search ON public.products USING GIN(search_vector);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX idx_wishlist_items_user_id ON public.wishlist_items(user_id);
CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX idx_inventory_transactions_product_id ON public.inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_created_at ON public.inventory_transactions(created_at DESC);
CREATE INDEX idx_currency_rates_currency ON public.currency_rates(currency);
CREATE INDEX idx_supplier_notification_routes_category
    ON public.supplier_notification_routes(category_id, subcategory_id);

CREATE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.set_product_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.search_vector := to_tsvector(
        'english',
        concat_ws(' ', coalesce(NEW.name, ''), coalesce(NEW.description, ''), coalesce(NEW.category, ''))
    );
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.refresh_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    affected_product_id TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_product_id := OLD.product_id;
    ELSE
        affected_product_id := NEW.product_id;
    END IF;
    UPDATE public.products AS p
    SET rating = coalesce(r.average_rating, 0),
        review_count = coalesce(r.review_count, 0)
    FROM (
        SELECT round(avg(all_reviews.rating)::numeric, 2) AS average_rating,
               count(*)::integer AS review_count
        FROM (
            SELECT rating FROM public.product_reviews WHERE product_id = affected_product_id
            UNION ALL
            SELECT rating FROM public.reviews WHERE product_id = affected_product_id
        ) AS all_reviews
    ) AS r
    WHERE p.id = affected_product_id;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_inventory_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.status = 'confirmed' AND (TG_OP = 'INSERT' OR OLD.status = 'processing') THEN
        UPDATE public.products AS p
        SET stock_count = p.stock_count - oi.quantity,
            sold_count = p.sold_count + oi.quantity,
            in_stock = (p.stock_count - oi.quantity) > 0
        FROM public.order_items AS oi
        WHERE oi.order_id = NEW.id AND p.id = oi.product_id;

        INSERT INTO public.inventory_transactions
            (product_id, transaction_type, quantity_change, previous_stock, new_stock, order_id)
        SELECT p.id, 'sale', -oi.quantity, p.stock_count + oi.quantity, p.stock_count, NEW.id
        FROM public.order_items AS oi
        JOIN public.products AS p ON p.id = oi.product_id
        WHERE oi.order_id = NEW.id;
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status IN ('confirmed', 'in-transit') THEN
        UPDATE public.products AS p
        SET stock_count = p.stock_count + oi.quantity,
            sold_count = greatest(0, p.sold_count - oi.quantity),
            in_stock = true
        FROM public.order_items AS oi
        WHERE oi.order_id = NEW.id AND p.id = oi.product_id;

        INSERT INTO public.inventory_transactions
            (product_id, transaction_type, quantity_change, previous_stock, new_stock, order_id)
        SELECT p.id, 'return', oi.quantity, p.stock_count - oi.quantity, p.stock_count, NEW.id
        FROM public.order_items AS oi
        JOIN public.products AS p ON p.id = oi.product_id
        WHERE oi.order_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.assign_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := 'MB-' || to_char(now(), 'YYYY') || '-' ||
            lpad(nextval('public.order_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.get_cart_total(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
    SELECT coalesce(sum(p.price * ci.quantity), 0)
    FROM public.cart_items AS ci
    JOIN public.products AS p ON p.id = ci.product_id
    WHERE ci.user_id = p_user_id;
$$;

CREATE FUNCTION public.search_products(search_query TEXT, p_category TEXT DEFAULT NULL)
RETURNS TABLE (
    id TEXT,
    name VARCHAR,
    description TEXT,
    category VARCHAR,
    price NUMERIC,
    image_url TEXT,
    rating NUMERIC,
    review_count INTEGER,
    in_stock BOOLEAN,
    rank REAL
)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
    SELECT p.id, p.name, p.description, p.category, p.price, p.image_url,
           p.rating, p.review_count, p.in_stock,
           ts_rank(p.search_vector, plainto_tsquery('english', search_query)) AS rank
    FROM public.products AS p
    WHERE p.is_active
      AND (p_category IS NULL OR p.category = p_category)
      AND p.search_vector @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC;
$$;

CREATE TRIGGER set_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_user_addresses_updated_at BEFORE UPDATE ON public.user_addresses
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_user_notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_supplier_notification_routes_updated_at BEFORE UPDATE ON public.supplier_notification_routes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_currency_rates_updated_at BEFORE UPDATE ON public.currency_rates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_payment_gateway_settings_updated_at BEFORE UPDATE ON public.payment_gateway_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_order_notification_settings_updated_at BEFORE UPDATE ON public.order_notification_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_shipping_methods_updated_at BEFORE UPDATE ON public.shipping_methods
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_product_pricing_settings_updated_at BEFORE UPDATE ON public.product_pricing_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_product_search_vector BEFORE INSERT OR UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.set_product_search_vector();
CREATE TRIGGER refresh_rating_from_product_reviews AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
    FOR EACH ROW EXECUTE FUNCTION public.refresh_product_rating();
CREATE TRIGGER refresh_rating_from_reviews AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.refresh_product_rating();
CREATE TRIGGER update_inventory_on_order_status AFTER INSERT OR UPDATE OF status ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_inventory_on_order();
CREATE TRIGGER assign_order_number BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.assign_order_number();

CREATE MATERIALIZED VIEW public.product_sales_analytics AS
SELECT p.id AS product_id,
       p.name AS product_name,
       p.category,
       count(DISTINCT oi.order_id) AS total_orders,
       coalesce(sum(oi.quantity), 0) AS total_units_sold,
       coalesce(sum(oi.total_price), 0) AS total_revenue,
       avg(oi.unit_price) AS average_price,
       max(o.created_at) AS last_sale_date
FROM public.products AS p
LEFT JOIN public.order_items AS oi ON p.id = oi.product_id
LEFT JOIN public.orders AS o ON oi.order_id = o.id AND o.status <> 'cancelled'
GROUP BY p.id, p.name, p.category;

CREATE UNIQUE INDEX idx_product_sales_analytics_product_id
    ON public.product_sales_analytics(product_id);

-- Database access is intended to come only from trusted server code. No
-- browser/API roles, Supabase RLS policies, or Data API grants are created here.
-- Phase 3 must add authorization at the Vercel API boundary before app traffic
-- is routed to this database.

COMMIT;
