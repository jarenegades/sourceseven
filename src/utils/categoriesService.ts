import { getAuthAccessToken, getNeonAuthSessionId } from './neonAuthClient';
import { canonicalCategoryRowId } from './categoryIds';

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: string | null;
  display_order: number;
  is_active: boolean;
}


async function neonRequest(path: string, method = 'GET', body?: unknown, admin = false) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (admin) {
    const accessToken = await getAuthAccessToken();
    if (!accessToken) throw new Error('Sign in with an administrator account to manage categories');
    headers.Authorization = `Bearer ${accessToken}`;
    const sessionId = await getNeonAuthSessionId();
    if (sessionId) headers['X-Neon-Session-Id'] = sessionId;
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
    const result = await neonRequest(`/api/categories${includeInactive ? '?includeInactive=1' : ''}`, 'GET', undefined, includeInactive);
    return (result.categories || []).map(canonicalRow);
  },

  async create(input: { name: string; parentId: string; description?: string; displayOrder?: number }) {
    const result = await neonRequest('/api/admin/categories', 'POST', input, true);
    return canonicalRow(result.category);
  },

  async update(id: string, updates: Pick<StoreCategory, 'name' | 'description' | 'display_order' | 'is_active'>) {
    const { display_order, ...patch } = updates;
    const result = await neonRequest(`/api/admin/categories?id=${encodeURIComponent(id)}`, 'PATCH', { ...patch, display_order }, true);
    return canonicalRow(result.category);
  },
};
