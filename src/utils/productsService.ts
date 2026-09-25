import { getAuthAccessToken, getNeonAuthSessionId } from './neonAuthClient';
import { Product } from '../components/ProductCard';
import { canonicalProductCategory, ProductCategoryFilter, ProductCategoryId } from './categoryIds';

type ProductList = { products: any[]; count: number; product?: any };

async function publicProducts(query: Record<string, string | number | undefined>): Promise<ProductList> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const response = await fetch(`/api/products?${params.toString()}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Product request failed (${response.status})`);
  return result as ProductList;
}

async function adminProducts(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<any> {
  const accessToken = await getAuthAccessToken();
  if (!accessToken) throw new Error('Sign in with an administrator account to manage products');
  const sessionId = await getNeonAuthSessionId();
  const response = await fetch(path, {
    method,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(sessionId ? { 'X-Neon-Session-Id': sessionId } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 204) return undefined;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Product request failed (${response.status})`);
  return result;
}

async function readAll(query: Record<string, string | number | undefined>): Promise<Product[]> {
  const all: Product[] = [];
  for (let page = 1; page <= 1000; page += 1) {
    const result = await publicProducts({ ...query, page, limit: 100 });
    all.push(...(result.products || []).map(productsService.mapToProduct));
    if (all.length >= result.count || (result.products || []).length === 0) return all;
  }
  throw new Error('Product list exceeds the API pagination limit');
}

export const productsService = {
  async getProducts(options: {
    page?: number;
    limit?: number;
    category?: ProductCategoryFilter;
    categoryId?: string;
    subcategoryId?: string;
    search?: string;
    sortBy?: 'newest' | 'price-low' | 'price-high' | 'rating';
  }): Promise<{ products: Product[]; count: number }> {
    const result = await publicProducts({ ...options, page: options.page || 1, limit: options.limit || 20 });
    return { products: (result.products || []).map(this.mapToProduct), count: result.count || 0 };
  },

  async getAll(): Promise<Product[]> {
    return readAll({});
  },

  async getById(id: string): Promise<Product | null> {
    const result = await publicProducts({ id });
    return result.product ? this.mapToProduct(result.product) : null;
  },

  async create(product: Omit<Product, 'id'>): Promise<Product> {
    const result = await adminProducts('POST', '/api/admin/products', product);
    return this.mapToProduct(result.product);
  },

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const result = await adminProducts('PATCH', `/api/admin/products?id=${encodeURIComponent(id)}`, updates);
    return this.mapToProduct(result.product);
  },

  async delete(id: string): Promise<void> {
    await adminProducts('DELETE', `/api/admin/products?id=${encodeURIComponent(id)}`);
  },

  async hardDelete(_id: string): Promise<void> {
    throw new Error('Permanent deletion is unavailable; deactivate the product instead');
  },

  async bulkDelete(action: ProductCategoryId | 'purge'): Promise<number> {
    const result = await adminProducts('DELETE', '/api/admin/products/bulk', action === 'purge' ? { purge: true } : { category: action });
    return result.deletedCount || 0;
  },

  async ensureCategory(_categoryId: string, _category: ProductCategoryId): Promise<void> {
    // The Neon bulk import API validates categories and handles the import atomically.
  },

  async bulkImport(products: Omit<Product, 'id'>[]): Promise<number> {
    const chunkSize = 200;
    let imported = 0;
    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize);
      const result = await adminProducts('POST', '/api/admin/products/bulk', chunk);
      const count = Number(result.imported);
      if (!Number.isSafeInteger(count) || count !== chunk.length) {
        throw new Error(`Imported ${Number.isSafeInteger(count) ? count : 0} of ${chunk.length} products in batch ${Math.floor(i / chunkSize) + 1}`);
      }
      imported += count;
    }
    return imported;
  },

  async search(query: string, category?: ProductCategoryId): Promise<Product[]> {
    return readAll({ search: query, category });
  },

  async getByCategory(category: ProductCategoryId): Promise<Product[]> {
    return readAll({ category, sortBy: 'rating' });
  },

  async updateStock(id: string, quantity: number): Promise<void> {
    await this.update(id, { stockCount: quantity, inStock: quantity > 0 });
  },

  mapToProduct(data: any): Product {
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      category: canonicalProductCategory(data.category),
      categoryId: data.category_id,
      subcategoryId: data.subcategory_id,
      price: Number(data.price),
      originalPrice: data.original_price == null ? undefined : Number(data.original_price),
      currency: data.currency || 'USD',
      rating: Number(data.rating || 0),
      reviewCount: data.review_count || 0,
      image: data.image_url || '',
      inStock: data.in_stock,
      badge: data.badge,
      stockCount: data.stock_count,
      soldCount: data.sold_count,
      costPrice: data.cost_price == null ? undefined : Number(data.cost_price),
      purchaseMode: data.purchase_mode || 'price',
      isActive: data.is_active ?? true,
    };
  },
};
