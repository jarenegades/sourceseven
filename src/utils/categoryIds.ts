export const PRODUCT_CATEGORY_IDS = ['rolling-bearings', 'mounted-linear-units'] as const;
export type ProductCategoryId = typeof PRODUCT_CATEGORY_IDS[number];
export type ProductCategoryFilter = 'all' | ProductCategoryId;

const legacyProductCategory: Record<ProductCategoryId, 'pharmaceutical' | 'baby'> = {
  'rolling-bearings': 'pharmaceutical',
  'mounted-linear-units': 'baby',
};

export function canonicalProductCategory(value: string): ProductCategoryId {
  if (value === 'rolling-bearings' || value === 'pharmaceutical') return 'rolling-bearings';
  if (value === 'mounted-linear-units' || value === 'baby') return 'mounted-linear-units';
  throw new Error(`Unsupported product category: ${value}`);
}

export function supabaseProductCategory(value: ProductCategoryId): 'pharmaceutical' | 'baby' {
  return legacyProductCategory[value];
}

export function canonicalCategoryRowId(value: string): string {
  if (value === 'pharmaceutical') return 'rolling-bearings';
  if (value === 'baby') return 'mounted-linear-units';
  return value;
}

export function supabaseCategoryRowId(value: string): string {
  if (value === 'rolling-bearings') return 'pharmaceutical';
  if (value === 'mounted-linear-units') return 'baby';
  return value;
}
