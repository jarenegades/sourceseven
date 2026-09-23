import type { VercelRequest, VercelResponse } from '@vercel/node';
import { count, desc, eq, inArray } from 'drizzle-orm';
import { authorizeSupabaseAdmin } from '../../src/server/auth.js';
import { db } from '../../src/server/db.js';
import { mergeProductCategorySelection, validateProductCategoryHierarchy } from '../../src/server/productCategoryHierarchy.js';
import { categories, productPricingSettings, products } from '../../src/server/schema.js';

const allowedFields = new Set([
  'name', 'description', 'category', 'categoryId', 'subcategoryId', 'price',
  'originalPrice', 'costPrice', 'currency', 'rating', 'reviewCount', 'image',
  'inStock', 'badge', 'stockCount', 'soldCount',
]);

export type ProductValues = Partial<typeof products.$inferInsert>;
type ValidationResult = { ok: true; values: ProductValues } | { ok: false; message: string };

function setNoStore(res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Vary', 'Authorization');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function hasAtMostTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-7;
}

export function validateProductInput(input: unknown, isCreate: boolean): ValidationResult {
  const body = asRecord(input);
  if (!body) return { ok: false, message: 'A JSON object is required' };

  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) return { ok: false, message: `Unsupported product field: ${key}` };
  }
  if (!isCreate && Object.keys(body).length === 0) {
    return { ok: false, message: 'At least one product field is required' };
  }
  if (isCreate && (!('name' in body) || !('category' in body) || !('price' in body) || !('image' in body))) {
    return { ok: false, message: 'Name, category, price, and image are required' };
  }

  const values: ProductValues = {};
  const textFields: Array<[string, keyof ProductValues, number, boolean]> = [
    ['name', 'name', 255, true],
    ['description', 'description', 20_000, false],
    ['categoryId', 'categoryId', 50, false],
    ['subcategoryId', 'subcategoryId', 50, false],
    ['image', 'imageUrl', 2_048, true],
    ['badge', 'badge', 50, false],
  ];
  for (const [inputKey, dbKey, maxLength, required] of textFields) {
    if (!(inputKey in body)) continue;
    const raw = body[inputKey];
    if (raw === null && !required && (inputKey === 'description' || inputKey === 'categoryId' || inputKey === 'subcategoryId' || inputKey === 'badge')) {
      (values as any)[dbKey] = null;
      continue;
    }
    if (typeof raw !== 'string' || raw.trim().length === 0 && required || raw.length > maxLength) {
      return { ok: false, message: `Invalid ${inputKey}` };
    }
    const trimmed = raw.trim();
    (values as any)[dbKey] = !trimmed && (inputKey === 'categoryId' || inputKey === 'subcategoryId' || inputKey === 'badge')
      ? null
      : trimmed;
  }

  if ('category' in body) {
    if (body.category !== 'rolling-bearings' && body.category !== 'mounted-linear-units') {
      return { ok: false, message: 'Invalid category' };
    }
    values.category = body.category;
  }
  if ('currency' in body) {
    if (body.currency !== 'USD' && body.currency !== 'JMD' && body.currency !== 'CAD') {
      return { ok: false, message: 'Invalid currency' };
    }
    values.currency = body.currency;
  }

  const moneyFields: Array<[string, keyof ProductValues]> = [
    ['price', 'price'], ['originalPrice', 'originalPrice'], ['costPrice', 'costPrice'],
  ];
  for (const [inputKey, dbKey] of moneyFields) {
    if (!(inputKey in body)) continue;
    const raw = body[inputKey];
    if (raw === null && (inputKey === 'originalPrice' || inputKey === 'costPrice')) {
      (values as any)[dbKey] = null;
      continue;
    }
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0 || raw > 99_999_999.99 || !hasAtMostTwoDecimals(raw)) {
      return { ok: false, message: `Invalid ${inputKey}` };
    }
    (values as any)[dbKey] = String(raw);
  }

  if ('rating' in body) {
    if (typeof body.rating !== 'number' || !Number.isFinite(body.rating) || body.rating < 0 || body.rating > 5 || !hasAtMostTwoDecimals(body.rating)) {
      return { ok: false, message: 'Invalid rating' };
    }
    values.rating = String(body.rating);
  }

  for (const [inputKey, dbKey] of [
    ['reviewCount', 'reviewCount'], ['stockCount', 'stockCount'], ['soldCount', 'soldCount'],
  ] as const) {
    if (!(inputKey in body)) continue;
    const raw = body[inputKey];
    if (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw < 0) {
      return { ok: false, message: `Invalid ${inputKey}` };
    }
    (values as any)[dbKey] = raw;
  }

  if ('inStock' in body) {
    if (typeof body.inStock !== 'boolean') return { ok: false, message: 'Invalid inStock value' };
    values.inStock = body.inStock;
  }

  if (isCreate) {
    values.currency ??= 'USD';
    values.description ??= '';
    values.categoryId ??= null;
    values.subcategoryId ??= null;
    values.originalPrice ??= null;
    values.costPrice ??= null;
    values.rating ??= '0';
    values.reviewCount ??= 0;
    values.stockCount ??= 0;
    values.soldCount ??= 0;
    values.inStock ??= true;
    values.badge ??= null;
    values.isActive = true;
  }

  return { ok: true, values };
}

function serializeAdminProduct(row: typeof products.$inferSelect, purchaseMode?: string | null) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category,
    category_id: row.categoryId,
    subcategory_id: row.subcategoryId,
    price: Number(row.price),
    original_price: row.originalPrice === null ? null : Number(row.originalPrice),
    cost_price: row.costPrice === null ? null : Number(row.costPrice),
    currency: row.currency,
    image_url: row.imageUrl,
    rating: Number(row.rating),
    review_count: row.reviewCount,
    stock_count: row.stockCount,
    sold_count: row.soldCount,
    in_stock: row.inStock,
    badge: row.badge,
    is_active: row.isActive,
    purchase_mode: purchaseMode || 'price',
  };
}

async function validateCategoryHierarchy(selection: {
  category: string;
  categoryId: string | null;
  subcategoryId: string | null;
}): Promise<string | null> {
  const ids = [...new Set([selection.category, selection.categoryId, selection.subcategoryId].filter((id): id is string => Boolean(id)))];
  const rows = await db.select({ id: categories.id, parentId: categories.parentId })
    .from(categories)
    .where(inArray(categories.id, ids));
  return validateProductCategoryHierarchy(selection, new Map(rows.map((row) => [row.id, row])));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setNoStore(res);

  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authorization = await authorizeSupabaseAdmin(req);
  if (authorization.authorized === false) {
    return res.status(authorization.status).json({ error: authorization.message });
  }

  try {
    if (req.method === 'GET') {
      const rawPage = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : 1;
      const rawLimit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 100;
      if (!Number.isSafeInteger(rawPage) || rawPage < 1 || rawPage > 1000) return res.status(400).json({ error: 'Invalid page' });
      if (!Number.isSafeInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) return res.status(400).json({ error: 'Limit must be between 1 and 100' });
      const offset = (rawPage - 1) * rawLimit;
      const [rows, [total]] = await Promise.all([
        db.select({ product: products, purchaseMode: productPricingSettings.purchaseMode })
          .from(products)
          .leftJoin(productPricingSettings, eq(products.id, productPricingSettings.productId))
          .orderBy(desc(products.createdAt), desc(products.id))
          .limit(rawLimit)
          .offset(offset),
        db.select({ value: count() }).from(products),
      ]);
      return res.status(200).json({
        products: rows.map(({ product, purchaseMode }) => serializeAdminProduct(product, purchaseMode)),
        count: total.value,
        page: rawPage,
        limit: rawLimit,
      });
    }

    if (req.method === 'POST') {
      const parsed = validateProductInput(req.body, true);
      if (parsed.ok === false) return res.status(400).json({ error: parsed.message });
      const hierarchyError = await validateCategoryHierarchy({
        category: parsed.values.category!,
        categoryId: parsed.values.categoryId ?? null,
        subcategoryId: parsed.values.subcategoryId ?? null,
      });
      if (hierarchyError) return res.status(400).json({ error: hierarchyError });

      const [created] = await db.insert(products).values(parsed.values as typeof products.$inferInsert).returning();
      return res.status(201).json({ product: serializeAdminProduct(created) });
    }

    const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
    if (!id || id.length > 255) return res.status(400).json({ error: 'A valid product id is required' });

    if (req.method === 'PATCH') {
      const parsed = validateProductInput(req.body, false);
      if (parsed.ok === false) return res.status(400).json({ error: parsed.message });
      const [existing] = await db.select({
        category: products.category,
        categoryId: products.categoryId,
        subcategoryId: products.subcategoryId,
      }).from(products).where(eq(products.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: 'Product not found' });

      const finalSelection = mergeProductCategorySelection(existing, parsed.values);
      const hierarchyError = await validateCategoryHierarchy(finalSelection);
      if (hierarchyError) return res.status(400).json({ error: hierarchyError });

      const [updated] = await db.update(products).set(parsed.values).where(eq(products.id, id)).returning();
      if (!updated) return res.status(404).json({ error: 'Product not found' });
      return res.status(200).json({ product: serializeAdminProduct(updated) });
    }

    const [deleted] = await db.update(products)
      .set({ isActive: false })
      .where(eq(products.id, id))
      .returning({ id: products.id });
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    return res.status(204).end();
  } catch (error) {
    console.error('Admin product mutation failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(500).json({ error: 'Unable to save product' });
  }
}
