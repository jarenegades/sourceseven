import { supabase } from './supabaseClient';
import { getAuthAccessToken } from './neonAuthClient';
import { canonicalCategoryRowId, supabaseCategoryRowId } from './categoryIds';

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: string | null;
  display_order: number;
  is_active: boolean;
}

const useNeonProductApi = import.meta.env.VITE_USE_NEON_PRODUCT_API === 'true';
const fallbackCategories: StoreCategory[] = [
  { id: 'rolling-bearings', name: 'Rolling Bearings', slug: 'rolling-bearings', display_order: 10, is_active: true },
  { id: 'mounted-linear-units', name: 'Mounted & Linear Units', slug: 'mounted-linear-units', display_order: 20, is_active: true },
];

async function neonRequest(path: string, method = 'GET', body?: unknown, admin = false) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (admin) {
    const accessToken = await getAuthAccessToken();
    if (!accessToken) throw new Error('Sign in with an administrator account to manage categories');
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const response = await fetch(path, { method, headers, cache: admin ? 'no-store' : 'default', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Category API request failed (${response.status})`);
  return result;
}

function canonicalRow(row: any): StoreCategory {
  return { ...row, id: canonicalCategoryRowId(row.id), parent_id: row.parent_id ? canonicalCategoryRowId(row.parent_id) : row.parent_id };
}

export const categoriesService = {
  async getAll(includeInactive = false): Promise<StoreCategory[]> {
    if (useNeonProductApi) {
      const result = await neonRequest(`/api/categories${includeInactive ? '?includeInactive=1' : ''}`, 'GET', undefined, includeInactive);
      return (result.categories || []).map(canonicalRow);
    }
    if (!supabase) return fallbackCategories;
    let query = supabase.from('categories').select('*').order('display_order').order('name');
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(canonicalRow);
  },

  async create(input: { name: string; parentId: string; description?: string; displayOrder?: number }) {
    if (useNeonProductApi) {
      const result = await neonRequest('/api/admin/categories', 'POST', input, true);
      return canonicalRow(result.category);
    }
    if (!supabase) throw new Error('Supabase is unavailable');
    const id = input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
    if (!id) throw new Error('Enter a valid category name');
    const { data, error } = await supabase.from('categories').insert({
      id, name: input.name.trim(), slug: id, parent_id: supabaseCategoryRowId(input.parentId),
      description: input.description?.trim() || null, display_order: input.displayOrder || 0, is_active: true,
    }).select().single();
    if (error) throw error;
    return canonicalRow(data);
  },

  async update(id: string, updates: Pick<StoreCategory, 'name' | 'description' | 'display_order' | 'is_active'>) {
    if (useNeonProductApi) {
      const { display_order, ...patch } = updates;
      const result = await neonRequest(`/api/admin/categories?id=${encodeURIComponent(id)}`, 'PATCH', { ...patch, display_order }, true);
      return canonicalRow(result.category);
    }
    if (!supabase) throw new Error('Supabase is unavailable');
    const { data, error } = await supabase.from('categories').update(updates).eq('id', supabaseCategoryRowId(id)).select().single();
    if (error) throw error;
    return canonicalRow(data);
  },
};
