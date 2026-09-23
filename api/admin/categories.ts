import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { authorizeSupabaseAdmin } from '../../src/server/auth.js';
import { db } from '../../src/server/db.js';
import { categories } from '../../src/server/schema.js';

const roots = new Set(['rolling-bearings', 'mounted-linear-units']);
const idFromName = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
const serialize = (row: typeof categories.$inferSelect) => ({
  id: row.id, name: row.name, slug: row.slug, description: row.description,
  parent_id: row.parentId, display_order: row.displayOrder, is_active: row.isActive,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Authorization');
  if (!['POST', 'PATCH'].includes(req.method || '')) {
    res.setHeader('Allow', 'POST, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const auth = await authorizeSupabaseAdmin(req);
  if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body as Record<string, unknown> : null;
  if (!body) return res.status(400).json({ error: 'A JSON object is required' });
  try {
    if (req.method === 'POST') {
      if (Object.keys(body).some((key) => !['name', 'parentId', 'description', 'displayOrder'].includes(key))) {
        return res.status(400).json({ error: 'Unsupported category field' });
      }
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const parentId = typeof body.parentId === 'string' ? body.parentId : '';
      if (!name || name.length > 100 || !parentId || parentId.length > 50) return res.status(400).json({ error: 'A name and valid parent category are required' });
      const id = idFromName(name);
      if (!id) return res.status(400).json({ error: 'Invalid category name' });
      const [parent] = await db.select({ id: categories.id, parentId: categories.parentId }).from(categories).where(eq(categories.id, parentId)).limit(1);
      if (!parent) return res.status(400).json({ error: 'Parent category is not provisioned in Neon' });
      if (!roots.has(parent.id)) {
        if (!parent.parentId) return res.status(400).json({ error: 'Only canonical department roots can be top-level categories' });
        const [grandparent] = await db.select({ id: categories.id, parentId: categories.parentId })
          .from(categories).where(eq(categories.id, parent.parentId)).limit(1);
        if (!grandparent || !roots.has(grandparent.id) || grandparent.parentId !== null) {
          return res.status(400).json({ error: 'Categories may have at most three levels: department, category, and subcategory' });
        }
      }
      if ('description' in body && body.description !== null && typeof body.description !== 'string') return res.status(400).json({ error: 'Invalid description' });
      if ('displayOrder' in body && (typeof body.displayOrder !== 'number' || !Number.isSafeInteger(body.displayOrder))) return res.status(400).json({ error: 'Invalid display order' });
      let row: typeof categories.$inferSelect;
      try {
        [row] = await db.insert(categories).values({
          id, name, slug: id, parentId,
          description: typeof body.description === 'string' ? body.description.trim().slice(0, 2000) || null : null,
          displayOrder: typeof body.displayOrder === 'number' ? body.displayOrder : 0,
          isActive: true,
        }).returning();
      } catch (error) {
        if ((error as { code?: string })?.code === '23505') return res.status(409).json({ error: 'A category with that name already exists' });
        throw error;
      }
      return res.status(201).json({ category: serialize(row) });
    }

    const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
    if (!id || roots.has(id)) return res.status(400).json({ error: 'A valid child category id is required' });
    if (Object.keys(body).some((key) => !['name', 'description', 'display_order', 'is_active'].includes(key))) return res.status(400).json({ error: 'Unsupported category field' });
    const values: Partial<typeof categories.$inferInsert> = {};
    if ('name' in body) {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100) return res.status(400).json({ error: 'Invalid category name' });
      values.name = body.name.trim();
    }
    if ('description' in body) {
      if (body.description !== null && typeof body.description !== 'string') return res.status(400).json({ error: 'Invalid description' });
      values.description = typeof body.description === 'string' ? body.description.trim().slice(0, 2000) || null : null;
    }
    if ('display_order' in body) {
      if (typeof body.display_order !== 'number' || !Number.isSafeInteger(body.display_order)) return res.status(400).json({ error: 'Invalid display order' });
      values.displayOrder = body.display_order;
    }
    if ('is_active' in body) {
      if (typeof body.is_active !== 'boolean') return res.status(400).json({ error: 'Invalid active flag' });
      values.isActive = body.is_active;
    }
    if (!Object.keys(values).length) return res.status(400).json({ error: 'At least one category field is required' });
    const [row] = await db.update(categories).set(values).where(eq(categories.id, id)).returning();
    if (!row) return res.status(404).json({ error: 'Category not found' });
    return res.status(200).json({ category: serialize(row) });
  } catch (error) {
    console.error('Admin category mutation failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(500).json({ error: 'Unable to save category' });
  }
}
