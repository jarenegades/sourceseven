import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../src/server/auth.js';
import { pool } from '../../src/server/db.js';

type Resource = 'profile' | 'addresses' | 'notifications' | 'cart' | 'wishlist' | 'orders';

function sendError(res: VercelResponse, status: number, message: string) {
  return res.status(status).json({ error: message });
}

function positiveInt(value: unknown, fallback = 1): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= fallback && parsed <= 999 ? parsed : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const resource = req.query.resource as Resource;
  const validResources: Resource[] = ['profile', 'addresses', 'notifications', 'cart', 'wishlist', 'orders'];
  if (!validResources.includes(resource)) return sendError(res, 404, 'Account resource not found');

  const auth = await authenticateRequest(req);
  if (auth.authorized === false) return sendError(res, auth.status, auth.message);

  try {
    // Neon Auth IDs are mapped to the app's UUID profile key here.
    const profileResult = await pool.query<{ id: string }>(
      'SELECT id FROM public.user_profiles WHERE neon_auth_user_id = $1 LIMIT 1',
      [auth.userId],
    );
    const profileId = profileResult.rows[0]?.id;
    if (!profileId) return sendError(res, 409, 'Account profile is still being created. Please try again shortly.');

    if (resource === 'profile') {
      if (req.method === 'GET') {
        const result = await pool.query(
          `SELECT id, email, first_name, last_name, phone, avatar_url, created_at, updated_at
           FROM public.user_profiles WHERE id = $1`, [profileId],
        );
        return res.status(200).json({ profile: result.rows[0] ?? null });
      }
      if (req.method === 'PATCH') {
        const body = req.body ?? {};
        for (const field of ['first_name', 'last_name'] as const) {
          if (field in body && typeof body[field] !== 'string') return sendError(res, 400, 'Invalid profile details');
        }
        if ('phone' in body && body.phone !== null && typeof body.phone !== 'string') return sendError(res, 400, 'Invalid phone number');
        if ('avatar_url' in body && body.avatar_url !== null &&
            (typeof body.avatar_url !== 'string' || !/^data:image\/(png|jpeg|webp|gif);base64,/.test(body.avatar_url) || body.avatar_url.length > 3_000_000)) {
          return sendError(res, 400, 'Invalid profile image');
        }
        const result = await pool.query(
          `UPDATE public.user_profiles SET
             first_name = CASE WHEN $2 THEN $3 ELSE first_name END,
             last_name = CASE WHEN $4 THEN $5 ELSE last_name END,
             phone = CASE WHEN $6 THEN $7 ELSE phone END,
             avatar_url = CASE WHEN $8 THEN $9 ELSE avatar_url END,
             updated_at = now()
           WHERE id = $1
           RETURNING id, email, first_name, last_name, phone, avatar_url, created_at, updated_at`,
          [profileId,
            'first_name' in body, body.first_name ?? null,
            'last_name' in body, body.last_name ?? null,
            'phone' in body, body.phone ?? null,
            'avatar_url' in body, body.avatar_url ?? null],
        );
        return res.status(200).json({ profile: result.rows[0] ?? null });
      }
      res.setHeader('Allow', 'GET, PATCH');
      return sendError(res, 405, 'Method not allowed');
    }

    if (resource === 'addresses') {
      if (req.method === 'GET') {
        const result = await pool.query(
          `SELECT * FROM public.user_addresses
           WHERE user_id = $1 AND address_type = 'shipping'
           ORDER BY is_default DESC, created_at DESC LIMIT 1`, [profileId],
        );
        return res.status(200).json({ address: result.rows[0] ?? null });
      }
      if (req.method === 'PUT') {
        const body = req.body ?? {};
        const fields = ['street', 'city', 'state', 'zip_code', 'country'] as const;
        if (fields.some((field) => typeof body[field] !== 'string' || !body[field].trim())) {
          return sendError(res, 400, 'Complete all shipping address fields before saving.');
        }
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(
            `UPDATE public.user_addresses SET is_default = false
             WHERE user_id = $1 AND address_type = 'shipping' AND is_default = true`, [profileId],
          );
          const result = await client.query(
            `INSERT INTO public.user_addresses
               (user_id, address_type, is_default, street, city, state, zip_code, country)
             VALUES ($1, 'shipping', true, $2, $3, $4, $5, $6)
             RETURNING *`,
            [profileId, ...fields.map((field) => body[field].trim())],
          );
          await client.query('COMMIT');
          return res.status(200).json({ address: result.rows[0] });
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
      res.setHeader('Allow', 'GET, PUT');
      return sendError(res, 405, 'Method not allowed');
    }

    if (resource === 'notifications') {
      if (req.method === 'GET') {
        const result = await pool.query(
          `INSERT INTO public.user_notification_preferences (user_id)
           VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
           RETURNING order_updates, promotions, newsletter, sms_alerts`, [profileId],
        );
        return res.status(200).json({ preferences: result.rows[0] });
      }
      if (req.method === 'PUT') {
        const body = req.body ?? {};
        const fields = ['order_updates', 'promotions', 'newsletter', 'sms_alerts'] as const;
        if (fields.some((field) => typeof body[field] !== 'boolean')) {
          return sendError(res, 400, 'Invalid notification preferences');
        }
        const result = await pool.query(
          `INSERT INTO public.user_notification_preferences
             (user_id, order_updates, promotions, newsletter, sms_alerts)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id) DO UPDATE SET
             order_updates = EXCLUDED.order_updates, promotions = EXCLUDED.promotions,
             newsletter = EXCLUDED.newsletter, sms_alerts = EXCLUDED.sms_alerts
           RETURNING order_updates, promotions, newsletter, sms_alerts`,
          [profileId, ...fields.map((field) => body[field])],
        );
        return res.status(200).json({ preferences: result.rows[0] });
      }
      res.setHeader('Allow', 'GET, PUT');
      return sendError(res, 405, 'Method not allowed');
    }

    if (resource === 'cart') {
      if (req.method === 'GET') {
        const result = await pool.query(
          `SELECT ci.id, ci.user_id, ci.product_id, ci.quantity, ci.created_at, ci.updated_at,
                  json_build_object('name', p.name, 'price', p.price, 'image_url', p.image_url,
                    'category', p.category, 'category_id', p.category_id,
                    'subcategory_id', p.subcategory_id) AS product
           FROM public.cart_items ci JOIN public.products p ON p.id = ci.product_id
           WHERE ci.user_id = $1 ORDER BY ci.created_at DESC`, [profileId],
        );
        return res.status(200).json({ items: result.rows });
      }
      if (req.method === 'POST') {
        const { productId, quantity = 1 } = req.body ?? {};
        const requestedQuantity = positiveInt(quantity);
        if (typeof productId !== 'string' || !productId || !requestedQuantity) return sendError(res, 400, 'Invalid cart item');
        const result = await pool.query(
          `INSERT INTO public.cart_items (user_id, product_id, quantity)
           SELECT $1, p.id, $3 FROM public.products p
           WHERE p.id = $2 AND p.is_active = true AND p.in_stock = true AND p.stock_count >= $3
           ON CONFLICT (user_id, product_id) DO UPDATE
             SET quantity = public.cart_items.quantity + EXCLUDED.quantity, updated_at = now()
             WHERE public.cart_items.quantity + EXCLUDED.quantity <=
               (SELECT stock_count FROM public.products WHERE id = EXCLUDED.product_id)
           RETURNING *`, [profileId, productId, requestedQuantity],
        );
        if (!result.rows[0]) return sendError(res, 409, 'Product is unavailable or has insufficient stock');
        return res.status(200).json({ item: result.rows[0] });
      }
      if (req.method === 'PATCH') {
        const { itemId, quantity } = req.body ?? {};
        const requestedQuantity = positiveInt(quantity);
        if (typeof itemId !== 'string' || !requestedQuantity) return sendError(res, 400, 'Invalid cart update');
        const result = await pool.query(
          `UPDATE public.cart_items ci SET quantity = $3, updated_at = now()
           FROM public.products p WHERE ci.id = $1 AND ci.user_id = $2 AND p.id = ci.product_id
             AND p.is_active = true AND p.in_stock = true AND p.stock_count >= $3
           RETURNING ci.*`, [itemId, profileId, requestedQuantity],
        );
        if (!result.rows[0]) return sendError(res, 404, 'Cart item not found or quantity exceeds available stock');
        return res.status(200).json({ item: result.rows[0] });
      }
      if (req.method === 'DELETE') {
        if (req.query.clear === '1') {
          await pool.query('DELETE FROM public.cart_items WHERE user_id = $1', [profileId]);
          return res.status(200).json({ success: true });
        }
        const itemId = typeof req.query.id === 'string' ? req.query.id : '';
        if (!itemId) return sendError(res, 400, 'Cart item id is required');
        await pool.query('DELETE FROM public.cart_items WHERE id = $1 AND user_id = $2', [itemId, profileId]);
        return res.status(200).json({ success: true });
      }
      res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
      return sendError(res, 405, 'Method not allowed');
    }

    if (resource === 'wishlist') {
      if (req.method === 'GET') {
        const result = await pool.query(
          `SELECT wi.id, wi.user_id, wi.product_id, wi.created_at,
                  json_build_object('name', p.name, 'price', p.price, 'image_url', p.image_url,
                    'category', p.category, 'rating', p.rating, 'review_count', p.review_count,
                    'in_stock', p.in_stock) AS product
           FROM public.wishlist_items wi JOIN public.products p ON p.id = wi.product_id
           WHERE wi.user_id = $1 ORDER BY wi.created_at DESC`, [profileId],
        );
        return res.status(200).json({ items: result.rows });
      }
      if (req.method === 'POST') {
        const { productId } = req.body ?? {};
        if (typeof productId !== 'string' || !productId) return sendError(res, 400, 'Product id is required');
        const result = await pool.query(
          `INSERT INTO public.wishlist_items (user_id, product_id)
           SELECT $1, p.id FROM public.products p WHERE p.id = $2 AND p.is_active = true
           ON CONFLICT (user_id, product_id) DO UPDATE SET product_id = EXCLUDED.product_id
           RETURNING *`, [profileId, productId],
        );
        if (!result.rows[0]) return sendError(res, 404, 'Product not found');
        return res.status(200).json({ item: result.rows[0] });
      }
      if (req.method === 'DELETE') {
        const itemId = typeof req.query.id === 'string' ? req.query.id : '';
        const productId = typeof req.query.productId === 'string' ? req.query.productId : '';
        if (req.query.clear === '1') await pool.query('DELETE FROM public.wishlist_items WHERE user_id = $1', [profileId]);
        else if (itemId) await pool.query('DELETE FROM public.wishlist_items WHERE id = $1 AND user_id = $2', [itemId, profileId]);
        else if (productId) await pool.query('DELETE FROM public.wishlist_items WHERE product_id = $1 AND user_id = $2', [productId, profileId]);
        else return sendError(res, 400, 'Wishlist item id or product id is required');
        return res.status(200).json({ success: true });
      }
      res.setHeader('Allow', 'GET, POST, DELETE');
      return sendError(res, 405, 'Method not allowed');
    }

    if (resource === 'orders') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return sendError(res, 405, 'Method not allowed');
      }
      if (req.query.stats === '1') {
        const result = await pool.query(
          `SELECT count(*)::int AS total,
             count(*) FILTER (WHERE status IN ('processing', 'confirmed'))::int AS processing,
             count(*) FILTER (WHERE status = 'in-transit')::int AS "inTransit",
             count(*) FILTER (WHERE status = 'delivered')::int AS delivered,
             count(*) FILTER (WHERE status IN ('cancelled', 'refunded'))::int AS cancelled
           FROM public.orders WHERE user_id = $1`, [profileId],
        );
        return res.status(200).json({ stats: result.rows[0] });
      }
      const result = await pool.query(
        `SELECT o.*, COALESCE(json_agg(oi ORDER BY oi.created_at) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
         FROM public.orders o LEFT JOIN public.order_items oi ON oi.order_id = o.id
         WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC`, [profileId],
      );
      return res.status(200).json({ orders: result.rows });
    }
  } catch (error) {
    console.error(`Account ${resource} API failed:`, error instanceof Error ? error.message : 'unknown error');
    return sendError(res, 500, 'Unable to process account request');
  }
}
