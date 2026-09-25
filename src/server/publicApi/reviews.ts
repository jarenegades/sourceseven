import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../auth.js';
import { pool } from '../db.js';

type ReviewRow = {
  id: string; product_id: string; user_id: string; rating: number;
  title: string | null; comment: string | null; verified_purchase: boolean;
  helpful_count: number; created_at: Date; updated_at: Date;
  user_name: string | null; user_avatar: string | null;
};

const reviewSelect = `SELECT r.id, r.product_id, r.user_id, r.rating, r.title,
  r.comment, r.verified_purchase, r.helpful_count, r.created_at, r.updated_at,
  NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), '') AS user_name,
  p.avatar_url AS user_avatar
  FROM public.product_reviews AS r
  JOIN public.user_profiles AS p ON p.id = r.user_id`;

async function profileIdFor(neonUserId: string): Promise<string | null> {
  const result = await pool.query<{ id: string }>(
    'SELECT id FROM public.user_profiles WHERE neon_auth_user_id = $1 LIMIT 1', [neonUserId],
  );
  return result.rows[0]?.id ?? null;
}

function reviewInput(value: unknown): { rating: number; title: string | null; comment: string | null } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (typeof body.rating !== 'number' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) return null;
  if (body.title !== undefined && body.title !== null && (typeof body.title !== 'string' || body.title.length > 200)) return null;
  if (body.comment !== undefined && body.comment !== null && (typeof body.comment !== 'string' || body.comment.length > 5000)) return null;
  return {
    rating: body.rating,
    title: typeof body.title === 'string' ? body.title.trim() || null : null,
    comment: typeof body.comment === 'string' ? body.comment.trim() || null : null,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const productId = typeof req.query.productId === 'string' ? req.query.productId.trim() : '';
  if (req.method === 'GET' && (!productId || productId.length > 255)) {
    return res.status(400).json({ error: 'A valid productId is required' });
  }

  try {
    if (req.method === 'GET' && req.query.mine !== '1') {
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
      if (req.query.summary === '1') {
        const summary = await pool.query<{ average_rating: string | null; review_count: number }>(
          'SELECT ROUND(AVG(rating)::numeric, 2) AS average_rating, COUNT(*)::int AS review_count FROM public.product_reviews WHERE product_id = $1',
          [productId],
        );
        return res.status(200).json({
          averageRating: Number(summary.rows[0]?.average_rating ?? 0),
          reviewCount: summary.rows[0]?.review_count ?? 0,
        });
      }
      const [list, summary] = await Promise.all([
        pool.query<ReviewRow>(`${reviewSelect} WHERE r.product_id = $1 ORDER BY r.created_at DESC LIMIT 500`, [productId]),
        pool.query<{ average_rating: string | null; review_count: number }>(
          'SELECT ROUND(AVG(rating)::numeric, 2) AS average_rating, COUNT(*)::int AS review_count FROM public.product_reviews WHERE product_id = $1',
          [productId],
        ),
      ]);
      return res.status(200).json({
        reviews: list.rows,
        averageRating: Number(summary.rows[0]?.average_rating ?? 0),
        reviewCount: summary.rows[0]?.review_count ?? 0,
      });
    }

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    const auth = await authenticateRequest(req);
    if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });
    const profileId = await profileIdFor(auth.userId);
    if (!profileId) return res.status(409).json({ error: 'Account profile is still being created. Try again shortly.' });

    if (req.method === 'GET') {
      const result = await pool.query<ReviewRow>(
        `${reviewSelect} WHERE r.product_id = $1 AND r.user_id = $2 LIMIT 1`, [productId, profileId],
      );
      return res.status(200).json({ review: result.rows[0] ?? null });
    }

    if (req.method === 'POST') {
      const body = req.body as Record<string, unknown> | null;
      const id = typeof body?.productId === 'string' ? body.productId.trim() : '';
      const input = reviewInput(body);
      if (!id || id.length > 255 || !input) return res.status(400).json({ error: 'Valid productId and rating are required' });
      const exists = await pool.query('SELECT 1 FROM public.products WHERE id = $1 AND is_active = true LIMIT 1', [id]);
      if (!exists.rowCount) return res.status(404).json({ error: 'Product not found' });
      const inserted = await pool.query<{ id: string }>(
        `INSERT INTO public.product_reviews (product_id, user_id, rating, title, comment)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [id, profileId, input.rating, input.title, input.comment],
      );
      const result = await pool.query<ReviewRow>(`${reviewSelect} WHERE r.id = $1`, [inserted.rows[0].id]);
      return res.status(201).json({ review: result.rows[0] });
    }

    const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ error: 'A valid review id is required' });
    }
    if (req.method === 'PATCH') {
      const input = reviewInput(req.body);
      if (!input) return res.status(400).json({ error: 'A valid rating is required' });
      const updated = await pool.query<{ id: string }>(
        `UPDATE public.product_reviews SET rating = $1, title = $2, comment = $3, updated_at = NOW()
         WHERE id = $4 AND user_id = $5 RETURNING id`,
        [input.rating, input.title, input.comment, id, profileId],
      );
      if (!updated.rowCount) return res.status(404).json({ error: 'Review not found' });
      const result = await pool.query<ReviewRow>(`${reviewSelect} WHERE r.id = $1`, [id]);
      return res.status(200).json({ review: result.rows[0] });
    }
    const deleted = await pool.query('DELETE FROM public.product_reviews WHERE id = $1 AND user_id = $2 RETURNING id', [id, profileId]);
    if (!deleted.rowCount) return res.status(404).json({ error: 'Review not found' });
    return res.status(200).json({ success: true });
  } catch (error) {
    if ((error as { code?: string })?.code === '23505') return res.status(409).json({ error: 'You have already reviewed this product' });
    console.error('Reviews API failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(503).json({ error: 'Unable to process reviews' });
  }
}
