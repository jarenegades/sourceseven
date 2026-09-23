import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeProductCategorySelection,
  validateProductCategoryHierarchy,
  type CategoryNode,
  type ProductCategorySelection,
} from '../src/server/productCategoryHierarchy.ts';

const categories: CategoryNode[] = [
  { id: 'rolling-bearings', parentId: null },
  { id: 'mounted-linear-units', parentId: null },
  { id: 'deep-groove', parentId: 'rolling-bearings' },
  { id: 'mounted-units', parentId: 'mounted-linear-units' },
  { id: 'deep-groove-raceway', parentId: 'deep-groove' },
  { id: 'seals', parentId: 'mounted-units' },
];
const categoryMap = new Map(categories.map((category) => [category.id, category]));

function validate(selection: ProductCategorySelection) {
  return validateProductCategoryHierarchy(selection, categoryMap);
}

test('accepts a product category whose parent is its selected root', () => {
  assert.equal(validate({ category: 'rolling-bearings', categoryId: 'deep-groove', subcategoryId: null }), null);
});

test('accepts a product assigned directly to a canonical department root', () => {
  assert.equal(validate({ category: 'rolling-bearings', categoryId: null, subcategoryId: null }), null);
  assert.equal(validate({ category: 'mounted-linear-units', categoryId: null, subcategoryId: null }), null);
});

test('rejects a grandchild when the product category is missing', () => {
  assert.match(
    validate({ category: 'rolling-bearings', categoryId: null, subcategoryId: 'deep-groove-raceway' }) || '',
    /requires a product category/,
  );
});

test('accepts a subcategory whose parent is the selected product category', () => {
  assert.equal(validate({ category: 'rolling-bearings', categoryId: 'deep-groove', subcategoryId: 'deep-groove-raceway' }), null);
});

test('rejects a category that belongs to a different root', () => {
  assert.match(
    validate({ category: 'mounted-linear-units', categoryId: 'deep-groove', subcategoryId: null }) || '',
    /must be a child of "mounted-linear-units"/,
  );
});

test('rejects a subcategory that belongs to a different selected category', () => {
  assert.match(
    validate({ category: 'rolling-bearings', categoryId: 'deep-groove', subcategoryId: 'seals' }) || '',
    /must be a child of "deep-groove"/,
  );
});

test('allows root-only products but requires any selected child category to exist', () => {
  assert.equal(validate({ category: 'rolling-bearings', categoryId: null, subcategoryId: null }), null);
  assert.match(
    validate({ category: 'rolling-bearings', categoryId: 'missing', subcategoryId: null }) || '',
    /not present in Neon/,
  );
});

test('validates PATCH against merged existing and updated category values', () => {
  const existing: ProductCategorySelection = {
    category: 'rolling-bearings',
    categoryId: 'deep-groove',
    subcategoryId: 'deep-groove-raceway',
  };

  const rootOnlyChange = mergeProductCategorySelection(existing, { category: 'mounted-linear-units' });
  assert.match(validate(rootOnlyChange) || '', /must be a child of "mounted-linear-units"/);

  const consistentChange = mergeProductCategorySelection(existing, {
    category: 'mounted-linear-units',
    categoryId: 'mounted-units',
    subcategoryId: null,
  });
  assert.equal(validate(consistentChange), null);
});
