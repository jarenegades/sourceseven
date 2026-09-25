export const PRODUCT_CATEGORY_IDS = ['rolling-bearings', 'mounted-linear-units'] as const;
export type ProductCategoryId = typeof PRODUCT_CATEGORY_IDS[number];
export type ProductCategoryFilter = 'all' | ProductCategoryId;

export function canonicalProductCategory(value: string): ProductCategoryId {
  if (value === 'rolling-bearings' || value === 'pharmaceutical') return 'rolling-bearings';
  if (value === 'mounted-linear-units' || value === 'baby') return 'mounted-linear-units';
  throw new Error(`Unsupported product category: ${value}`);
}

export function canonicalCategoryRowId(value: string): string {
  if (value === 'pharmaceutical') return 'rolling-bearings';
  if (value === 'baby') return 'mounted-linear-units';
  return value;
}
