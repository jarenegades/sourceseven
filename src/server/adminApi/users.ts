import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeAdmin } from '../auth.js';
import { pool } from '../db.js';

export default async function users(req: VercelRequest, res: VercelResponse) {
  const auth = await authorizeAdmin(req);
  if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });
  if (req.method === 'GET') {
    const result = await pool.query('SELECT id, email, first_name, last_name, is_admin, created_at FROM public.user_profiles ORDER BY created_at DESC');
    return res.status(200).json({ users: result.rows });
  }
  if (req.method === 'PATCH') {
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    if (!id || req.body?.is_admin !== true) return res.status(400).json({ error: 'A user id and is_admin=true are required' });
    const result = await pool.query('UPDATE public.user_profiles SET is_admin = true WHERE id = $1 RETURNING id, email, first_name, last_name, is_admin, created_at', [id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user: result.rows[0] });
  }
  res.setHeader('Allow', 'GET, PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
}
