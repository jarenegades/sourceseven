import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeAdmin } from '../auth.js';
import { pool } from '../db.js';

type RateRow = {
  id: string; currency: 'JMD' | 'CAD'; rate: string; source: string;
  updated_at: Date; updated_by_user_id: string | null;
};

function serialize(row: RateRow) {
  return { ...row, rate: Number(row.rate) };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      const result = await pool.query<RateRow>(
        'SELECT id, currency, rate, source, updated_at, updated_by_user_id FROM public.currency_rates ORDER BY currency',
      );
      const rows = result.rows.map(serialize);
      if (req.query.metadata === '1') return res.status(200).json({ rates: rows });
      if (typeof req.query.currency === 'string') {
        if (req.query.currency === 'USD') return res.status(200).json({ rate: 1 });
        if (req.query.currency !== 'JMD' && req.query.currency !== 'CAD') {
          return res.status(400).json({ error: 'Unsupported currency' });
        }
        const row = rows.find((item) => item.currency === req.query.currency);
        if (!row) return res.status(404).json({ error: 'Currency rate is not configured' });
        return res.status(200).json({ rate: row.rate });
      }
      const rates: Record<string, number> = { USD: 1 };
      for (const row of rows) rates[row.currency] = row.rate;
      return res.status(200).json({ rates });
    }

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    const auth = await authorizeAdmin(req);
    if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });
    const body = req.body as Record<string, unknown> | null;
    const currency = body?.currency;
    const rate = body?.rate;
    const source = body?.source ?? 'manual';
    if ((currency !== 'JMD' && currency !== 'CAD') || typeof rate !== 'number' ||
        !Number.isFinite(rate) || rate <= 0 || rate > 999999.9999 ||
        (source !== 'api' && source !== 'manual')) {
      return res.status(400).json({ error: 'Valid currency, rate, and source are required' });
    }
    const profile = await pool.query<{ id: string }>(
      'SELECT id FROM public.user_profiles WHERE neon_auth_user_id = $1 LIMIT 1', [auth.userId],
    );
    if (!profile.rows[0]) return res.status(409).json({ error: 'Administrator profile is unavailable' });
    const updated = await pool.query<RateRow>(
      `INSERT INTO public.currency_rates (currency, rate, source, updated_by_user_id)
       VALUES ($4, $1, $2, $3)
       ON CONFLICT (currency) DO UPDATE
          SET rate = EXCLUDED.rate, source = EXCLUDED.source,
              updated_by_user_id = EXCLUDED.updated_by_user_id, updated_at = NOW()
      RETURNING id, currency, rate, source, updated_at, updated_by_user_id`,
      [rate, source, profile.rows[0].id, currency],
    );
    return res.status(200).json({ rate: serialize(updated.rows[0]) });
  } catch (error) {
    console.error('Currency rates API failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(503).json({ error: 'Unable to process currency rates' });
  }
}
