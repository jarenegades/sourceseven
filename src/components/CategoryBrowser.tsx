import { ChevronRight, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { categoriesService } from '../utils/categoriesService';

export interface SubCategory {
  name: string;
  id: string;
}

export interface Category {
  name: string;
  id: string;
  subcategories?: SubCategory[];
}

export interface ProductCategory {
  name: string;
  id: string;
  categories: Category[];
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    name: 'Rolling Bearings',
    id: 'rolling-bearings',
    categories: [
      { name: 'Deep Groove Ball Bearings', id: 'deep-groove-ball-bearings' },
      { name: 'Angular Contact Ball Bearings', id: 'angular-contact-ball-bearings' },
      { name: 'Self-Aligning Ball Bearings', id: 'self-aligning-ball-bearings' },
      { name: 'Spherical Roller Bearings', id: 'spherical-roller-bearings' },
      { name: 'Cylindrical Roller Bearings', id: 'cylindrical-roller-bearings' },
      { name: 'Tapered Roller Bearings', id: 'tapered-roller-bearings' },
      { name: 'Needle Roller Bearings', id: 'needle-roller-bearings' },
      { name: 'Thrust Bearings', id: 'thrust-bearings' },
    ],
  },
  {
    name: 'Mounted & Linear Units',
    id: 'mounted-linear-units',
    categories: [
      { name: 'Mounted Bearing Units', id: 'mounted-bearing-units' },
      { name: 'Linear Motion', id: 'linear-motion' },
      { name: 'Bearing Housings & Seals', id: 'bearing-housings-seals' },
    ],
  },
];

interface CategoryBrowserProps {
  onCategorySelect: (departmentId: string, categoryId?: string, subcategoryId?: string) => void;
  onClose: () => void;
}

export function CategoryBrowser({ onCategorySelect, onClose }: CategoryBrowserProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedSubcategory, setExpandedSubcategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>(PRODUCT_CATEGORIES);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const records = await categoriesService.getAll();
        const groups = records
          .filter((record) => !record.parent_id)
          .map((record) => ({
            id: record.id,
            name: record.name,
            categories: records
              .filter((child) => child.parent_id === record.id)
              .map((child) => ({
                id: child.id,
                name: child.name,
                subcategories: records.filter((leaf) => leaf.parent_id === child.id).map((leaf) => ({ id: leaf.id, name: leaf.name })),
              })),
          }));

        if (groups.length > 0) setCategories(groups);
      } catch (error) {
        console.error('Could not load storefront categories:', error);
      }
    };

    loadCategories();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="bg-[#003366] text-white p-4 rounded-t-lg">
        <h2 className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Shop by Category
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6 p-6">
        {categories.map((productCategory) => (
          <div key={productCategory.id} className="space-y-3">
            <h3 className="text-[#003366] pb-2 border-b border-gray-200">
              {productCategory.name}
            </h3>
              <button onClick={() => { onCategorySelect(productCategory.id); onClose(); }} className="w-full rounded px-3 py-2 text-left text-sm font-medium text-[#0055AA] hover:bg-blue-50">
              All {productCategory.name}
            </button>
            <div className="space-y-2">
              {productCategory.categories.map((category) => (
                <div key={category.id}>
                  {category.subcategories?.length ? (
                    <>
                      <button
                        onClick={() => {
                          if (expandedCategory === category.id) {
                            setExpandedCategory(null);
                            setExpandedSubcategory(null);
                          } else {
                            setExpandedCategory(category.id);
                            setExpandedSubcategory(null);
                          }
                        }}
                        className="w-full flex items-center justify-between text-left px-3 py-2 rounded hover:bg-blue-50 transition-colors group"
                      >
                        <span className="text-sm text-gray-700 group-hover:text-[#0055AA]">
                          {category.name}
                        </span>
                        <ChevronRight
                          className={`h-4 w-4 text-gray-400 transition-transform ${expandedCategory === category.id ? 'rotate-90' : ''
                            }`}
                        />
                      </button>
                      {expandedCategory === category.id && (
                        <div className="ml-4 mt-1 space-y-1">
                          {category.subcategories.map((subcategory) => (
                            <button
                              key={subcategory.id}
                              onClick={() => {
                                onCategorySelect(productCategory.id, category.id, subcategory.id);
                                onClose();
                              }}
                              className="w-full text-left px-3 py-1.5 rounded hover:bg-blue-50 transition-colors text-sm text-gray-600 hover:text-[#0055AA]"
                            >
                              {subcategory.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        onCategorySelect(productCategory.id, category.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between text-left px-3 py-2 rounded hover:bg-blue-50 transition-colors group"
                    >
                      <span className="text-sm text-gray-700 group-hover:text-[#0055AA]">
                        {category.name}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
        <button
          onClick={onClose}
          className="w-full bg-[#003366] hover:bg-[#0055AA] text-white py-2 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
