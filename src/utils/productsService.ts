import { supabase } from './supabaseClient';
import { getAuthAccessToken, getNeonAuthSessionId } from './neonAuthClient';
import { Product } from '../components/ProductCard';
import { config } from './config';
import { commerceSettingsService } from './commerceSettingsService';
import { canonicalProductCategory, ProductCategoryFilter, ProductCategoryId, supabaseProductCategory } from './categoryIds';

const useNeonProductApi = import.meta.env.VITE_USE_NEON_PRODUCT_API === 'true';

async function fetchNeonProducts(query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const response = await fetch(`/api/products?${params.toString()}`);
  if (!response.ok) throw new Error(`Product API request failed (${response.status})`);
  return response.json() as Promise<{ products: any[]; count: number; product?: any }>;
}

async function getAdminAccessToken(): Promise<string> {
  const accessToken = await getAuthAccessToken();
  if (!accessToken) throw new Error('Sign in with an administrator account to manage products');
  return accessToken;
}

async function bulkNeonProductRequest(method: 'POST' | 'DELETE', body: unknown): Promise<any> {
  const accessToken = await getAdminAccessToken();
  const sessionId = await getNeonAuthSessionId();
  const response = await fetch('/api/admin/products/bulk', {
    method,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(sessionId ? { 'X-Neon-Session-Id': sessionId } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Bulk product request failed (${response.status})`);
  return result;
}

async function mutateNeonProduct(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  payload?: Partial<Product>,
  id?: string,
  query?: Record<string, string | number>,
): Promise<any> {
  const accessToken = await getAdminAccessToken();
  const sessionId = await getNeonAuthSessionId();

  const params = new URLSearchParams(query ? Object.entries(query).map(([key, value]) => [key, String(value)]) : []);
  if (id) params.set('id', id);
  const suffix = params.size ? `?${params.toString()}` : '';
  const response = await fetch(`/api/admin/products${suffix}`, {
    method,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(sessionId ? { 'X-Neon-Session-Id': sessionId } : {}),
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || `Product API request failed (${response.status})`);
  }

  return response.status === 204 ? undefined : response.json();
}

const applyPricingSettings = async (products: Product[]): Promise<Product[]> => {
  try {
    const settings = await commerceSettingsService.getPricingSettings();
    const purchaseModes = new Map(settings.map((setting) => [setting.product_id, setting.purchase_mode]));
    return products.map((product) => ({ ...product, purchaseMode: purchaseModes.get(product.id) || 'price' }));
  } catch (error) {
    console.error('Could not load product pricing settings:', error);
    return products;
  }
};

/**
 * Products Service - Handles all product operations with Supabase
 * Provides fallback to local state when Supabase is disabled or fails
 */

// Helper to shuffle array consistently based on page number
const shuffleArrayByPage = (array: any[], page: number): any[] => {
  const shuffled = [...array];
  // Use page number as seed for consistent shuffling per page
  const seed = page * 12345;
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((seed + i) * 9007199254740992) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const productsService = {
  /**
   * Fetch products with pagination and filtering
   */
  async getProducts(options: {
    page?: number;
    limit?: number;
    category?: ProductCategoryFilter;
    categoryId?: string;
    subcategoryId?: string;
    search?: string;
    sortBy?: 'newest' | 'price-low' | 'price-high' | 'rating';
  }): Promise<{ products: Product[]; count: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;

      if (useNeonProductApi) {
        const result = await fetchNeonProducts({ ...options, page, limit });
        return { products: (result.products || []).map(this.mapToProduct), count: result.count || 0 };
      }

      // Check if we're filtering or just showing all products
      const isFiltered = options.category !== 'all' || options.categoryId || options.subcategoryId || options.search;

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      // Apply filters
      if (options.category && options.category !== 'all') {
        query = query.eq('category', supabaseProductCategory(options.category));
      }

      if (options.categoryId) {
        query = query.eq('category_id', options.categoryId);
      }

      if (options.subcategoryId) {
        query = query.eq('subcategory_id', options.subcategoryId);
      }

      if (options.search) {
        query = query.or(
          `name.ilike.%${options.search}%,description.ilike.%${options.search}%`
        );
      }

      // Determine sort order
      let orderBy = 'created_at';
      let ascending = false;
      
      if (options.sortBy === 'price-low') {
        orderBy = 'price';
        ascending = true;
      } else if (options.sortBy === 'price-high') {
        orderBy = 'price';
        ascending = false;
      } else if (options.sortBy === 'rating') {
        orderBy = 'rating';
        ascending = false;
      }
      // Default is 'newest' (created_at descending)

      // If showing all products without filters, fetch more to shuffle and select
      // This ensures good distribution across categories
      if (!isFiltered && options.category === 'all' && !options.sortBy) {
        const { data, count, error } = await query
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Shuffle all products for better distribution
        const allProducts = (data || []).map(this.mapToProduct);
        const shuffled = shuffleArrayByPage(allProducts, page);

        // Apply pagination on shuffled results
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedProducts = shuffled.slice(start, end);

        return {
          products: await applyPricingSettings(paginatedProducts),
          count: count || 0
        };
      } else {
        // For filtered results or when sorting, use normal pagination
        const start = (page - 1) * limit;
        const end = start + limit - 1;

        const { data, count, error } = await query
          .order(orderBy, { ascending })
          .range(start, end);

        if (error) throw error;

        return {
          products: await applyPricingSettings((data || []).map(this.mapToProduct)),
          count: count || 0
        };
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  /**
   * Fetch all active products from Supabase
   */
  async getAll(): Promise<Product[]> {
    try {
      if (useNeonProductApi) {
        const allProducts: Product[] = [];
        let page = 1;
        let total = Number.POSITIVE_INFINITY;
        while ((page - 1) * 100 < total) {
          const result = await mutateNeonProduct('GET', undefined, undefined, { page, limit: 100 });
          allProducts.push(...(result.products || []).map(this.mapToProduct));
          total = Number(result.count) || 0;
          if (page * 100 >= total) break;
          if (page >= 1000) throw new Error('Admin product list exceeds the API pagination limit');
          page += 1;
        }
        return allProducts;
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });


      if (error) throw error;

      // Map Supabase data to Product interface
      return applyPricingSettings((data || []).map(this.mapToProduct));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  /**
   * Get a single product by ID
   */
  async getById(id: string): Promise<Product | null> {
    try {
      if (useNeonProductApi) {
        const result = await fetchNeonProducts({ id });
        return result.product ? this.mapToProduct(result.product) : null;
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data ? (await applyPricingSettings([this.mapToProduct(data)]))[0] : null;
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  },

  /**
   * Create a new product in Supabase
   */
  async create(product: Omit<Product, 'id'>): Promise<Product> {
    if (!config.useSupabase) {
      throw new Error('Supabase is disabled');
    }

    try {
      if (useNeonProductApi) {
        const result = await mutateNeonProduct('POST', product);
        return this.mapToProduct(result.product);
      }

      const productData = this.mapToSupabase(product);

      // Use admin client to bypass RLS policies
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) throw error;

      if (config.debugMode) {
        console.log('✅ Product created in Supabase:', data);
      }

      return this.mapToProduct(data);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  /**
   * Update an existing product
   */
  async update(id: string, updates: Partial<Product>): Promise<Product> {
    if (!config.useSupabase) {
      throw new Error('Supabase is disabled');
    }

    try {
      if (useNeonProductApi) {
        const result = await mutateNeonProduct('PATCH', updates, id);
        return this.mapToProduct(result.product);
      }

      const updateData = this.mapToSupabase(updates);

      // Use admin client to bypass RLS policies
      // @ts-ignore - JSR Supabase package has strict typing issues
      const { data, error } = await supabase
        .from('products')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (config.debugMode) {
        console.log('✅ Product updated in Supabase:', data);
      }

      return this.mapToProduct(data);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  /**
   * Delete a product (soft delete by marking inactive)
   */
  async delete(id: string): Promise<void> {
    if (!config.useSupabase) {
      throw new Error('Supabase is disabled');
    }

    try {
      if (useNeonProductApi) {
        await mutateNeonProduct('DELETE', undefined, id);
        return;
      }

      // Use admin client to bypass RLS policies
      // Soft delete by marking as inactive
      // @ts-ignore - JSR Supabase package has strict typing issues
      const { error } = await supabase
        .from('products')
        .update({ is_active: false } as any)
        .eq('id', id);

      if (error) throw error;

      if (config.debugMode) {
        console.log('✅ Product deleted (soft) from Supabase:', id);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  /**
   * Hard delete a product (permanent removal)
   */
  async hardDelete(id: string): Promise<void> {
    if (useNeonProductApi) throw new Error('Permanent product deletion is not available through the Neon API yet');
    if (!config.useSupabase) {
      throw new Error('Supabase is disabled');
    }

    try {
      console.log('🗑️ Attempting to delete product from Supabase:', id);

      // Use admin client to bypass RLS policies
      const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Supabase delete error:', error);
        throw new Error(`Supabase delete failed: ${error.message}`);
      }

      console.log('✅ Product permanently deleted from Supabase:', id, data);
    } catch (error) {
      console.error('❌ Error hard deleting product:', error);
      throw error;
    }
  },

  /**
   * Bulk delete products by category or all
   * More efficient than deleting one by one
   */
  async bulkDelete(action: ProductCategoryId | 'purge'): Promise<number> {
    if (useNeonProductApi) {
      const result = await bulkNeonProductRequest('DELETE', action === 'purge' ? { purge: true } : { category: action });
      return result.deletedCount || 0;
    }
    if (!config.useSupabase) {
      throw new Error('Supabase is disabled');
    }

    try {
      // First, count products to be deleted
      let countQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (action !== 'purge') {
        countQuery = countQuery.eq('category', supabaseProductCategory(action));
      }

      const { count: countBefore } = await countQuery;
      const deletedCount = countBefore || 0;

      if (deletedCount === 0) {
        console.log(`⚠️ No products found to delete for action: ${action}`);
        return 0;
      }

      // Perform bulk delete
      let deleteQuery = supabase
        .from('products')
        .delete();

      if (action === 'purge') {
        // For purge, we need a WHERE clause that matches all rows
        // Using .neq('id', '') which matches all UUIDs (they're never empty strings)
        deleteQuery = deleteQuery.neq('id', '');
      } else {
        deleteQuery = deleteQuery.eq('category', supabaseProductCategory(action));
      }

      const { error } = await deleteQuery;

      if (error) {
        console.error('❌ Bulk delete error:', error);
        throw error;
      }

      if (config.debugMode) {
        console.log(`✅ Bulk delete complete: ${deletedCount} products deleted (${action})`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Error bulk deleting products:', error);
      throw error;
    }
  },

  /**
   * Ensure category exists, create if missing
   */
  async ensureCategory(categoryId: string, category: ProductCategoryId): Promise<void> {
    if (!categoryId) return;

    try {
      // Check if category exists
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('id', categoryId)
        .single();

      if (existing) {
        return; // Category already exists
      }

      // Create missing category
      const categoryName = categoryId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const parentId = category === 'mounted-linear-units' ? 'baby' : 'pharmaceutical';

      const { error } = await supabase
        .from('categories')
        .insert({
          id: categoryId,
          name: categoryName,
          slug: categoryId,
          description: `${categoryName} products`,
          parent_id: parentId,
          display_order: 0,
          is_active: true,
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.warn(`⚠️ Failed to create category ${categoryId}:`, error.message);
      } else if (!error) {
        console.log(`✅ Created missing category: ${categoryId}`);
      }
    } catch (err) {
      console.warn(`⚠️ Error ensuring category ${categoryId}:`, err);
      // Don't throw - continue with import even if category creation fails
    }
  },

  /**
   * Bulk import products
   * Batches inserts to handle large volumes (e.g., 200+ products)
   */
  async bulkImport(products: Omit<Product, 'id'>[]): Promise<number> {
    if (useNeonProductApi) {
      const CHUNK_SIZE = 200; // matches the server's 500-row cap with headroom
      let imported = 0;
      for (let i = 0; i < products.length; i += CHUNK_SIZE) {
        const chunk = products.slice(i, i + CHUNK_SIZE);
        const result = await bulkNeonProductRequest('POST', chunk);
        const batchImported = Number(result.imported);
        if (!Number.isSafeInteger(batchImported) || batchImported !== chunk.length) {
          throw new Error(`Neon imported ${Number.isSafeInteger(batchImported) ? batchImported : 0} of ${chunk.length} products in batch ${Math.floor(i / CHUNK_SIZE) + 1}; ${imported} earlier products may already have been saved`);
        }
        imported += batchImported;
      }
      return imported;
    }
    if (!config.useSupabase) {
      throw new Error('Supabase is disabled');
    }

    try {
      // First, ensure all categories exist
      const categoryIds = new Set<string>();
      products.forEach(p => {
        if (p.categoryId) {
          categoryIds.add(p.categoryId);
        }
      });

      // Create missing categories in parallel
      await Promise.allSettled(
        Array.from(categoryIds).map(categoryId => {
          // Determine parent category from first product using this categoryId
          const product = products.find(p => p.categoryId === categoryId);
          const parentCategory = product?.category || 'rolling-bearings';
          return productsService.ensureCategory(categoryId, parentCategory);
        })
      );

      const productsData = products.map(this.mapToSupabase);
      const BATCH_SIZE = 50; // Supabase can handle more, but batching prevents timeout issues
      let totalImported = 0;
      let allErrors: Error[] = [];

      // Process in batches
      for (let i = 0; i < productsData.length; i += BATCH_SIZE) {
        const batch = productsData.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(productsData.length / BATCH_SIZE);

        if (config.debugMode) {
          console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);
        }

        try {
          // Use admin client to bypass RLS policies
          const { data, error } = await supabase
            .from('products')
            .insert(batch as any)
            .select();

          if (error) {
            console.error(`❌ Error in batch ${batchNumber}:`, error);
            allErrors.push(new Error(`Batch ${batchNumber}: ${error.message}`));
            continue; // Continue with next batch
          }

          const batchCount = data?.length || 0;
          totalImported += batchCount;

          if (config.debugMode) {
            console.log(`✅ Batch ${batchNumber} imported: ${batchCount} products`);
          }

          // Small delay between batches to avoid rate limiting
          if (i + BATCH_SIZE < productsData.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (batchError) {
          console.error(`❌ Error processing batch ${batchNumber}:`, batchError);
          allErrors.push(new Error(`Batch ${batchNumber}: ${batchError instanceof Error ? batchError.message : String(batchError)}`));
        }
      }

      if (config.debugMode) {
        console.log(`✅ Bulk import complete: ${totalImported}/${productsData.length} products imported`);
        if (allErrors.length > 0) {
          console.warn(`⚠️ ${allErrors.length} batches had errors:`, allErrors);
        }
      }

      // If we imported at least some products, return success count
      // If all failed, throw the first error
      if (totalImported === 0 && allErrors.length > 0) {
        throw new Error(`Bulk import failed: ${allErrors[0].message}`);
      }

      return totalImported;
    } catch (error) {
      console.error('Error bulk importing products:', error);
      throw error;
    }
  },

  /**
   * Search products by name or description
   */
  async search(query: string, category?: ProductCategoryId): Promise<Product[]> {
    if (!config.useSupabase) {
      return [];
    }

    try {
      let queryBuilder = supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (category) {
        queryBuilder = queryBuilder.eq('category', supabaseProductCategory(category));
      }

      // Use full-text search if available, otherwise use ILIKE
      queryBuilder = queryBuilder.or(
        `name.ilike.%${query}%,description.ilike.%${query}%`
      );

      const { data, error } = await queryBuilder;

      if (error) throw error;

      return (data || []).map(this.mapToProduct);
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  },

  /**
   * Get products by category
   */
  async getByCategory(category: ProductCategoryId): Promise<Product[]> {
    if (!config.useSupabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', supabaseProductCategory(category))
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapToProduct);
    } catch (error) {
      console.error('Error fetching products by category:', error);
      return [];
    }
  },

  /**
   * Update stock count
   */
  async updateStock(id: string, quantity: number): Promise<void> {
    if (useNeonProductApi) throw new Error('Stock-only updates are not available through the Neon API yet');
    if (!config.useSupabase) {
      throw new Error('Supabase is disabled');
    }

    try {
      // @ts-ignore - JSR Supabase package has strict typing issues
      const { error } = await supabase
        .from('products')
        .update({
          stock_count: quantity,
          in_stock: quantity > 0,
        } as any)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  },

  /**
   * Map Supabase product data to frontend Product interface
   */
  mapToProduct(data: any): Product {
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      category: canonicalProductCategory(data.category),
      categoryId: data.category_id,
      subcategoryId: data.subcategory_id,
      price: Number(data.price),
      originalPrice: data.original_price ? Number(data.original_price) : undefined,
      currency: data.currency || 'USD',
      rating: Number(data.rating),
      reviewCount: data.review_count,
      image: data.image_url || '',
      inStock: data.in_stock,
      badge: data.badge,
      stockCount: data.stock_count,
      soldCount: data.sold_count,
      costPrice: data.cost_price ? Number(data.cost_price) : undefined,
      purchaseMode: data.purchase_mode || 'price',
      isActive: data.is_active ?? true,
    };
  },

  /**
   * Map frontend Product to Supabase database format
   */
  mapToSupabase(product: Partial<Product>): any {
    const mapped: any = {};

    if (product.name !== undefined) mapped.name = product.name;
    if (product.description !== undefined) mapped.description = product.description;
    if (product.category !== undefined) mapped.category = supabaseProductCategory(product.category);
    if (product.categoryId !== undefined) mapped.category_id = product.categoryId || null;
    if (product.subcategoryId !== undefined) mapped.subcategory_id = product.subcategoryId || null;
    if (product.price !== undefined) mapped.price = product.price;
    if (product.originalPrice !== undefined) mapped.original_price = product.originalPrice;
    // Always set currency - default to USD if not provided
    mapped.currency = product.currency || 'USD';
    if (product.rating !== undefined) mapped.rating = product.rating;
    if (product.reviewCount !== undefined) mapped.review_count = product.reviewCount;
    if (product.image !== undefined) mapped.image_url = product.image;
    if (product.inStock !== undefined) mapped.in_stock = product.inStock;
    if (product.badge !== undefined) mapped.badge = product.badge;
    if (product.stockCount !== undefined) mapped.stock_count = product.stockCount;
    if (product.soldCount !== undefined) mapped.sold_count = product.soldCount;
    if (product.costPrice !== undefined) mapped.cost_price = product.costPrice;
    if (product.isActive !== undefined) mapped.is_active = product.isActive;

    return mapped;
  },
};
