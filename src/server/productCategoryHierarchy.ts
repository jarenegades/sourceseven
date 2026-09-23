export interface CategoryNode {
  id: string;
  parentId: string | null;
}

export interface ProductCategorySelection {
  category: string;
  categoryId: string | null;
  subcategoryId: string | null;
}

export function mergeProductCategorySelection(
  existing: ProductCategorySelection,
  updates: Partial<ProductCategorySelection>,
): ProductCategorySelection {
  return {
    category: updates.category ?? existing.category,
    categoryId: updates.categoryId === undefined ? existing.categoryId : updates.categoryId,
    subcategoryId: updates.subcategoryId === undefined ? existing.subcategoryId : updates.subcategoryId,
  };
}

/**
 * Products select a top-level family (`category`), optionally a child
 * (`categoryId`), and optionally a grandchild (`subcategoryId`). A root-only
 * product is valid, but a grandchild can never be selected without its child.
 */
export function validateProductCategoryHierarchy(
  product: ProductCategorySelection,
  nodes: ReadonlyMap<string, CategoryNode>,
): string | null {
  const root = nodes.get(product.category);
  if (!root) return `Top-level category "${product.category}" is not present in Neon yet.`;
  if (root.parentId !== null) {
    return `Top-level category "${product.category}" must not have a parent.`;
  }

  if (!product.categoryId) return product.subcategoryId
    ? 'A product subcategory requires a product category.'
    : null;

  const category = nodes.get(product.categoryId);
  if (!category) {
    return `Product category "${product.categoryId}" is not present in Neon yet. Provision or migrate categories before adding this product.`;
  }
  if (category.parentId !== root.id) {
    return `Product category "${category.id}" must be a child of "${root.id}".`;
  }

  if (product.subcategoryId) {
    const subcategory = nodes.get(product.subcategoryId);
    if (!subcategory) {
      return `Product subcategory "${product.subcategoryId}" is not present in Neon yet. Provision or migrate categories before adding this product.`;
    }
    if (subcategory.parentId !== category.id) {
      return `Product subcategory "${subcategory.id}" must be a child of "${category.id}".`;
    }
  }

  return null;
}
