-- Canonicalize the department roots without deleting product rows.
--
-- Effect on existing data:
--   * products.category values `pharmaceutical` and `baby` become
--     `rolling-bearings` and `mounted-linear-units`, respectively.
--   * Product rows and all non-category product fields are preserved. Every
--     product category_id/subcategory_id association is cleared because the
--     user selected a clean category list, not the existing hierarchy.
--   * Existing Neon category rows (including child/custom categories) are
--     cleared after removing product references and self-references.
--   * Only the two canonical roots are seeded. No Supabase data or live Neon
--     branch is changed by this file until it is explicitly applied.

BEGIN;

ALTER TABLE public.products
    DROP CONSTRAINT IF EXISTS products_category_check;

UPDATE public.products
SET category = CASE category
    WHEN 'pharmaceutical' THEN 'rolling-bearings'
    WHEN 'baby' THEN 'mounted-linear-units'
    ELSE category
END
WHERE category IN ('pharmaceutical', 'baby');

UPDATE public.products
SET category_id = NULL;

UPDATE public.products
SET subcategory_id = NULL;

-- Break the category self-reference before removing the hierarchy.
UPDATE public.categories SET parent_id = NULL WHERE parent_id IS NOT NULL;
DELETE FROM public.categories;

INSERT INTO public.categories
    (id, name, slug, description, parent_id, display_order, is_active)
VALUES
    ('rolling-bearings', 'Rolling Bearings', 'rolling-bearings', NULL, NULL, 10, true),
    ('mounted-linear-units', 'Mounted & Linear Units', 'mounted-linear-units', NULL, NULL, 20, true);

ALTER TABLE public.products
    ADD CONSTRAINT products_category_check
    CHECK (category IN ('rolling-bearings', 'mounted-linear-units'));

COMMIT;
