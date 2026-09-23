import { ChevronRight, Home } from 'lucide-react';
import { PRODUCT_CATEGORIES } from './CategoryBrowser';
import type { ProductCategoryFilter } from '../utils/categoryIds';

interface CategoryBreadcrumbProps {
  selectedCategory: ProductCategoryFilter;
  selectedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  onNavigate: (category: ProductCategoryFilter, categoryId?: string | null, subcategoryId?: string | null) => void;
}

export function CategoryBreadcrumb({
  selectedCategory,
  selectedCategoryId,
  selectedSubcategoryId,
  onNavigate,
}: CategoryBreadcrumbProps) {
  if (selectedCategory === 'all' && !selectedCategoryId && !selectedSubcategoryId) {
    return null;
  }

  const productCategory = PRODUCT_CATEGORIES.find(pc => pc.id === selectedCategory);
  const category = PRODUCT_CATEGORIES.flatMap(pc => pc.categories).find(c => c.id === selectedCategoryId);
  const subcategory = category?.subcategories?.find(sc => sc.id === selectedSubcategoryId);

  return (
    <div className="bg-white rounded-lg shadow-sm px-4 py-3 mb-4">
      <nav className="flex items-center gap-2 text-sm flex-wrap">
        <button
          onClick={() => onNavigate('all', null, null)}
          className="flex items-center gap-1 text-gray-600 hover:text-[#0055AA] transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>All Products</span>
        </button>

        {productCategory && (
          <>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <button
              onClick={() => onNavigate(selectedCategory, null, null)}
              className="text-gray-600 hover:text-[#0055AA] transition-colors"
            >
              {productCategory.name}
            </button>
          </>
        )}

        {category && (
          <>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <button
              onClick={() => onNavigate(selectedCategory, selectedCategoryId, null)}
              className={`transition-colors ${
                !subcategory ? 'text-[#003366]' : 'text-gray-600 hover:text-[#0055AA]'
              }`}
            >
              {category.name}
            </button>
          </>
        )}

        {subcategory && (
          <>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-[#003366]">
              {subcategory.name}
            </span>
          </>
        )}
      </nav>
    </div>
  );
}
