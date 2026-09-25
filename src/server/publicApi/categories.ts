import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asc, eq } from 'drizzle-orm';
import { authorizeAdmin } from '../auth.js';
import { db } from '../db.js';
import { categories } from '../schema.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const includeInactive = req.query.includeInactive === '1';
  if (includeInactive) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    const auth = await authorizeAdmin(req);
    if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });
  } else {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  }
  try {
    const query = db.select().from(categories);
    const rows = includeInactive
      ? await query.orderBy(asc(categories.displayOrder), asc(categories.name))
      : await query.where(eq(categories.isActive, true)).orderBy(asc(categories.displayOrder), asc(categories.name));
    return res.status(200).json({ categories: rows.map((row) => ({
      id: row.id, name: row.name, slug: row.slug, description: row.description,
      parent_id: row.parentId, display_order: row.displayOrder, is_active: row.isActive,
    })) });
  } catch (error) {
    console.error('Categories API failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(500).json({ error: 'Unable to load categories' });
  }
}
