import type { VercelRequest, VercelResponse } from '@vercel/node';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '../src/server/db.js';
import { productPricingSettings, products } from '../src/server/schema.js';

const PAGE_SIZE_MAX = 100;
const PAGE_MAX = 1000;

function readPositiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
    const filters = [eq(products.isActive, true)];

    if (id) filters.push(eq(products.id, id));

    const category = req.query.category;
    if (category === 'rolling-bearings' || category === 'mounted-linear-units') {
      filters.push(eq(products.category, category));
    } else if (typeof category === 'string' && category !== 'all') {
      return res.status(400).json({ error: 'Invalid category' });
    }

    if (typeof req.query.categoryId === 'string' && req.query.categoryId.trim()) {
      filters.push(eq(products.categoryId, req.query.categoryId.trim()));
    }
    if (typeof req.query.subcategoryId === 'string' && req.query.subcategoryId.trim()) {
      filters.push(eq(products.subcategoryId, req.query.subcategoryId.trim()));
    }

    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 120) : '';
    if (search) {
      const pattern = `%${escapeLike(search)}%`;
      filters.push(or(ilike(products.name, pattern), ilike(products.description, pattern))!);
    }

    const page = readPositiveInt(req.query.page, 1, PAGE_MAX);
    const limit = readPositiveInt(req.query.limit, 20, PAGE_SIZE_MAX);
    const sortBy = req.query.sortBy;
    const sort = sortBy === 'price-low'
      ? asc(products.price)
      : sortBy === 'price-high'
        ? desc(products.price)
        : sortBy === 'rating'
          ? desc(products.rating)
          : desc(products.createdAt);

    const where = and(...filters);
    const [rows, [total]] = await Promise.all([
      db.select({ product: products, purchaseMode: productPricingSettings.purchaseMode })
        .from(products)
        .leftJoin(productPricingSettings, eq(products.id, productPricingSettings.productId))
        .where(where)
        .orderBy(sort, desc(products.id))
        .limit(id ? 1 : limit)
        .offset(id ? 0 : (page - 1) * limit),
      db.select({ value: count() }).from(products).where(where),
    ]);

    const result = rows.map(({ product, purchaseMode }) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      category_id: product.categoryId,
      subcategory_id: product.subcategoryId,
      price: Number(product.price),
      original_price: product.originalPrice === null ? null : Number(product.originalPrice),
      currency: product.currency,
      image_url: product.imageUrl,
      rating: Number(product.rating),
      review_count: product.reviewCount,
      stock_count: product.stockCount,
      sold_count: product.soldCount,
      in_stock: product.inStock,
      badge: product.badge,
      purchase_mode: purchaseMode || 'price',
    }));

    if (id) {
      if (result.length === 0) return res.status(404).json({ error: 'Product not found' });
      return res.status(200).json({ product: result[0] });
    }

    return res.status(200).json({ products: result, count: total.value, page, limit });
  } catch (error) {
    console.error('Public products API failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(500).json({ error: 'Unable to load products' });
  }
}
