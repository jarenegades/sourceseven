import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { authorizeAdmin } from '../../../src/server/auth.js';
import { db } from '../../../src/server/db.js';
import { categories, products } from '../../../src/server/schema.js';
import { validateProductInput, type ProductValues } from '../../../src/server/adminApi/products.js';
import { isForeignKeyViolation, titleCase } from '../../../src/server/bulkProductHelpers.js';

const MAX_BULK_ITEMS = 500;

function setNoStore(res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Vary', 'Authorization');
}

// Creates any category/subcategory rows an imported product references but that
// don't exist yet, mirroring the old client-side ensureCategory() behavior.
async function ensureCategories(values: ProductValues[]): Promise<void> {
  const rows: (typeof categories.$inferInsert)[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const root = value.category!;
    if (value.categoryId && !seen.has(value.categoryId)) {
      seen.add(value.categoryId);
      rows.push({
        id: value.categoryId, name: titleCase(value.categoryId), slug: value.categoryId,
        parentId: root, displayOrder: 0, isActive: true,
      });
    }
    if (value.subcategoryId && !seen.has(value.subcategoryId)) {
      seen.add(value.subcategoryId);
      rows.push({
        id: value.subcategoryId, name: titleCase(value.subcategoryId), slug: value.subcategoryId,
        parentId: value.categoryId ?? root, displayOrder: 0, isActive: true,
      });
    }
  }
  if (rows.length === 0) return;
  await db.insert(categories).values(rows).onConflictDoNothing({ target: categories.id });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setNoStore(res);

  if (!['POST', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authorization = await authorizeAdmin(req);
  if (authorization.authorized === false) {
    return res.status(authorization.status).json({ error: authorization.message });
  }

  try {
    if (req.method === 'POST') {
      const items = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'A non-empty array of products is required' });
      }
      if (items.length > MAX_BULK_ITEMS) {
        return res.status(400).json({ error: `At most ${MAX_BULK_ITEMS} products can be imported at once` });
      }

      const values: ProductValues[] = [];
      for (const [index, item] of items.entries()) {
        const parsed = validateProductInput(item, true);
        if (parsed.ok === false) return res.status(400).json({ error: `Row ${index + 1}: ${parsed.message}` });
        values.push(parsed.values);
      }

      await ensureCategories(values);
      const inserted = await db.insert(products)
        .values(values as (typeof products.$inferInsert)[])
        .returning({ id: products.id });
      return res.status(201).json({ imported: inserted.length });
    }

    // DELETE: bulk delete by category, or a full purge.
    const body = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
    const category = typeof body.category === 'string' ? body.category : undefined;
    const purge = body.purge === true;
    if (!purge && category !== 'rolling-bearings' && category !== 'mounted-linear-units') {
      return res.status(400).json({ error: 'Provide { purge: true } or a valid { category }' });
    }

    const deleted = purge
      ? await db.delete(products).returning({ id: products.id })
      : await db.delete(products).where(eq(products.category, category!)).returning({ id: products.id });
    return res.status(200).json({ deletedCount: deleted.length });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return res.status(409).json({ error: 'Cannot permanently delete products that have existing orders. Remove the order history first.' });
    }
    console.error('Bulk product operation failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(500).json({ error: 'Bulk operation failed' });
  }
}
