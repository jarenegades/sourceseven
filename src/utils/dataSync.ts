import Papa from 'papaparse';
import { getNeonAuthHeaders } from './neonAuthClient';

type AdminProductsResponse = {
  products: Array<Record<string, any>>;
  count: number;
  page: number;
  limit: number;
};

const PAGE_SIZE = 100;

async function fetchAdminProducts(page: number, limit = PAGE_SIZE): Promise<AdminProductsResponse> {
  const headers = await getNeonAuthHeaders();
  if (!headers.Authorization) {
    throw new Error('Sign in with an administrator account to access Neon product data');
  }

  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  const response = await fetch(`/api/admin/products?${query}`, {
    method: 'GET',
    cache: 'no-store',
    headers,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Neon admin API request failed (${response.status})`);
  }
  return result as AdminProductsResponse;
}

async function fetchAllAdminProducts(): Promise<AdminProductsResponse['products']> {
  const products: AdminProductsResponse['products'] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while ((page - 1) * PAGE_SIZE < total) {
    const result = await fetchAdminProducts(page);
    products.push(...(result.products || []));
    total = Number(result.count) || 0;
    if (page * PAGE_SIZE >= total) break;
    if (page >= 1000) throw new Error('Neon product export exceeds the API pagination limit');
    page += 1;
  }

  if (products.length !== total) {
    throw new Error(`Neon export was incomplete (${products.length} of ${total} products fetched)`);
  }
  return products;
}

export const dataSync = {
  checkNeonHealth: async () => {
    try {
      const result = await fetchAdminProducts(1, 1);
      return {
        available: true,
        message: 'Neon Postgres is connected and responding',
        productCount: Number(result.count) || 0,
      };
    } catch (error) {
      return {
        available: false,
        message: error instanceof Error ? error.message : 'Neon Postgres is not responding',
      };
    }
  },

  exportToCSV: async () => {
    try {
      const products = await fetchAllAdminProducts();
      if (products.length === 0) {
        return { success: false, message: 'No Neon products to export' };
      }

      const fields = [
        'name', 'description', 'category', 'categoryId', 'subcategoryId', 'price',
        'costPrice', 'stockCount', 'soldCount', 'rating', 'reviewCount', 'image',
        'inStock', 'badge', 'currency',
      ];
      const rows = products.map((product) => ({
        name: product.name ?? '',
        description: product.description ?? '',
        category: product.category ?? '',
        categoryId: product.category_id ?? '',
        subcategoryId: product.subcategory_id ?? '',
        price: product.price ?? '',
        costPrice: product.cost_price ?? '',
        stockCount: product.stock_count ?? '',
        soldCount: product.sold_count ?? 0,
        rating: product.rating ?? 0,
        reviewCount: product.review_count ?? 0,
        image: product.image_url ?? '',
        inStock: product.in_stock ?? false,
        badge: product.badge ?? '',
        currency: product.currency ?? 'USD',
      }));

      const csvContent = Papa.unparse({ fields, data: rows });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `neon-products-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      return { success: true, message: `Exported ${products.length} Neon products`, count: products.length };
    } catch (error) {
      return {
        success: false,
        message: `Neon export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
      };
    }
  },
};

export function getDataSource(): 'neon' {
  return 'neon';
}
