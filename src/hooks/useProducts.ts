import { useState, useEffect } from 'react';
import { Product } from '../components/ProductCard';
import { productsApi } from '../utils/api';
import { productsService } from '../utils/productsService';

export function useProducts(initialProducts: Product[] = []) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load products from Supabase on mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productsApi.getAll();
      
      // If no products in database, initialize with the initial products
      if (data.length === 0 && initialProducts.length > 0) {
        console.log('No products in database, using initial products');
        setProducts(initialProducts);
      } else {
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to load products from Supabase:', err);
      setError('Failed to load products. Using local data.');
      // Fallback to initial products if API fails
      setProducts(initialProducts);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      const response = await productsApi.create(product);
      const newProduct = { ...product, id: response.id };
      setProducts(prev => [...prev, newProduct]);
      return newProduct;
    } catch (err) {
      console.error('Failed to add product:', err);
      // Fallback to local-only
      const localId = `local-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newProduct = { ...product, id: localId };
      setProducts(prev => [...prev, newProduct]);
      return newProduct;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      await productsApi.update(id, updates);
      setProducts(prev =>
        prev.map(p => (p.id === id ? { ...p, ...updates } : p))
      );
    } catch (err) {
      console.error('Failed to update product:', err);
      // Fallback to local-only update
      setProducts(prev =>
        prev.map(p => (p.id === id ? { ...p, ...updates } : p))
      );
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productsApi.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete product:', err);
      // Fallback to local-only delete
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const bulkImport = async (productsToImport: Omit<Product, 'id'>[]) => {
    try {
      const response = await productsApi.bulkImport(productsToImport);
      await loadProducts(); // Reload all products from server
      return response.count;
    } catch (err) {
      console.error('Failed to bulk import products:', err);
      // Fallback to local-only import
      const newProducts = productsToImport.map((p, index) => ({
        ...p,
        id: `local-${Date.now()}-${index}`,
      }));
      setProducts(prev => [...prev, ...newProducts]);
      return newProducts.length;
    }
  };

  const bulkDelete = async (action: 'mounted-linear-units' | 'rolling-bearings' | 'purge') => {
    try {
      const response = { deletedCount: await productsService.bulkDelete(action) };
      await loadProducts(); // Reload all products from server
      return response.deletedCount;
    } catch (err) {
      console.error('Failed to bulk delete products:', err);
      // Fallback to local-only delete
      if (action === 'purge') {
        const count = products.length;
        setProducts([]);
        return count;
      } else {
        const toDelete = products.filter(p => p.category === action);
        setProducts(prev => prev.filter(p => p.category !== action));
        return toDelete.length;
      }
    }
  };

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    bulkImport,
    bulkDelete,
    refresh: loadProducts,
  };
}
