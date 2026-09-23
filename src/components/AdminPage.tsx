import { useState, useEffect } from 'react';
import { Product } from './ProductCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { Plus, Edit, Trash2, Package, Tag, TrendingUp, Percent, Search, Filter, Upload, Download, FileUp, CheckCircle2, AlertCircle, XCircle, Link2, Image, Users, CreditCard, Settings, RefreshCw, ChevronLeft, ChevronRight, DollarSign, Bell, Layers3, Truck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { SupabaseStatus } from './SupabaseStatus';
import { DataManagementPanel } from './DataManagementPanel';
import { UserManagementPanel } from './UserManagementPanel';
import { AdminOrdersPanel } from './AdminOrdersPanel';
import { supabase } from '../utils/supabaseClient';
import { supabaseAdmin } from '../utils/supabaseAdminClient';
import { productsService } from '../utils/productsService';
import { paymentGatewayService, PaymentGatewaySettings } from '../utils/paymentGatewayService';
import { currencyRatesService, CurrencyRate } from '../utils/currencyRatesService';
import { Switch } from './ui/switch';
import { publicAnonKey, supabaseUrl } from '../utils/supabase/info';
import { categoriesService, StoreCategory } from '../utils/categoriesService';
import { canonicalProductCategory } from '../utils/categoryIds';
import { CategoryManagementPanel } from './CategoryManagementPanel';
import { ShippingSettingsPanel } from './ShippingSettingsPanel';
import { CommerceSettingsPanel } from './CommerceSettingsPanel';
import {
  orderNotificationSettingsService,
  OrderNotificationSettings,
} from '../utils/orderNotificationSettingsService';

interface AdminPageProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => void | Promise<void>;
  onBulkImport?: (products: Omit<Product, 'id'>[]) => Promise<number>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void | Promise<void>;
  onDeleteProduct: (id: string) => void | Promise<void>;
  onCreateSale: (productId: string, discountPercent: number) => void | Promise<void>;
}

export function AdminPage({
  products,
  onAddProduct,
  onBulkImport,
  onUpdateProduct,
  onDeleteProduct,
  onCreateSale,
}: AdminPageProps) {
  // Component state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);
  const [discountPercent, setDiscountPercent] = useState('10');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'mounted-linear-units' | 'rolling-bearings'>('all');

  // Sales tab pagination state
  const [salesCurrentPage, setSalesCurrentPage] = useState(1);
  const SALES_ITEMS_PER_PAGE = 10;
  const [badgesCurrentPage, setBadgesCurrentPage] = useState(1);
  const BADGES_ITEMS_PER_PAGE = 12;

  // Admin products state - fetch all products for admin management
  const [adminAllProducts, setAdminAllProducts] = useState<Product[]>([]);
  const [adminIsLoadingProducts, setAdminIsLoadingProducts] = useState(false);
  const [adminCurrentPage, setAdminCurrentPage] = useState(1);
  const ADMIN_ITEMS_PER_PAGE = 20;
  const [catalogCategories, setCatalogCategories] = useState<StoreCategory[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState('products');

  // CSV Upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [showCsvPreview, setShowCsvPreview] = useState(false);

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState<PaymentGatewaySettings | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    merchant_id: '',
    secret_key: '',
    client_key: '',
    environment: 'sandbox' as 'sandbox' | 'production',
    fee_handling: 'merchant' as 'merchant' | 'customer',
    platform_fee_percentage: '2.90',
    is_enabled: false,
  });
  const [isLoadingPaymentSettings, setIsLoadingPaymentSettings] = useState(false);
  const [isSavingPaymentSettings, setIsSavingPaymentSettings] = useState(false);

  // Order Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState<OrderNotificationSettings | null>(null);
  const [notificationFormData, setNotificationFormData] = useState({
    notifications_enabled: false,
    admin_emails: '',
  });
  const [supplierRoutes, setSupplierRoutes] = useState<
    Array<{
      id: string;
      email: string;
      category_id: string;
      subcategory_id: string;
      is_enabled: boolean;
    }>
  >([]);
  const [isLoadingNotificationSettings, setIsLoadingNotificationSettings] = useState(false);
  const [isSavingNotificationSettings, setIsSavingNotificationSettings] = useState(false);

  // Currency Rates State
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);
  const [isLoadingCurrencyRates, setIsLoadingCurrencyRates] = useState(false);
  const [isSavingCurrencyRates, setIsSavingCurrencyRates] = useState(false);
  const [currencyFormData, setCurrencyFormData] = useState({
    JMD: '',
    CAD: '',
  });

  // Bulk Delete state
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteAction, setBulkDeleteAction] = useState<'mounted-linear-units' | 'rolling-bearings' | 'purge' | null>(null);

  // Image migration state
  const [isMigratingImages, setIsMigratingImages] = useState(false);

  // Image upload state
  const [imageInputType, setImageInputType] = useState<'url' | 'file'>('url');
  const [editImageInputType, setEditImageInputType] = useState<'url' | 'file'>('url');

  // New product state
  const [newProduct, setNewProduct] = useState<any>({
    name: '',
    description: '',
    category: 'rolling-bearings',
    categoryId: '',
    subcategoryId: '',
    price: '',
    currency: 'USD',
    costPrice: '',
    stockCount: '',
    soldCount: '0',
    rating: '4.5',
    reviewCount: '100',
    image: '',
    inStock: true,
    badge: 'none',
  });

  // Helper function to reload admin products
  const reloadAdminProducts = async () => {
    try {
      const allProducts = await productsService.getAll();
      setAdminAllProducts(allProducts);
    } catch (error) {
      console.error('Failed to reload admin products:', error);
    }
  };

  // Load all products for admin on component mount
  useEffect(() => {
    const loadAdminProducts = async () => {
      try {
        setAdminIsLoadingProducts(true);
        const allProducts = await productsService.getAll();
        setAdminAllProducts(allProducts);
        setAdminCurrentPage(1); // Reset to first page
      } catch (error) {
        console.error('Failed to load products for admin:', error);
        toast.error('Failed to load products');
      } finally {
        setAdminIsLoadingProducts(false);
      }
    };

    loadAdminProducts();
  }, []);

  useEffect(() => {
    categoriesService.getAll()
      .then(setCatalogCategories)
      .catch((error) => console.error('Failed to load storefront categories:', error));
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setAdminCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  // Reset sales page when filters change
  useEffect(() => {
    setSalesCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  // Reset badges page when filters change
  useEffect(() => {
    setBadgesCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  // Load currency rates
  useEffect(() => {
    const loadCurrencyRates = async () => {
      try {
        setIsLoadingCurrencyRates(true);
        const rates = await currencyRatesService.getAllRatesWithMetadata();
        setCurrencyRates(rates);
        // Pre-populate form with current rates
        const formData: any = { JMD: '', CAD: '' };
        rates.forEach(rate => {
          formData[rate.currency] = rate.rate.toString();
        });
        setCurrencyFormData(formData);
      } catch (error) {
        console.error('Failed to load currency rates:', error);
        toast.error('Failed to load currency rates');
      } finally {
        setIsLoadingCurrencyRates(false);
      }
    };

    loadCurrencyRates();
  }, []);

  useEffect(() => {
    const loadPaymentSettings = async () => {
      try {
        setIsLoadingPaymentSettings(true);
        const settings = await paymentGatewayService.getSettings();
        if (settings) {
          setPaymentSettings(settings);
          setPaymentFormData({
            merchant_id: settings.merchant_id || '',
            secret_key: settings.secret_key || '',
            client_key: settings.client_key || '',
            environment: settings.environment,
            fee_handling: settings.fee_handling,
            platform_fee_percentage: settings.platform_fee_percentage.toString(),
            is_enabled: settings.is_enabled,
          });
        }
      } catch (error) {
        console.error('Failed to load payment settings:', error);
      } finally {
        setIsLoadingPaymentSettings(false);
      }
    };

    loadPaymentSettings();
  }, []);

  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        setIsLoadingNotificationSettings(true);
        const [settings, routes] = await Promise.all([
          orderNotificationSettingsService.getSettings(),
          orderNotificationSettingsService.getSupplierRoutes(),
        ]);

        setNotificationSettings(settings);
        setNotificationFormData({
          notifications_enabled: settings?.notifications_enabled || false,
          admin_emails: (settings?.admin_emails || []).join('\n'),
        });
        setSupplierRoutes(
          routes.map((route) => ({
            id: route.id,
            email: route.email,
            category_id: route.category_id,
            subcategory_id: route.subcategory_id || '',
            is_enabled: route.is_enabled,
          }))
        );
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      } finally {
        setIsLoadingNotificationSettings(false);
      }
    };

    loadNotificationSettings();
  }, []);

  const parentCategories = catalogCategories.filter((category) => !category.parent_id);
  const getChildrenForParent = (parentId: string) => catalogCategories.filter((category) => category.parent_id === parentId);
  const categoryOptions = catalogCategories
    .filter((category) => category.parent_id)
    .map((category) => ({
      id: category.id,
      label: `${catalogCategories.find((parent) => parent.id === category.parent_id)?.name || 'Category'} / ${category.name}`,
    }));

  const subcategoryOptionsByCategory = products.reduce<Record<string, string[]>>((acc, product) => {
    if (!product.categoryId || !product.subcategoryId) {
      return acc;
    }

    const existing = acc[product.categoryId] || [];
    if (!existing.includes(product.subcategoryId)) {
      acc[product.categoryId] = [...existing, product.subcategoryId];
    }

    return acc;
  }, {});

  // Helper: upload image to Supabase storage with unique filename
  const uploadImageToStorage = async (imageUrl: string, productName: string, index?: number): Promise<string> => {
    try {
      if (!imageUrl) return imageUrl;
      if (imageUrl.includes('supabase.co')) return imageUrl;

      // Generate unique filename with timestamp and index if provided
      const timestamp = Date.now();
      const indexSuffix = index !== undefined ? `-${index}` : '';
      const sanitizedName = productName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);

      // Determine file extension from URL or default to png
      let extension = 'png';
      if (imageUrl.includes('.')) {
        const urlExtension = imageUrl.split('.').pop()?.split('?')[0]?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(urlExtension || '')) {
          extension = urlExtension || 'png';
        }
      }

      const fileName = `${sanitizedName}-${timestamp}${indexSuffix}.${extension}`;

      // Data URL
      if (imageUrl.startsWith('data:image/')) {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        // Use admin client to bypass RLS policies
        const storageClient = supabaseAdmin || supabase;
        const { error } = await storageClient.storage.from('product-images').upload(fileName, blob, { upsert: true });
        if (error) throw error;
        const { data } = storageClient.storage.from('product-images').getPublicUrl(fileName);
        return data.publicUrl || imageUrl;
      }

      // HTTP URL - Use Edge Function to bypass CORS (especially for Dropbox)
      if (imageUrl.startsWith('http')) {
        // Special handling for Dropbox Preview links - warn user they typically don't work directly
        if (imageUrl.includes('dropbox.com/preview')) {
          console.warn(`⚠️ Detected Dropbox Preview link: ${imageUrl}. This may fail if valid authentication is not present. Trying anyway...`);
          // Attempt to treat it as a potential direct link if format allows, but usually this fails.
          // Ideally, we should prompt the user, but for bulk import we have to try our best.
        }

        const isDropboxUrl = imageUrl.includes('dropbox.com');

        try {
          // Try using Edge Function first to bypass CORS
          const edgeFunctionUrl = `${supabaseUrl}/functions/v1/download-image`;

          try {
            console.log(`📥 Attempting to download image via Edge Function for ${productName}: ${imageUrl.substring(0, 80)}...`);

            // Check for common error patterns before sending
            if (imageUrl.includes('dropbox.com/preview')) {
              console.warn(`Warning: ${productName} uses a Dropbox Preview link which usually requires login. Image upload may fail.`);
            }

            const edgeResponse = await fetch(edgeFunctionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': publicAnonKey,
                'Authorization': `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify({ imageUrl }),
            });

            if (edgeResponse.ok) {
              const edgeResult = await edgeResponse.json();
              if (edgeResult.success && edgeResult.data) {
                try {
                  // Validate base64 string
                  const base64Data = edgeResult.data.trim();
                  if (!base64Data || typeof base64Data !== 'string') {
                    throw new Error('Invalid base64 data received from Edge Function');
                  }

                  // Validate base64 format (basic check)
                  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
                    throw new Error('Invalid base64 format received from Edge Function');
                  }

                  // Convert base64 to blob
                  const binaryString = atob(base64Data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  const blob = new Blob([bytes], { type: edgeResult.contentType || 'image/jpeg' });

                  console.log(`📤 Uploading blob to storage for ${productName} (size: ${blob.size} bytes, type: ${blob.type})`);

                  // Upload to Supabase Storage using admin client to bypass RLS
                  const storageClient = supabaseAdmin || supabase;
                  const { error, data: uploadData } = await storageClient.storage.from('product-images').upload(fileName, blob, { upsert: true });
                  if (error) {
                    console.error(`❌ Storage upload error for ${productName}:`, error);
                    throw error;
                  }

                  const { data: urlData } = storageClient.storage.from('product-images').getPublicUrl(fileName);
                  const publicUrl = urlData.publicUrl || imageUrl;
                  console.log(`✅ Successfully uploaded image via Edge Function for ${productName}: ${publicUrl}`);
                  return publicUrl;
                } catch (decodeError: any) {
                  console.error(`❌ Failed to process image for ${productName}:`, decodeError.message || decodeError);
                  throw decodeError; // Re-throw to be caught by outer catch
                }
              } else {
                const errorMsg = edgeResult.error || 'Unknown error';
                console.error(`❌ Edge Function returned success=false for ${productName}:`, errorMsg);
                throw new Error(`Edge Function error: ${errorMsg}`);
              }
            } else {
              // Log the actual error response
              const errorText = await edgeResponse.text();
              console.error(`❌ Edge Function failed with status ${edgeResponse.status} for ${productName}:`, errorText);
              throw new Error(`Edge Function HTTP ${edgeResponse.status}: ${errorText.substring(0, 200)}`);
            }
          } catch (edgeError: any) {
            console.error(`❌ Edge Function exception for ${productName}:`, edgeError.message || edgeError);
            // For Dropbox URLs, don't try direct fetch (will always fail with CORS)
            if (isDropboxUrl) {
              console.warn(`⚠️ Edge Function failed for Dropbox URL, cannot use direct fetch (CORS). Returning original URL for ${productName}`);
              throw new Error(`Failed to upload Dropbox image: ${edgeError.message || 'Edge Function failed'}`);
            }
            // Re-throw for non-Dropbox URLs so fallback can be attempted
            throw edgeError;
          }

          // Fallback to direct fetch for non-Dropbox URLs only
          try {
            console.log(`🔄 Attempting direct fetch fallback for ${productName}...`);
            const res = await fetch(imageUrl);
            if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
            const blob = await res.blob();
            // Use admin client to bypass RLS policies
            const storageClient = supabaseAdmin || supabase;
            const { error } = await storageClient.storage.from('product-images').upload(fileName, blob, { upsert: true });
            if (error) throw error;
            const { data } = storageClient.storage.from('product-images').getPublicUrl(fileName);
            console.log(`✅ Successfully uploaded image via direct fetch for ${productName}`);
            return data.publicUrl || imageUrl;
          } catch (directFetchError: any) {
            console.warn(`⚠️ Direct fetch also failed for ${productName}:`, directFetchError.message || directFetchError);
            return imageUrl; // Return original URL if both methods fail
          }
        } catch (err: any) {
          console.error(`❌ Failed to upload image for ${productName}:`, err.message || err);
          return imageUrl;
        }
      }
      return imageUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      return imageUrl;
    }
  };

  const handleOpenEditDialog = (product: Product) => {
    try {
      setEditingProduct({ ...product });
      setEditImageInputType('url');
      setIsEditDialogOpen(true);
    } catch (error) {
      console.error('Error opening edit dialog:', error);
      toast.error('Failed to open edit dialog');
    }
  };

  // Handle editing product (save changes)
  const handleEditProduct = async () => {
    if (!editingProduct) return;

    if (!editingProduct.name || !editingProduct.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      let imageUrl = convertDropboxUrl(editingProduct.image || '');
      if (imageUrl && imageUrl.trim()) {
        imageUrl = await uploadImageToStorage(imageUrl, editingProduct.name);
      }

      await onUpdateProduct(editingProduct.id, {
        name: editingProduct.name,
        category: editingProduct.category,
        categoryId: editingProduct.categoryId,
        subcategoryId: editingProduct.subcategoryId,
        price: editingProduct.price,
        rating: editingProduct.rating,
        reviewCount: editingProduct.reviewCount,
        image: imageUrl,
        inStock: editingProduct.inStock,
        // Use null to clear badge in DB when user selects "No Badge"
        badge: (editingProduct.badge ?? null) as any,
      });

      toast.success('Product updated successfully!');
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      // Reload admin products
      setTimeout(async () => {
        const allProducts = await productsService.getAll();
        setAdminAllProducts(allProducts);
      }, 500);
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
  };

  const handleBadgeUpdate = async (product: Product, value: string) => {
    const nextBadge = value === 'none' ? null : value;

    try {
      await onUpdateProduct(product.id, { badge: nextBadge as any });
      setAdminAllProducts((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? { ...item, badge: (nextBadge ?? undefined) as any }
            : item
        )
      );
      toast.success(nextBadge ? `Badge set to ${nextBadge}` : 'Badge removed');
    } catch (error) {
      console.error('Failed to update badge:', error);
      toast.error('Failed to update badge');
    }
  };


  const handleDeleteProduct = async (product: Product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        await onDeleteProduct(product.id);
        toast.success('Product deleted successfully');
        try {
          const allProducts = await productsService.getAll();
          setAdminAllProducts(allProducts);
        } catch (refreshError) {
          console.error('Product was deleted, but the admin list could not refresh:', refreshError);
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  // Handle adding a new product
  const handleAddProduct = async () => {
    if (!newProduct.name || newProduct.name.trim() === '') {
      toast.error('Product name is required');
      return;
    }

    try {
      let imageUrl = convertDropboxUrl(newProduct.image || '');
      if (imageUrl && imageUrl.trim()) {
        imageUrl = await uploadImageToStorage(imageUrl, newProduct.name);
      }

      // Build sanitized product object
      const productToAdd: Omit<Product, 'id'> = {
        name: newProduct.name,
        description: newProduct.description || '',
        category: newProduct.category || 'rolling-bearings',
        categoryId: newProduct.categoryId || undefined,
        subcategoryId: newProduct.subcategoryId || undefined,
        price: parseFloat(newProduct.price) || 9.99,
        currency: newProduct.currency || 'USD',
        rating: parseFloat(newProduct.rating) || 4.5,
        reviewCount: parseInt(newProduct.reviewCount) || 100,
        image: imageUrl || '',
        inStock: !!newProduct.inStock,
        badge: newProduct.badge && newProduct.badge !== 'none' ? newProduct.badge : undefined,
        soldCount: parseInt(newProduct.soldCount) || 0,
        costPrice: newProduct.costPrice ? parseFloat(newProduct.costPrice) : undefined,
        stockCount: newProduct.stockCount ? parseInt(newProduct.stockCount) : undefined,
      } as Omit<Product, 'id'>;

      await onAddProduct(productToAdd);
      toast.success('Product added');
      setIsAddDialogOpen(false);
      setNewProduct({
        name: '',
        description: '',
        category: 'rolling-bearings',
        categoryId: '',
        subcategoryId: '',
        price: '',
        currency: 'USD',
        costPrice: '',
        stockCount: '',
        soldCount: '0',
        rating: '4.5',
        reviewCount: '100',
        image: '',
        inStock: true,
        badge: 'none',
      });
      try {
        const allProducts = await productsService.getAll();
        setAdminAllProducts(allProducts);
      } catch (refreshError) {
        console.error('Product was added, but the admin list could not refresh:', refreshError);
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

  const getCategoryName = (categoryId: string) => catalogCategories.find((category) => category.id === categoryId)?.name || categoryId;

  // Convert Dropbox URLs to direct download format
  const convertDropboxUrl = (url: string): string => {
    if (!url || !url.includes('dropbox.com')) {
      return url;
    }

    // Convert preview links to direct download links
    // From: https://www.dropbox.com/scl/fi/xxx?rlkey=xxx&st=xxx&dl=0
    // To:   https://www.dropbox.com/scl/fi/xxx?rlkey=xxx&st=xxx&dl=1&raw=1
    let convertedUrl = url;

    // Replace any dl= value (dl=0, dl=1, dl=2, etc.) with dl=1
    if (convertedUrl.includes('dl=')) {
      convertedUrl = convertedUrl.replace(/dl=\d+/g, 'dl=1');
    } else {
      // Add dl=1 if not present
      convertedUrl += (convertedUrl.includes('?') ? '&' : '?') + 'dl=1';
    }

    // Add raw=1 for direct image serving
    if (!convertedUrl.includes('raw=1')) {
      convertedUrl += '&raw=1';
    }

    return convertedUrl;
  };

  // CSV Upload Functions
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setCsvFile(file);
    setShowCsvPreview(false);
    setCsvData([]);
    setCsvErrors([]);
    setCsvWarnings([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCsvData(text);
    };
    reader.readAsText(file);
  };

  // Image upload for Add or Edit dialog (reads file and sets data URL locally)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (isEdit) {
        if (!editingProduct) return;
        setEditingProduct({ ...editingProduct, image: dataUrl });
      } else {
        setNewProduct({ ...newProduct, image: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  // Duplicate detection function
  const detectDuplicates = (csvProducts: any[], existingProducts: Product[]) => {
    const existing = existingProducts.map(p => p.name.toLowerCase().trim());
    const duplicates: string[] = [];
    const unique: any[] = [];
    const seenInCsv = new Set<string>();

    csvProducts.forEach((product, index) => {
      const name = product.name.toLowerCase().trim();
      const rowNum = index + 2; // Account for header row

      if (existing.includes(name)) {
        duplicates.push(`   Row ${rowNum}: "${product.name}" - already exists in catalog`);
      } else if (seenInCsv.has(name)) {
        duplicates.push(`   Row ${rowNum}: "${product.name}" - duplicated within this CSV`);
      } else {
        unique.push(product);
        seenInCsv.add(name);
      }
    });

    return { unique, duplicates };
  };

  const parseCsvData = (csvText: string) => {
    setIsProcessingCsv(true);
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];
    const parsedData: any[] = [];

    try {
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
      });

      if (result.errors.length > 0) {
        errors.push(...result.errors.map(e => `CSV parsing error: ${e.message}`));
        setCsvErrors(errors);
        setCsvWarnings([]);
        setIsProcessingCsv(false);
        return;
      }

      const data = result.data as any[];

      // Validate ONLY the absolute minimum required header (name)
      const headers = result.meta.fields || [];
      const requiredHeaders = ['name'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        errors.push(`Missing required column: "name"`);
        errors.push('Note: Only "name" is required. All other fields (including price) will use smart defaults.');
        setCsvErrors(errors);
        setCsvWarnings([]);
        setIsProcessingCsv(false);
        return;
      }

      // Warn if price column is missing
      if (!headers.includes('price')) {
        warnings.push('⚠️ Price column not found - all products will use default price ($9.99)');
      }

      // Process each data row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // Account for header row

        const rowErrors: string[] = [];

        // Validate name (ONLY REQUIRED FIELD)
        if (!row.name || row.name.trim() === '') {
          rowErrors.push(`Row ${rowNum}: Missing product name (required)`);
        }

        // Price with smart default
        let price = 9.99; // Default price
        if (row.price) {
          const parsedPrice = parseFloat(row.price);
          if (!isNaN(parsedPrice) && parsedPrice > 0) {
            price = parsedPrice;
          } else {
            warnings.push(`Row ${rowNum}: Invalid price '${row.price}', using default ($9.99)`);
          }
        }

        // Use the same live category catalogue as the storefront navigation.
        const parentIds = new Set(parentCategories.map((category) => category.id));
        const childCategories = catalogCategories.filter((category) => category.parent_id && parentIds.has(category.parent_id));
        const validCategoryIds = childCategories.map((category) => category.id);
        const defaultCategory = parentCategories.find((category) => category.id === 'rolling-bearings') || parentCategories[0];
        const defaultCategoryId = '';

        let category = defaultCategory?.id || 'rolling-bearings';
        let categoryId = defaultCategoryId;
        let subcategoryId = '';
        const rawCategory = row.category?.trim().toLowerCase();
        const wasLegacyCategory = rawCategory === 'baby' || rawCategory === 'pharmaceutical';
        const normalizedCategory = rawCategory && (wasLegacyCategory || rawCategory === 'rolling-bearings' || rawCategory === 'mounted-linear-units')
          ? canonicalProductCategory(rawCategory)
          : rawCategory;
        if (wasLegacyCategory) {
          warnings.push(`Row ${rowNum}: Legacy category '${rawCategory}' was mapped to '${normalizedCategory}'; legacy child IDs were not carried forward.`);
        }

        // Try to use provided categoryId first
        if (!wasLegacyCategory && row.categoryid && validCategoryIds.includes(row.categoryid.toLowerCase())) {
          categoryId = row.categoryid.toLowerCase();
          category = childCategories.find((item) => item.id === categoryId)?.parent_id || category;
        }
        // Otherwise try to use provided category
        else if (normalizedCategory && parentCategories.some((item) => item.id === normalizedCategory)) {
          category = normalizedCategory;
          categoryId = '';
          if (row.categoryid && !wasLegacyCategory) {
            warnings.push(`Row ${rowNum}: Invalid categoryId '${row.categoryid}', using default '${categoryId}' for ${category} category`);
          }
        }

        const grandchildCategories = catalogCategories.filter((item) => item.parent_id && childCategories.some((parent) => parent.id === item.parent_id));
        const requestedSubcategoryId = row.subcategoryid?.trim().toLowerCase();
        if (!wasLegacyCategory && requestedSubcategoryId) {
          const grandchild = grandchildCategories.find((item) => item.id === requestedSubcategoryId && item.parent_id === categoryId);
          if (grandchild) subcategoryId = grandchild.id;
          else warnings.push(`Row ${rowNum}: Invalid subcategoryId '${row.subcategoryid}', leaving it unset.`);
        }
        // Use defaults and warn
        else {
          if (row.category || row.categoryid) {
            warnings.push(`Row ${rowNum}: Invalid category/categoryId values, using the default bearing category`);
          }
        }

        row.category = category;
        row.categoryid = categoryId;
        row.subcategoryid = subcategoryId;

        // Transform optional fields with smart defaults
        const description = row.description || '';

        // Rating with default
        let rating = 4.5;
        if (row.rating) {
          rating = parseFloat(row.rating);
          if (isNaN(rating) || rating < 0 || rating > 5) {
            warnings.push(`Row ${rowNum}: Invalid rating, using default (4.5)`);
            rating = 4.5;
          }
        }

        // Review count with default
        let reviewCount = 100;
        if (row.reviewcount) {
          reviewCount = parseInt(row.reviewcount);
          if (isNaN(reviewCount) || reviewCount < 0) {
            warnings.push(`Row ${rowNum}: Invalid review count, using default (100)`);
            reviewCount = 100;
          }
        }

        // InStock with default
        const inStock = row.instock?.toLowerCase() === 'true' || row.instock === '1' || !row.instock;

        // Badge - no default, only set if explicitly provided
        const validBadges = ['Best Seller', 'Top Rated', 'New', 'Standard'];
        let badge: string | undefined = undefined;

        if (row.badge) {
          if (row.badge.toLowerCase() === 'default') {
            badge = 'Standard';
          } else if (validBadges.includes(row.badge)) {
            badge = row.badge;
          } else {
            badge = 'Standard';
            warnings.push(`Row ${rowNum}: Invalid badge '${row.badge}', using 'Standard'`);
          }
        }

        // Currency with default
        let currency: 'USD' | 'JMD' | 'CAD' = 'USD';
        if (row.currency) {
          const currencyUpper = row.currency.toUpperCase();
          if (['USD', 'JMD', 'CAD'].includes(currencyUpper)) {
            currency = currencyUpper as 'USD' | 'JMD' | 'CAD';
          } else {
            warnings.push(`Row ${rowNum}: Invalid currency '${row.currency}', using default (USD)`);
          }
        }

        // Transform analytics fields with validation
        let costPrice: number | undefined = undefined;
        if (row.costprice) {
          const parsed = parseFloat(row.costprice);
          if (!isNaN(parsed) && parsed >= 0) {
            costPrice = parsed;
          } else {
            warnings.push(`Row ${rowNum}: Invalid costPrice '${row.costprice}', skipping`);
          }
        }

        let stockCount: number | undefined = undefined;
        if (row.stockcount) {
          const parsed = parseInt(row.stockcount);
          if (!isNaN(parsed) && parsed >= 0) {
            stockCount = parsed;
          } else {
            warnings.push(`Row ${rowNum}: Invalid stockCount '${row.stockcount}', skipping`);
          }
        }

        let soldCount = 0;
        if (row.soldcount) {
          const parsed = parseInt(row.soldcount);
          if (!isNaN(parsed) && parsed >= 0) {
            soldCount = parsed;
          } else {
            warnings.push(`Row ${rowNum}: Invalid soldCount '${row.soldcount}', using default (0)`);
          }
        }

        // Image - Support Dropbox URLs and convert to direct download format
        let image = row.image || '';
        if (image) {
          image = convertDropboxUrl(image);
        }

        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
        } else {
          parsedData.push({
            name: row.name.trim(),
            description: description,
            category: category as 'mounted-linear-units' | 'rolling-bearings',
            categoryId: categoryId,
            subcategoryId: subcategoryId || undefined,
            price: price,
            currency: currency,
            costPrice: costPrice,
            stockCount: stockCount,
            soldCount: soldCount,
            rating: rating,
            reviewCount: reviewCount,
            image: image,
            inStock: inStock,
            badge: badge,
          });
        }

      }

      // Detect duplicates
      const duplicateInfo = detectDuplicates(parsedData, products);
      const uniqueProducts = duplicateInfo.unique;

      // Add duplicate warnings
      if (duplicateInfo.duplicates.length > 0) {
        warnings.push('');
        warnings.push(`⚠️ DUPLICATES DETECTED (${duplicateInfo.duplicates.length}):`);
        warnings.push(...duplicateInfo.duplicates);
        warnings.push('');
        warnings.push('Duplicate products will be SKIPPED during import.');
      }

      // Store errors and warnings separately
      setCsvData(uniqueProducts);
      setCsvErrors(errors);
      setCsvWarnings(warnings);

      if (uniqueProducts.length > 0 && errors.length === 0) {
        setShowCsvPreview(true);
        if (duplicateInfo.duplicates.length > 0) {
          toast.success(`Parsed ${uniqueProducts.length} products (${duplicateInfo.duplicates.length} duplicates will be skipped)`);
        } else if (warnings.length > 0) {
          toast.success(`Parsed ${uniqueProducts.length} products with ${warnings.length} warning(s)`);
        } else {
          toast.success(`Successfully parsed ${uniqueProducts.length} products`);
        }
      } else if (errors.length > 0) {
        toast.error(`Found ${errors.length} blocking error(s) - cannot import`);
      }
    } catch (error) {
      errors.push('Failed to parse CSV file. Please check the format.');
      setCsvErrors(errors);
      setCsvWarnings([]);
      toast.error('Failed to parse CSV file');
    }

    setIsProcessingCsv(false);
  };

  const handleBulkImport = async () => {
    if (csvData.length === 0) {
      toast.error('No valid products to import');
      return;
    }

    setIsProcessingCsv(true);
    let successCount = 0;
    let imageUploadCount = 0;
    let imageUploadFailed = 0;
    let skippedCount = 0;

    try {
      // Filter out duplicates first
      const newProducts: Omit<Product, 'id'>[] = [];
      const productsToProcess: Array<{ product: Omit<Product, 'id'>, index: number }> = [];

      csvData.forEach((product, index) => {
        const existingProduct = products.find(p =>
          p.name.toLowerCase() === product.name.toLowerCase() &&
          p.category === product.category
        );

        if (existingProduct) {
          console.log(`⏭️ Skipping duplicate product: "${product.name}"`);
          skippedCount++;
        } else {
          productsToProcess.push({ product, index });
        }
      });

      if (productsToProcess.length === 0) {
        toast.error('All products are duplicates. Nothing to import.');
        setIsProcessingCsv(false);
        return;
      }

      // Process images in parallel batches (20 at a time for better throughput)
      const IMAGE_BATCH_SIZE = 20;
      toast.info(`Processing ${productsToProcess.length} products...`);

      for (let i = 0; i < productsToProcess.length; i += IMAGE_BATCH_SIZE) {
        const batch = productsToProcess.slice(i, i + IMAGE_BATCH_SIZE);
        const batchNumber = Math.floor(i / IMAGE_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(productsToProcess.length / IMAGE_BATCH_SIZE);
        console.log(`📦 Processing image batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);
        toast.info(`Processing images: batch ${batchNumber}/${totalBatches}...`);

        // Upload images in parallel for this batch with better error handling
        const imageUploadPromises = batch.map(async ({ product, index }) => {
          if (product.image && product.image.trim()) {
            try {
              // Skip if already in Supabase storage
              if (product.image.includes('supabase.co')) {
                return product;
              }

              const uploadedImageUrl = await uploadImageToStorage(product.image, product.name, index);
              if (uploadedImageUrl !== product.image) {
                imageUploadCount++;
                console.log(`✅ Image uploaded successfully for ${product.name}`);
                return { ...product, image: uploadedImageUrl };
              } else {
                // Upload returned original URL (likely failed)
                imageUploadFailed++;
                console.warn(`⚠️ Image upload returned original URL for ${product.name} - upload may have failed`);
              }
            } catch (err: any) {
              imageUploadFailed++;
              console.error(`❌ Failed to upload image for ${product.name}:`, err?.message || err);
              // Continue with original image URL if upload fails
            }
          }
          return product;
        });

        const processedBatch = await Promise.allSettled(imageUploadPromises);
        processedBatch.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            newProducts.push(result.value);
          } else {
            // Fallback to original product if processing failed
            console.error(`Failed to process product at index ${i + idx}:`, result.reason);
            newProducts.push(batch[idx].product);
          }
        });
      }

      // Use bulk import API if available, otherwise fall back to individual adds
      let fallbackFailureCount = 0;
      if (onBulkImport && newProducts.length > 0) {
        console.log(`🚀 Bulk importing ${newProducts.length} products to database...`);
        successCount = await onBulkImport(newProducts);
        console.log(`✅ Successfully imported ${successCount} products`);
      } else {
        // Fallback to individual adds if bulk import not available
        console.log(`⚠️ Bulk import not available, using individual adds...`);
        for (const product of newProducts) {
          try {
            await onAddProduct(product);
            successCount++;
          } catch (error) {
            console.error('Error adding product:', error);
            fallbackFailureCount++;
          }
        }
      }

      let message = `Successfully imported ${successCount} products!`;
      if (imageUploadCount > 0) {
        message += ` (${imageUploadCount} images uploaded to storage)`;
      }
      if (imageUploadFailed > 0) {
        message += ` ⚠️ ${imageUploadFailed} images failed to upload (using original URLs)`;
        console.warn(`⚠️ ${imageUploadFailed} images failed to upload during bulk import`);
      }
      if (skippedCount > 0) {
        message += ` (${skippedCount} duplicates skipped)`;
      }

      if (fallbackFailureCount > 0) {
        toast.error(`${message} ${fallbackFailureCount} products failed to save.`);
      } else {
        toast.success(message);
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error(`Bulk import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessingCsv(false);
    }

    // Reset state
    setCsvFile(null);
    setCsvData([]);
    setCsvErrors([]);
    setCsvWarnings([]);
    setShowCsvPreview(false);

    // Reset file input
    const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }

    // Reload admin products
    setTimeout(async () => {
      const allProducts = await productsService.getAll();
      setAdminAllProducts(allProducts);
      setAdminCurrentPage(1);
    }, 500);
  };

  // Migrate existing product images from Dropbox URLs to Supabase Storage
  const handleMigrateImages = async () => {
    // Find products with Dropbox URLs
    const productsWithDropboxUrls = products.filter(p =>
      p.image &&
      p.image.includes('dropbox.com') &&
      !p.image.includes('supabase.co')
    );

    if (productsWithDropboxUrls.length === 0) {
      toast.info('No products with Dropbox URLs found. All images are already migrated.');
      return;
    }

    const confirmed = window.confirm(
      `Migrate ${productsWithDropboxUrls.length} product images from Dropbox to Supabase Storage?\n\n` +
      `This will download each image and upload it to Supabase Storage, then update the product records.\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    setIsMigratingImages(true);
    let migratedCount = 0;
    let failedCount = 0;

    try {
      toast.info(`Starting migration of ${productsWithDropboxUrls.length} images...`);

      // Process images in batches of 10
      const BATCH_SIZE = 10;
      for (let i = 0; i < productsWithDropboxUrls.length; i += BATCH_SIZE) {
        const batch = productsWithDropboxUrls.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(productsWithDropboxUrls.length / BATCH_SIZE);

        toast.info(`Migrating images: batch ${batchNumber}/${totalBatches}...`);

        const migrationPromises = batch.map(async (product) => {
          try {
            const newImageUrl = await uploadImageToStorage(product.image, product.name);
            if (newImageUrl !== product.image && newImageUrl.includes('supabase.co')) {
              // Update product with new image URL
              await onUpdateProduct(product.id, { image: newImageUrl });
              migratedCount++;
              console.log(`✅ Migrated image for ${product.name}`);
              return { success: true, product };
            } else {
              failedCount++;
              console.warn(`⚠️ Failed to migrate image for ${product.name} - returned original URL`);
              return { success: false, product };
            }
          } catch (error: any) {
            failedCount++;
            console.error(`❌ Error migrating image for ${product.name}:`, error.message || error);
            return { success: false, product, error };
          }
        });

        await Promise.allSettled(migrationPromises);
      }

      let message = `Image migration complete! Migrated ${migratedCount} images`;
      if (failedCount > 0) {
        message += ` (${failedCount} failed)`;
      }
      toast.success(message);

      // Refresh products to show updated URLs
      window.location.reload();
    } catch (error) {
      console.error('Image migration error:', error);
      toast.error(`Image migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsMigratingImages(false);
    }
  };

  const downloadTemplate = () => {
    const template = `name,description,category,categoryId,subcategoryId,price,currency,costPrice,stockCount,soldCount,rating,reviewCount,image,inStock,badge
6205 Deep Groove Ball Bearing,Single-row bearing for motors and general machinery,rolling-bearings,deep-groove-ball-bearings,,12.99,USD,6.50,150,87,4.5,150,,true,Best Seller
UC205 Mounted Bearing Unit,Preassembled insert bearing unit for conveyors,mounted-linear-units,mounted-bearing-units,,24.99,USD,15.00,200,123,4.8,200,,true,Standard
30205 Tapered Roller Bearing,For combined radial and axial loads,rolling-bearings,tapered-roller-bearings,,38.99,USD,20.00,100,45,4.7,89,,true,New
LM12UU Linear Bearing,Ball bushing for linear motion applications,mounted-linear-units,linear-motion,,19.99,USD,10.00,100,45,4.7,89,,true,New
22210 Spherical Roller Bearing,Self-aligning bearing for heavy-duty equipment,rolling-bearings,spherical-roller-bearings,,49.99,USD,28.00,80,22,4.8,42,,true,
Root-only category example,,rolling-bearings,,,9.99,USD,,,,,,true,
Product Name Only Example - All Other Fields Optional!,,,,,,,,,,,,,`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleBulkDelete = (action: 'mounted-linear-units' | 'rolling-bearings' | 'purge') => {
    setBulkDeleteAction(action);
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (!bulkDeleteAction) return;

    const productsToDelete = bulkDeleteAction === 'purge'
      ? products
      : products.filter(p => p.category === bulkDeleteAction);

    if (productsToDelete.length === 0) {
      toast.error(`No ${bulkDeleteAction === 'purge' ? '' : bulkDeleteAction} products found to delete`);
      setIsBulkDeleteDialogOpen(false);
      return;
    }

    try {
      // Use productsService bulk delete for efficiency
      const { productsService } = await import('../utils/productsService');
      const deletedCount = await productsService.bulkDelete(bulkDeleteAction);

      const message = bulkDeleteAction === 'purge'
        ? `All ${deletedCount} products deleted`
        : `${deletedCount} ${bulkDeleteAction} product(s) deleted`;

      toast.success(message);

      // Reload products by calling parent's refresh (if available) or reload page
      // The parent component (App.tsx) will reload products automatically
      window.location.reload();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(`Failed to delete products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsBulkDeleteDialogOpen(false);
      setBulkDeleteAction(null);
    }
  };

  // Filter products based on search and category (for admin management)
  const filteredAdminProducts = adminAllProducts.filter((product) => {
    const matchesSearch = searchQuery.trim() === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Pagination for filtered products
  const totalAdminPages = Math.ceil(filteredAdminProducts.length / ADMIN_ITEMS_PER_PAGE);
  const startIndex = (adminCurrentPage - 1) * ADMIN_ITEMS_PER_PAGE;
  const endIndex = startIndex + ADMIN_ITEMS_PER_PAGE;
  const paginatedAdminProducts = filteredAdminProducts.slice(startIndex, endIndex);

  // Filtered sales products - shows ALL products that have or can have sales
  const filteredSalesProducts = adminAllProducts.filter((product) => {
    const matchesSearch = searchQuery.trim() === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Pagination for badges tab
  const totalBadgePages = Math.ceil(filteredAdminProducts.length / BADGES_ITEMS_PER_PAGE);
  const badgeStartIndex = (badgesCurrentPage - 1) * BADGES_ITEMS_PER_PAGE;
  const badgeEndIndex = badgeStartIndex + BADGES_ITEMS_PER_PAGE;
  const paginatedBadgeProducts = filteredAdminProducts.slice(badgeStartIndex, badgeEndIndex);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#003366] mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Manage products, sales, and categories</p>
            </div>
            <SupabaseStatus />
          </div>
        </div>

        {/* Data Management Panel */}
        <div className="mb-6">
          <DataManagementPanel products={products} />

          {/* Image Migration Button */}
          {products.some(p => p.image && p.image.includes('dropbox.com') && !p.image.includes('supabase.co')) && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Image Migration</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {products.filter(p => p.image && p.image.includes('dropbox.com') && !p.image.includes('supabase.co')).length} products have Dropbox URLs that need to be migrated to Supabase Storage
                    </p>
                  </div>
                  <Button
                    onClick={handleMigrateImages}
                    disabled={isMigratingImages}
                    className="bg-[#003366] hover:bg-[#004488]"
                  >
                    {isMigratingImages ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Migrating Images...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Migrate Images to Storage
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs value={activeAdminTab} onValueChange={setActiveAdminTab} className="space-y-6">
          <TabsList className="flex flex-wrap gap-2 h-auto bg-gray-100 p-2">
            <TabsTrigger value="products" className="flex-shrink-0">
              <Package className="h-4 w-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex-shrink-0">
              <Layers3 className="h-4 w-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex-shrink-0">
              <Tag className="h-4 w-4 mr-2" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex-shrink-0">
              <Percent className="h-4 w-4 mr-2" />
              Sales
            </TabsTrigger>
            <TabsTrigger value="currency" className="flex-shrink-0">
              <DollarSign className="h-4 w-4 mr-2" />
              Currency
            </TabsTrigger>
            <TabsTrigger value="shipping-settings" className="flex-shrink-0">
              <Truck className="h-4 w-4 mr-2" />
              Shipping
            </TabsTrigger>
            <TabsTrigger value="commerce-settings" className="flex-shrink-0">
              <CreditCard className="h-4 w-4 mr-2" />
              Payments & Quotes
            </TabsTrigger>
            <TabsTrigger value="bulk-upload" className="flex-shrink-0">
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </TabsTrigger>
            <TabsTrigger value="bulk-delete" className="flex-shrink-0">
              <Trash2 className="h-4 w-4 mr-2" />
              Bulk Delete
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-shrink-0">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-shrink-0">
              <Package className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="payment-settings" className="flex-shrink-0">
              <CreditCard className="h-4 w-4 mr-2" />
              Payment
            </TabsTrigger>
            <TabsTrigger value="notifications-settings" className="flex-shrink-0">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Product Management</CardTitle>
                      <CardDescription>Add, edit, or remove products from your catalog</CardDescription>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" className="border-[#003366] text-[#003366] hover:bg-blue-50" onClick={() => setActiveAdminTab('categories')}>
                        <Layers3 className="h-4 w-4 mr-2" />
                        Manage Categories
                      </Button>
                      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-[#DC143C] hover:bg-[#B01030]">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Product
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Add New Product</DialogTitle>
                          <DialogDescription>
                            Fill in the product details below. Only the product name is required.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="name">Product Name *</Label>
                            <Input
                              id="name"
                              value={newProduct.name}
                              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                              placeholder="Enter product name"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={newProduct.description}
                              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                              placeholder="Enter product description"
                              rows={3}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="category">Category *</Label>
                              <Select
                                value={newProduct.category}
                                onValueChange={(value: 'mounted-linear-units' | 'rolling-bearings') => {
                                  const firstChild = getChildrenForParent(value)[0];
                                  setNewProduct({
                                    ...newProduct,
                                    category: value,
                                    categoryId: firstChild?.id || '',
                                    subcategoryId: '',
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {parentCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="subcategory">Product category (optional)</Label>
                              <Select
                                value={newProduct.categoryId || '__root_only__'}
                                onValueChange={(value) => setNewProduct({ ...newProduct, categoryId: value === '__root_only__' ? '' : value, subcategoryId: '' })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__root_only__">Department only</SelectItem>
                                  {getChildrenForParent(newProduct.category).map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="product-subcategory">Subcategory (optional)</Label>
                            <Select
                              value={newProduct.subcategoryId || '__no_subcategory__'}
                              onValueChange={(value) => setNewProduct({ ...newProduct, subcategoryId: value === '__no_subcategory__' ? '' : value })}
                              disabled={!newProduct.categoryId}
                            >
                              <SelectTrigger id="product-subcategory"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__no_subcategory__">No subcategory</SelectItem>
                                {getChildrenForParent(newProduct.categoryId).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="price">Sell Price ($) *</Label>
                              <Input
                                id="price"
                                type="number"
                                step="0.01"
                                value={newProduct.price}
                                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                placeholder="0.00"
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="costPrice">Cost Price ($)</Label>
                              <Input
                                id="costPrice"
                                type="number"
                                step="0.01"
                                value={newProduct.costPrice}
                                onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })}
                                placeholder="0.00"
                              />
                              <p className="text-xs text-gray-500">For profit tracking</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="stockCount">Stock Quantity</Label>
                              <Input
                                id="stockCount"
                                type="number"
                                value={newProduct.stockCount}
                                onChange={(e) => setNewProduct({ ...newProduct, stockCount: e.target.value })}
                                placeholder="0"
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="soldCount">Units Sold</Label>
                              <Input
                                id="soldCount"
                                type="number"
                                value={newProduct.soldCount}
                                onChange={(e) => setNewProduct({ ...newProduct, soldCount: e.target.value })}
                                placeholder="0"
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="rating">Rating</Label>
                              <Input
                                id="rating"
                                type="number"
                                step="0.1"
                                min="0"
                                max="5"
                                value={newProduct.rating}
                                onChange={(e) => setNewProduct({ ...newProduct, rating: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="reviews">Review Count</Label>
                            <Input
                              id="reviews"
                              type="number"
                              value={newProduct.reviewCount}
                              onChange={(e) => setNewProduct({ ...newProduct, reviewCount: e.target.value })}
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label>Product Image</Label>
                            <div className="flex gap-2 mb-2">
                              <Button
                                type="button"
                                variant={imageInputType === 'url' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setImageInputType('url')}
                                className={imageInputType === 'url' ? 'bg-[#003366]' : ''}
                              >
                                <Link2 className="h-4 w-4 mr-2" />
                                URL
                              </Button>
                              <Button
                                type="button"
                                variant={imageInputType === 'file' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setImageInputType('file')}
                                className={imageInputType === 'file' ? 'bg-[#003366]' : ''}
                              >
                                <Image className="h-4 w-4 mr-2" />
                                Upload File
                              </Button>
                            </div>
                            {imageInputType === 'url' ? (
                              <>
                                <Textarea
                                  id="image"
                                  value={newProduct.image}
                                  onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                                  placeholder="Enter image URL or leave blank for placeholder"
                                  rows={2}
                                />
                                <p className="text-sm text-gray-500">Use Unsplash URLs or figma:asset paths</p>
                              </>
                            ) : (
                              <>
                                <Input
                                  id="image-file"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(e, false)}
                                  className="cursor-pointer"
                                />
                                <p className="text-sm text-gray-500">Upload an image from your device</p>
                              </>
                            )}
                            {newProduct.image && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-500 mb-2">Preview:</p>
                                <img
                                  src={newProduct.image}
                                  alt="Preview"
                                  className="h-20 w-20 object-cover rounded border"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="badge">Badge (Optional)</Label>
                            <Select
                              value={newProduct.badge}
                              onValueChange={(value) => setNewProduct({ ...newProduct, badge: value as any })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="No badge" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Badge</SelectItem>
                                <SelectItem value="Best Seller">Best Seller</SelectItem>
                                <SelectItem value="Top Rated">Top Rated</SelectItem>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Standard">Standard</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="inStock"
                              checked={newProduct.inStock}
                              onChange={(e) => setNewProduct({ ...newProduct, inStock: e.target.checked })}
                              className="h-4 w-4"
                            />
                            <Label htmlFor="inStock" className="cursor-pointer">In Stock</Label>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddProduct} className="bg-[#DC143C] hover:bg-[#B01030]">
                            Add Product
                          </Button>
                        </div>
                      </DialogContent>
                      </Dialog>
                    </div>

                    {/* Edit Product Dialog */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Product</DialogTitle>
                          <DialogDescription>
                            Update the product details below.
                          </DialogDescription>
                        </DialogHeader>
                        {editingProduct && (
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="edit-name">Product Name *</Label>
                              <Input
                                id="edit-name"
                                value={editingProduct.name}
                                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                placeholder="Enter product name"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-category">Category *</Label>
                                <Select
                                  value={editingProduct.category}
                                  onValueChange={(value: 'mounted-linear-units' | 'rolling-bearings') => {
                                    const firstChild = getChildrenForParent(value)[0];
                                    setEditingProduct({
                                      ...editingProduct,
                                      category: value,
                                      categoryId: firstChild?.id || '',
                                      subcategoryId: '',
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {parentCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor="edit-subcategory">Product category (optional)</Label>
                                <Select
                                  value={editingProduct.categoryId || '__root_only__'}
                                  onValueChange={(value) => setEditingProduct({ ...editingProduct, categoryId: value === '__root_only__' ? '' : value, subcategoryId: '' })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__root_only__">Department only</SelectItem>
                                    {getChildrenForParent(editingProduct.category).map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="edit-product-subcategory">Subcategory (optional)</Label>
                              <Select
                                value={editingProduct.subcategoryId || '__no_subcategory__'}
                                onValueChange={(value) => setEditingProduct({ ...editingProduct, subcategoryId: value === '__no_subcategory__' ? '' : value })}
                                disabled={!editingProduct.categoryId}
                              >
                                <SelectTrigger id="edit-product-subcategory"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__no_subcategory__">No subcategory</SelectItem>
                                  {getChildrenForParent(editingProduct.categoryId || '').map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-price">Price ($) *</Label>
                                <Input
                                  id="edit-price"
                                  type="number"
                                  step="0.01"
                                  value={editingProduct.price}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                                  placeholder="0.00"
                                />
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor="edit-rating">Rating</Label>
                                <Input
                                  id="edit-rating"
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="5"
                                  value={editingProduct.rating}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, rating: parseFloat(e.target.value) || 0 })}
                                />
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor="edit-reviews">Reviews</Label>
                                <Input
                                  id="edit-reviews"
                                  type="number"
                                  value={editingProduct.reviewCount}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, reviewCount: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                            </div>

                            <div className="grid gap-2">
                              <Label>Product Image</Label>
                              <div className="flex gap-2 mb-2">
                                <Button
                                  type="button"
                                  variant={editImageInputType === 'url' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setEditImageInputType('url')}
                                  className={editImageInputType === 'url' ? 'bg-[#003366]' : ''}
                                >
                                  <Link2 className="h-4 w-4 mr-2" />
                                  URL
                                </Button>
                                <Button
                                  type="button"
                                  variant={editImageInputType === 'file' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setEditImageInputType('file')}
                                  className={editImageInputType === 'file' ? 'bg-[#003366]' : ''}
                                >
                                  <Image className="h-4 w-4 mr-2" />
                                  Upload File
                                </Button>
                              </div>
                              {editImageInputType === 'url' ? (
                                <>
                                  <Textarea
                                    id="edit-image"
                                    value={editingProduct.image}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                                    placeholder="Enter image URL or leave blank for placeholder"
                                    rows={2}
                                  />
                                  <p className="text-sm text-gray-500">Use Unsplash URLs or figma:asset paths</p>
                                </>
                              ) : (
                                <>
                                  <Input
                                    id="edit-image-file"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, true)}
                                    className="cursor-pointer"
                                  />
                                  <p className="text-sm text-gray-500">Upload an image from your device</p>
                                </>
                              )}
                              {editingProduct.image && (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-500 mb-2">Preview:</p>
                                  <img
                                    src={editingProduct.image}
                                    alt="Preview"
                                    className="h-20 w-20 object-cover rounded border"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="edit-badge">Badge (Optional)</Label>
                              <Select
                                value={editingProduct.badge || 'none'}
                                onValueChange={(value) => setEditingProduct({ ...editingProduct, badge: value === 'none' ? undefined : value as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="No badge" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Badge</SelectItem>
                                  <SelectItem value="Best Seller">Best Seller</SelectItem>
                                  <SelectItem value="Top Rated">Top Rated</SelectItem>
                                  <SelectItem value="New">New</SelectItem>
                                  <SelectItem value="Standard">Standard</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="edit-inStock"
                                checked={editingProduct.inStock}
                                onChange={(e) => setEditingProduct({ ...editingProduct, inStock: e.target.checked })}
                                className="h-4 w-4"
                              />
                              <Label htmlFor="edit-inStock" className="cursor-pointer">In Stock</Label>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => {
                            setIsEditDialogOpen(false);
                            setEditingProduct(null);
                          }}>
                            Cancel
                          </Button>
                          <Button onClick={handleEditProduct} className="bg-[#003366] hover:bg-[#004488]">
                            Update Product
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Search and Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search products by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select value={categoryFilter} onValueChange={(value: 'all' | 'mounted-linear-units' | 'rolling-bearings') => setCategoryFilter(value)}>
                        <SelectTrigger className="w-[180px]">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="mounted-linear-units">Mounted &amp; Linear Units</SelectItem>
                          <SelectItem value="rolling-bearings">Rolling Bearings</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Results count */}
                  <div className="text-sm text-gray-600">
                    Showing {paginatedAdminProducts.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredAdminProducts.length)} of {filteredAdminProducts.length} products (Total in system: {adminAllProducts.length})
                    {searchQuery && ` matching "${searchQuery}"`}
                    {categoryFilter !== 'all' && ` in ${getCategoryName(categoryFilter)}`}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Badge</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAdminProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No products found. {searchQuery && 'Try a different search term or'} {categoryFilter !== 'all' && 'change the category filter or'} add a new product.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedAdminProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {product.image && (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                )}
                                <div>
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {product.rating}★ ({product.reviewCount})
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{getCategoryName(product.category)}</div>
                                <div className="text-gray-500">{getCategoryName(product.categoryId || '')}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {product.originalPrice ? (
                                <div>
                                  <div className="line-through text-gray-500 text-sm">${product.originalPrice.toFixed(2)}</div>
                                  <div className="text-[#DC143C]">${product.price.toFixed(2)}</div>
                                </div>
                              ) : (
                                <div>${product.price.toFixed(2)}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={product.inStock ? "default" : "secondary"}>
                                {product.inStock ? 'In Stock' : 'Out of Stock'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {product.badge && (
                                <Badge variant="outline" className="bg-[#FFF3CD]">
                                  {product.badge}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditDialog(product)}
                                  title="Edit product"
                                >
                                  <Edit className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteProduct(product)}
                                  title="Delete product"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {filteredAdminProducts.length > ADMIN_ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between mt-4 px-4 py-3 border-t">
                    <div className="text-sm text-gray-600">
                      Page {adminCurrentPage} of {totalAdminPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdminCurrentPage(Math.max(1, adminCurrentPage - 1))}
                        disabled={adminCurrentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdminCurrentPage(Math.min(totalAdminPages, adminCurrentPage + 1))}
                        disabled={adminCurrentPage >= totalAdminPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManagementPanel />
          </TabsContent>

          <TabsContent value="shipping-settings">
            <ShippingSettingsPanel />
          </TabsContent>

          <TabsContent value="commerce-settings">
            <CommerceSettingsPanel products={adminAllProducts} />
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div>
                    <CardTitle>Badge Management</CardTitle>
                    <CardDescription>Assign badges to products: Best Seller, Top Rated, or New</CardDescription>
                  </div>

                  {/* Search and Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search products by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select value={categoryFilter} onValueChange={(value: 'all' | 'mounted-linear-units' | 'rolling-bearings') => setCategoryFilter(value)}>
                        <SelectTrigger className="w-[180px]">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="mounted-linear-units">Mounted &amp; Linear Units</SelectItem>
                          <SelectItem value="rolling-bearings">Rolling Bearings</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Results count */}
                  <div className="text-sm text-gray-600">
                    Showing {paginatedBadgeProducts.length === 0 ? 0 : badgeStartIndex + 1}-{Math.min(badgeEndIndex, filteredAdminProducts.length)} of {filteredAdminProducts.length} products (Total in system: {adminAllProducts.length})
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paginatedBadgeProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No products found. Try a different search term or change the category filter.
                    </div>
                  ) : (
                    paginatedBadgeProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {product.image && (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">{getCategoryName(product.category)}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-gray-600 whitespace-nowrap">Badge:</Label>
                          <Select
                            value={product.badge || 'none'}
                            onValueChange={(value) => handleBadgeUpdate(product, value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="No badge" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Badge</SelectItem>
                              <SelectItem value="Best Seller">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4" />
                                  Best Seller
                                </div>
                              </SelectItem>
                              <SelectItem value="Top Rated">
                                <div className="flex items-center gap-2">
                                  <Tag className="h-4 w-4" />
                                  Top Rated
                                </div>
                              </SelectItem>
                              <SelectItem value="New">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  New
                                </div>
                              </SelectItem>
                              <SelectItem value="Standard">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  Standard
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))
                  )}

                  {filteredAdminProducts.length > BADGES_ITEMS_PER_PAGE && (
                    <div className="flex justify-center items-center gap-2 mt-8 py-4 border-t border-gray-100">
                      <button
                        onClick={() => setBadgesCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={badgesCurrentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {badgesCurrentPage} of {totalBadgePages}
                      </span>
                      <button
                        onClick={() => setBadgesCurrentPage(prev => prev + 1)}
                        disabled={badgesCurrentPage >= totalBadgePages}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div>
                    <CardTitle>Sales & Discounts</CardTitle>
                    <CardDescription>Create special offers and discount pricing</CardDescription>
                  </div>

                  {/* Search and Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search products by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select value={categoryFilter} onValueChange={(value: 'all' | 'mounted-linear-units' | 'rolling-bearings') => setCategoryFilter(value)}>
                        <SelectTrigger className="w-[180px]">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="mounted-linear-units">Mounted &amp; Linear Units</SelectItem>
                          <SelectItem value="rolling-bearings">Rolling Bearings</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Results count */}
                  <div className="text-sm text-gray-600">
                    Showing {filteredSalesProducts.length > 0 ? (salesCurrentPage - 1) * SALES_ITEMS_PER_PAGE + 1 : 0}-{Math.min(salesCurrentPage * SALES_ITEMS_PER_PAGE, filteredSalesProducts.length)} of {filteredSalesProducts.length} products
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredSalesProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No products found. Try a different search term or change the category filter.
                    </div>
                  ) : (
                    <>
                      {filteredSalesProducts
                        .slice((salesCurrentPage - 1) * SALES_ITEMS_PER_PAGE, salesCurrentPage * SALES_ITEMS_PER_PAGE)
                        .map((product) => (
                          <div
                            key={product.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {product.image && (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm">
                                  {product.originalPrice ? (
                                    <div className="flex items-center gap-2">
                                      <span className="line-through text-gray-500">${product.originalPrice.toFixed(2)}</span>
                                      <span className="text-[#DC143C]">${product.price.toFixed(2)}</span>
                                      <Badge className="bg-green-500">
                                        {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                                      </Badge>
                                    </div>
                                  ) : (
                                    <span className="text-gray-600">${product.price.toFixed(2)}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {product.originalPrice ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await onUpdateProduct(product.id, {
                                        price: product.originalPrice,
                                        originalPrice: null,
                                      });
                                      // Reload admin products to show updated prices
                                      await reloadAdminProducts();
                                      toast.success('Sale cancelled');
                                    } catch (error) {
                                      console.error('Failed to cancel sale:', error);
                                      toast.error('Failed to cancel sale');
                                    }
                                  }}
                                  className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                                >
                                  Cancel Sale
                                </Button>
                              ) : (
                                <Dialog open={isSaleDialogOpen && saleProduct?.id === product.id} onOpenChange={(open) => {
                                  setIsSaleDialogOpen(open);
                                  if (!open) setSaleProduct(null);
                                }}>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSaleProduct(product)}
                                    >
                                      <Percent className="h-4 w-4 mr-2" />
                                      Create Sale
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Create Sale</DialogTitle>
                                      <DialogDescription>
                                        Set a discount percentage for this product.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div>
                                        <p className="text-sm text-gray-600 mb-2">Product: {product.name}</p>
                                        <p className="text-sm text-gray-600">Current Price: ${product.price.toFixed(2)}</p>
                                      </div>
                                      <div className="grid gap-2">
                                        <Label htmlFor="discount">Discount Percentage</Label>
                                        <div className="flex gap-2">
                                          <Input
                                            id="discount"
                                            type="number"
                                            min="1"
                                            max="99"
                                            value={discountPercent}
                                            onChange={(e) => setDiscountPercent(e.target.value)}
                                          />
                                          <span className="flex items-center text-gray-600">%</span>
                                        </div>
                                        {discountPercent && (
                                          <p className="text-sm text-[#DC143C]">
                                            New Price: ${(product.price * (1 - parseFloat(discountPercent) / 100)).toFixed(2)}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" onClick={() => {
                                        setIsSaleDialogOpen(false);
                                        setSaleProduct(null);
                                      }}>
                                        Cancel
                                      </Button>
                                      <Button 
                                        onClick={async () => {
                                          try {
                                            await onCreateSale(product.id, parseFloat(discountPercent) || 0);
                                            // Reload admin products to show updated prices
                                            await reloadAdminProducts();
                                            // Close dialog and reset state after successful sale creation
                                            setIsSaleDialogOpen(false);
                                            setSaleProduct(null);
                                            setDiscountPercent('10'); // Reset to default
                                          } catch (error) {
                                            console.error('Failed to create sale:', error);
                                          }
                                        }} 
                                        className="bg-[#DC143C] hover:bg-[#B01030]"
                                      >
                                        Apply Sale
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </div>
                        ))}

                      {/* Pagination Controls */}
                      {filteredSalesProducts.length > SALES_ITEMS_PER_PAGE && (
                        <div className="flex justify-center items-center gap-2 mt-8 py-4 border-t border-gray-100">
                          <button
                            onClick={() => setSalesCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={salesCurrentPage === 1}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <span className="text-sm text-gray-600">
                            Page {salesCurrentPage} of {Math.ceil(filteredSalesProducts.length / SALES_ITEMS_PER_PAGE)}
                          </span>
                          <button
                            onClick={() => setSalesCurrentPage(prev => prev + 1)}
                            disabled={salesCurrentPage >= Math.ceil(filteredSalesProducts.length / SALES_ITEMS_PER_PAGE)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Upload Tab */}
          <TabsContent value="bulk-upload">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Bulk Product Upload</CardTitle>
                  <CardDescription>Upload multiple products at once using a CSV file</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">How to use Bulk Upload</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                      <li>Download the CSV template using the button below (or use your existing CSV)</li>
                      <li>Fill in your product information following the template format</li>
                      <li>Upload the completed CSV file (supports images embedded in cells)</li>
                      <li>Review the parsed products in the preview</li>
                      <li>Click "Import Products" to add them to your catalog</li>
                    </ol>
                    <div className="mt-3 space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadTemplate}
                        className="bg-white"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV Template
                      </Button>
                      <p className="text-xs text-blue-700 mt-2">
                        ✓ Supports CSV files with quoted fields and embedded images
                      </p>
                    </div>
                  </div>

                  {/* CSV Format Guide */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3">CSV Format Guide</h3>
                    <div className="space-y-2 text-sm">
                      <div className="bg-green-50 p-3 rounded mb-3">
                        <span className="font-medium text-green-900">✓ Required column (only 1!):</span>
                        <ul className="list-disc list-inside ml-4 mt-1 text-green-800">
                          <li><strong>name</strong> - Product name (this is all you need!)</li>
                        </ul>
                        <p className="text-xs text-green-700 mt-2">✨ Everything else is 100% optional! Missing fields automatically get smart defaults (price=$9.99, a bearing category, rating=4.5, etc.)</p>
                      </div>
                      <div>
                        <span className="font-medium">Recommended columns:</span> price, category, categoryId, description
                      </div>
                      <div>
                        <span className="font-medium">Analytics columns (for sales dashboard):</span> costPrice, stockCount, soldCount
                      </div>
                      <div>
                        <span className="font-medium">Optional columns:</span> rating, reviewCount, image, inStock, badge
                      </div>
                      <div className="mt-3 bg-purple-50 p-3 rounded">
                        <span className="font-medium text-purple-900">📸 Image Column:</span>
                        <p className="text-purple-800 mt-1">
                          Paste image URLs directly from Google Sheets. Supports Unsplash URLs, direct image links, or figma:asset paths. Leave blank for placeholder.
                        </p>
                      </div>
                      <div className="mt-3 bg-blue-50 p-3 rounded">
                        <span className="font-medium text-blue-900">Analytics Fields Explained:</span>
                        <ul className="list-disc list-inside ml-4 mt-1 text-blue-800">
                          <li><strong>costPrice:</strong> Your cost to acquire the product (for profit calculations)</li>
                          <li><strong>stockCount:</strong> Number of units currently in stock</li>
                          <li><strong>soldCount:</strong> Total units sold to date (for tracking sales performance)</li>
                        </ul>
                        <p className="mt-2 text-blue-700">These fields enable tracking of: goods sold, inventory levels, profit margins, and top-performing products.</p>
                      </div>
                      <div className="mt-3">
                        <span className="font-medium">Available categories:</span>
                        <ul className="list-disc list-inside ml-4 mt-1 text-sm">
                          {parentCategories.map((category) => (
                            <li key={category.id}><strong>{category.name}:</strong> {getChildrenForParent(category.id).map((child) => child.name).join(', ')}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-3">
                        <span className="font-medium">Valid badges:</span> Best Seller, Top Rated, New
                      </div>
                    </div>
                  </div>

                  {/* File Upload Section */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Upload className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600 mb-2">
                          {csvFile ? csvFile.name : 'No file selected'}
                        </p>
                        <Input
                          id="csv-file-input"
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Button
                          onClick={() => document.getElementById('csv-file-input')?.click()}
                          className="bg-[#DC143C] hover:bg-[#B01030]"
                        >
                          <FileUp className="h-4 w-4 mr-2" />
                          Choose CSV File
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Processing Indicator */}
                  {isProcessingCsv && (
                    <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <p className="text-blue-700">Processing CSV file...</p>
                    </div>
                  )}

                  {/* Blocking Errors Display */}
                  {csvErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-medium text-red-900 mb-2">
                            🚫 {csvErrors.length} Blocking Error(s) - Cannot Import
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                            {csvErrors.slice(0, 10).map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                            {csvErrors.length > 10 && (
                              <li className="text-red-600">... and {csvErrors.length - 10} more errors</li>
                            )}
                          </ul>
                          <p className="text-xs text-red-600 mt-3 font-medium">
                            Fix these errors to proceed with import.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warnings Display (Non-blocking) */}
                  {csvWarnings.length > 0 && csvErrors.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-medium text-yellow-900 mb-2">
                            ⚠️ {csvWarnings.length} Warning(s) - Import Can Proceed
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 max-h-48 overflow-y-auto">
                            {csvWarnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                          <p className="text-xs text-yellow-600 mt-3 font-medium">
                            ✓ These are informational only. Smart defaults will be applied during import.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview Section */}
                  {showCsvPreview && csvData.length > 0 && (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <h4 className="font-medium text-green-900">
                            Successfully parsed {csvData.length} product(s)
                          </h4>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          Review the products below and click "Import Products" to add them to your catalog.
                        </p>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <h4 className="font-medium">Preview</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Product Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Cost Price</TableHead>
                                <TableHead>Stock Qty</TableHead>
                                <TableHead>Sold</TableHead>
                                <TableHead>Profit/Unit</TableHead>
                                <TableHead>Image</TableHead>
                                <TableHead>Badge</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {csvData.map((product, index) => (
                                <TableRow key={index}>
                                  <TableCell>{index + 1}</TableCell>
                                  <TableCell className="font-medium">
                                    <div>{product.name}</div>
                                    {product.description && (
                                      <div className="text-xs text-gray-600 mt-1 line-clamp-2 max-w-xs">
                                        {product.description}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500 capitalize mt-1">
                                      {product.rating}★ ({product.reviewCount})
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div>{getCategoryName(product.category)}</div>
                                      <div className="text-gray-500 text-xs">{getCategoryName(product.categoryId)}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-green-700 font-medium">${product.price.toFixed(2)}</div>
                                  </TableCell>
                                  <TableCell>
                                    {product.costPrice ? (
                                      <span className="text-sm">${product.costPrice.toFixed(2)}</span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {product.stockCount !== undefined ? (
                                      <Badge variant={product.stockCount > 0 ? "default" : "secondary"} className="text-xs">
                                        {product.stockCount} units
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400 text-xs">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {product.soldCount !== undefined ? (
                                      <span className="text-sm text-blue-700">{product.soldCount} sold</span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">0</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {product.costPrice ? (
                                      <div className="text-sm">
                                        <span className="text-green-700 font-medium">
                                          ${(product.price - product.costPrice).toFixed(2)}
                                        </span>
                                        <div className="text-xs text-gray-500">
                                          ({(((product.price - product.costPrice) / product.costPrice) * 100).toFixed(0)}%)
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-xs">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {product.image ? (
                                      <div className="flex items-center gap-2">
                                        <img
                                          src={product.image}
                                          alt={product.name}
                                          className="w-12 h-12 object-cover rounded border"
                                          onError={(e) => {
                                            e.currentTarget.src = 'https://placehold.co/48x48?text=No+Image';
                                          }}
                                        />
                                        <span className="text-xs text-gray-500 truncate max-w-[100px]" title={product.image}>
                                          {product.image.substring(0, 20)}...
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-xs">No image</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {product.badge ? (
                                      <Badge variant="outline" className="bg-[#FFF3CD] text-xs">
                                        {product.badge}
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400 text-xs">None</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setCsvFile(null);
                            setCsvData([]);
                            setCsvErrors([]);
                            setCsvWarnings([]);
                            setShowCsvPreview(false);
                            const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleBulkImport}
                          className="bg-[#003366] hover:bg-[#004488]"
                          disabled={csvData.length === 0}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Import {csvData.length} Product(s)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Delete Tab */}
          <TabsContent value="bulk-delete">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Bulk Delete Products</CardTitle>
                  <CardDescription>Delete products by category or purge all data</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Warning Alert */}
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>Warning:</strong> Bulk delete operations are permanent and cannot be undone. Please proceed with caution.
                    </AlertDescription>
                  </Alert>

                  {/* Product Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-2">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Mounted &amp; Linear Units</p>
                            <p className="text-2xl font-bold text-[#003366]">
                              {products.filter(p => p.category === 'mounted-linear-units').length}
                            </p>
                          </div>
                          <Package className="h-8 w-8 text-[#003366] opacity-20" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Rolling Bearings</p>
                            <p className="text-2xl font-bold text-[#DC143C]">
                              {products.filter(p => p.category === 'rolling-bearings').length}
                            </p>
                          </div>
                          <Package className="h-8 w-8 text-[#DC143C] opacity-20" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-gray-300">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Total Products</p>
                            <p className="text-2xl font-bold text-gray-700">
                              {products.length}
                            </p>
                          </div>
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Delete Actions */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Delete Operations</h3>

                    <div className="grid gap-4">
                      {/* Delete Mounted & Linear Unit products */}
                      <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-[#003366]">Delete All Mounted &amp; Linear Unit Products</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Remove all {products.filter(p => p.category === 'mounted-linear-units').length} mounted or linear unit product(s) from the catalog
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            className="border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white"
                            onClick={() => handleBulkDelete('mounted-linear-units')}
                            disabled={products.filter(p => p.category === 'mounted-linear-units').length === 0}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Units
                          </Button>
                        </div>
                      </div>

                      {/* Delete Rolling Bearing products */}
                      <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-[#DC143C]">Delete All Rolling Bearing Products</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Remove all {products.filter(p => p.category === 'rolling-bearings').length} rolling bearing product(s) from the catalog
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            className="border-[#DC143C] text-[#DC143C] hover:bg-[#DC143C] hover:text-white"
                            onClick={() => handleBulkDelete('rolling-bearings')}
                            disabled={products.filter(p => p.category === 'rolling-bearings').length === 0}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Bearings
                          </Button>
                        </div>
                      </div>

                      {/* Purge All Data */}
                      <div className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 text-red-600" />
                              <h4 className="font-bold text-red-900">Purge All Products (Danger Zone)</h4>
                            </div>
                            <p className="text-sm text-red-700 mt-2">
                              <strong>This will delete ALL {products.length} products</strong> from both categories. This action is irreversible and will completely clear your product catalog.
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => handleBulkDelete('purge')}
                            disabled={products.length === 0}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Purge All
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Confirmation Dialog */}
                  <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          Confirm Bulk Delete
                        </DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. Please confirm you want to proceed with deleting.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {bulkDeleteAction === 'purge' && (
                          <div>
                            <p className="text-sm">
                              This will permanently remove:
                            </p>
                            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                              <li>{products.filter(p => p.category === 'mounted-linear-units').length} Mounted &amp; Linear Unit products</li>
                              <li>{products.filter(p => p.category === 'rolling-bearings').length} Rolling Bearing products</li>
                            </ul>
                          </div>
                        )}
                        {bulkDeleteAction === 'mounted-linear-units' && (
                            <div className="space-y-2 mt-4">
                              <p className="font-medium">
                                You are about to delete {products.filter(p => p.category === 'mounted-linear-units').length} mounted or linear unit product(s).
                              </p>
                              <p className="text-sm text-gray-600">
                                This will remove all products in the Mounted &amp; Linear Units category.
                              </p>
                            </div>
                          )}
                          {bulkDeleteAction === 'rolling-bearings' && (
                            <div className="space-y-2 mt-4">
                              <p className="font-medium">
                                You are about to delete {products.filter(p => p.category === 'rolling-bearings').length} rolling bearing product(s).
                              </p>
                              <p className="text-sm text-gray-600">
                                This will remove all products in the Rolling Bearings category.
                              </p>
                            </div>
                          )}
                          <p className="text-sm text-red-600 mt-4 font-medium">
                            ⚠️ This action cannot be undone!
                          </p>
                        </div>
                      <DialogFooter className="gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsBulkDeleteDialogOpen(false);
                            setBulkDeleteAction(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={confirmBulkDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Yes, Delete {bulkDeleteAction === 'purge' ? 'All' :
                            `${products.filter(p => bulkDeleteAction && p.category === bulkDeleteAction).length}`}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Currency Management Tab */}
          <TabsContent value="currency">
            <Card>
              <CardHeader>
                <CardTitle>Currency Exchange Rates</CardTitle>
                <CardDescription>
                  Update and manage exchange rates for USD, JMD, and CAD currencies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingCurrencyRates ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    {/* Rate Source Preference */}
                    <div className="border-b pb-6">
                      <h3 className="text-lg font-semibold mb-4">Rate Source Preference</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Choose how the system fetches exchange rates for currency conversion:
                      </p>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="rateSource"
                            value="auto"
                            defaultChecked={true}
                            onClick={() => {
                              const { setRateSourcePreference } = require('../utils/currencyService');
                              setRateSourcePreference('auto');
                              toast.success('Rate source set to: Auto (prefer manual, fallback to API)');
                            }}
                            className="w-4 h-4 text-[#DC143C]"
                          />
                          <div>
                            <p className="font-medium">Auto (Recommended)</p>
                            <p className="text-xs text-gray-500">Use admin-configured rates first, then API</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="rateSource"
                            value="manual"
                            onClick={() => {
                              const { setRateSourcePreference } = require('../utils/currencyService');
                              setRateSourcePreference('manual');
                              toast.success('Rate source set to: Manual only');
                            }}
                            className="w-4 h-4 text-[#DC143C]"
                          />
                          <div>
                            <p className="font-medium">Manual Only</p>
                            <p className="text-xs text-gray-500">Use only admin-configured rates</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="rateSource"
                            value="api"
                            onClick={() => {
                              const { setRateSourcePreference } = require('../utils/currencyService');
                              setRateSourcePreference('api');
                              toast.success('Rate source set to: API only');
                            }}
                            className="w-4 h-4 text-[#DC143C]"
                          />
                          <div>
                            <p className="font-medium">API Only</p>
                            <p className="text-xs text-gray-500">Always use live API rates (exchangerate-api.com)</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Current Rates Table */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Current Exchange Rates</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader className="bg-gray-50">
                            <TableRow>
                              <TableHead>Currency</TableHead>
                              <TableHead>Symbol</TableHead>
                              <TableHead>Exchange Rate (vs USD)</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Last Updated</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">USD (US Dollar)</TableCell>
                              <TableCell>$</TableCell>
                              <TableCell>1.0000 (Base)</TableCell>
                              <TableCell className="text-xs"><Badge>system</Badge></TableCell>
                              <TableCell className="text-xs text-gray-500">-</TableCell>
                            </TableRow>
                            {currencyRates.map((rate) => (
                              <TableRow key={rate.currency}>
                                <TableCell className="font-medium">
                                  {rate.currency === 'JMD' ? 'JMD (Jamaican Dollar)' : 'CAD (Canadian Dollar)'}
                                </TableCell>
                                <TableCell>{rate.currency === 'JMD' ? 'J$' : 'C$'}</TableCell>
                                <TableCell>{rate.rate.toFixed(4)}</TableCell>
                                <TableCell className="text-xs">
                                  <Badge variant={rate.source === 'api' ? 'secondary' : 'outline'}>
                                    {rate.source}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-gray-500">
                                  {new Date(rate.updated_at).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Update Rates Form */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">Update Exchange Rates</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* JMD Rate */}
                        <div className="space-y-2">
                          <Label htmlFor="jmd-rate" className="text-base">
                            JMD Rate (Jamaican Dollar)
                          </Label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">1 USD =</span>
                            <Input
                              id="jmd-rate"
                              type="number"
                              step="0.0001"
                              placeholder="155.75"
                              value={currencyFormData.JMD}
                              onChange={(e) => setCurrencyFormData({...currencyFormData, JMD: e.target.value})}
                              disabled={isSavingCurrencyRates}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium">J$</span>
                          </div>
                          <p className="text-xs text-gray-500">Example: 155.75</p>
                        </div>

                        {/* CAD Rate */}
                        <div className="space-y-2">
                          <Label htmlFor="cad-rate" className="text-base">
                            CAD Rate (Canadian Dollar)
                          </Label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">1 USD =</span>
                            <Input
                              id="cad-rate"
                              type="number"
                              step="0.0001"
                              placeholder="1.35"
                              value={currencyFormData.CAD}
                              onChange={(e) => setCurrencyFormData({...currencyFormData, CAD: e.target.value})}
                              disabled={isSavingCurrencyRates}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium">C$</span>
                          </div>
                          <p className="text-xs text-gray-500">Example: 1.35</p>
                        </div>
                      </div>

                      {/* Info Alert */}
                      <Alert className="mt-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Note:</strong> USD is the base currency (rate = 1.0) and cannot be changed. 
                          Enter the exchange rate relative to 1 USD. For example, if 1 USD = 155.75 JMD, enter 155.75.
                        </AlertDescription>
                      </Alert>

                      {/* Save Button */}
                      <Button
                        onClick={async () => {
                          try {
                            const jmdRate = parseFloat(currencyFormData.JMD);
                            const cadRate = parseFloat(currencyFormData.CAD);

                            if (!jmdRate || jmdRate <= 0 || !cadRate || cadRate <= 0) {
                              toast.error('All rates must be positive numbers');
                              return;
                            }

                            setIsSavingCurrencyRates(true);
                            await currencyRatesService.updateRate('JMD', jmdRate, 'manual');
                            await currencyRatesService.updateRate('CAD', cadRate, 'manual');
                            
                            // Reload rates
                            const updatedRates = await currencyRatesService.getAllRatesWithMetadata();
                            setCurrencyRates(updatedRates);
                            
                            toast.success('Currency rates updated successfully');
                          } catch (error) {
                            console.error('Failed to update rates:', error);
                            toast.error('Failed to update currency rates');
                          } finally {
                            setIsSavingCurrencyRates(false);
                          }
                        }}
                        disabled={isSavingCurrencyRates || !currencyFormData.JMD || !currencyFormData.CAD}
                        className="bg-[#DC143C] hover:bg-[#B01030] mt-6"
                      >
                        {isSavingCurrencyRates ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Exchange Rates'
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <UserManagementPanel />
          </TabsContent>

          <TabsContent value="orders">
            <AdminOrdersPanel />
          </TabsContent>

          {/* Payment Settings Tab */}
          <TabsContent value="payment-settings">
            <Card>
              <CardHeader>
                <CardTitle>Payment Settings</CardTitle>
                <CardDescription>
                  Manage payment configuration and stored gateway credentials
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPaymentSettings ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading payment settings...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="text-base font-medium">Enable Payment Gateway</Label>
                        <p className="text-sm text-gray-500 mt-1">
                          Toggle payment gateway on/off
                        </p>
                      </div>
                      <Switch
                        checked={paymentFormData.is_enabled}
                        onCheckedChange={(checked) =>
                          setPaymentFormData({ ...paymentFormData, is_enabled: checked })
                        }
                      />
                    </div>

                    {/* Gateway Credentials */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Gateway Credentials</h3>

                      <div className="space-y-2">
                        <Label htmlFor="merchant_id">Merchant ID *</Label>
                        <Input
                          id="merchant_id"
                          type="text"
                          placeholder="Enter your merchant ID"
                          value={paymentFormData.merchant_id}
                          onChange={(e) =>
                            setPaymentFormData({ ...paymentFormData, merchant_id: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="secret_key">Secret Key *</Label>
                        <Input
                          id="secret_key"
                          type="password"
                          placeholder="Enter your secret key"
                          value={paymentFormData.secret_key}
                          onChange={(e) =>
                            setPaymentFormData({ ...paymentFormData, secret_key: e.target.value })
                          }
                        />
                        <p className="text-xs text-gray-500">
                          Your secret key is encrypted and stored securely
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="client_key">Client Key *</Label>
                        <Input
                          id="client_key"
                          type="password"
                          placeholder="Enter your client key"
                          value={paymentFormData.client_key}
                          onChange={(e) =>
                            setPaymentFormData({ ...paymentFormData, client_key: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    {/* Environment Selection */}
                    <div className="space-y-2">
                      <Label>Environment</Label>
                      <Select
                        value={paymentFormData.environment}
                        onValueChange={(value: 'sandbox' | 'production') =>
                          setPaymentFormData({ ...paymentFormData, environment: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                          <SelectItem value="production">Production (Live)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Use Sandbox for testing, Production for live transactions
                      </p>
                    </div>

                    {/* Fee Handling */}
                    <div className="space-y-2">
                      <Label>Platform Fee Handling</Label>
                      <Select
                        value={paymentFormData.fee_handling}
                        onValueChange={(value: 'merchant' | 'customer') =>
                          setPaymentFormData({ ...paymentFormData, fee_handling: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="merchant">Merchant Absorbs Fees</SelectItem>
                          <SelectItem value="customer">Customer Pays Fees</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        {paymentFormData.fee_handling === 'merchant'
                          ? 'Platform fees will be deducted from your payment'
                          : 'Platform fees will be added to the customer\'s total'}
                      </p>
                    </div>

                    {/* Platform Fee Percentage */}
                    <div className="space-y-2">
                      <Label htmlFor="fee_percentage">Platform Fee Percentage (%)</Label>
                      <Input
                        id="fee_percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="2.90"
                        value={paymentFormData.platform_fee_percentage}
                        onChange={(e) =>
                          setPaymentFormData({
                            ...paymentFormData,
                            platform_fee_percentage: e.target.value,
                          })
                        }
                      />
                      <p className="text-xs text-gray-500">
                        Default: 2.90% (standard payment processing fee)
                      </p>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end gap-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (paymentSettings) {
                            setPaymentFormData({
                              merchant_id: paymentSettings.merchant_id || '',
                              secret_key: paymentSettings.secret_key || '',
                              client_key: paymentSettings.client_key || '',
                              environment: paymentSettings.environment,
                              fee_handling: paymentSettings.fee_handling,
                              platform_fee_percentage: paymentSettings.platform_fee_percentage.toString(),
                              is_enabled: paymentSettings.is_enabled,
                            });
                          }
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        onClick={async () => {
                          if (
                            !paymentFormData.merchant_id ||
                            !paymentFormData.secret_key ||
                            !paymentFormData.client_key
                          ) {
                            toast.error('Please fill in all required fields');
                            return;
                          }

                          setIsSavingPaymentSettings(true);
                          try {
                            await paymentGatewayService.updateSettings({
                              merchant_id: paymentFormData.merchant_id,
                              secret_key: paymentFormData.secret_key,
                              client_key: paymentFormData.client_key,
                              environment: paymentFormData.environment,
                              fee_handling: paymentFormData.fee_handling,
                              platform_fee_percentage: parseFloat(paymentFormData.platform_fee_percentage),
                              is_enabled: paymentFormData.is_enabled,
                            });

                            // Reload settings
                            const updated = await paymentGatewayService.getSettings();
                            if (updated) {
                              setPaymentSettings(updated);
                            }

                            toast.success('Payment settings saved successfully!');
                          } catch (error) {
                            console.error('Error saving payment settings:', error);
                            toast.error('Failed to save payment settings');
                          } finally {
                            setIsSavingPaymentSettings(false);
                          }
                        }}
                        disabled={isSavingPaymentSettings}
                      >
                        {isSavingPaymentSettings ? 'Saving...' : 'Save Settings'}
                      </Button>
                    </div>

                    {/* Status Indicator */}
                    {paymentFormData.is_enabled &&
                      paymentFormData.merchant_id &&
                      paymentFormData.secret_key &&
                      paymentFormData.client_key && (
                        <Alert>
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertDescription>
                            Payment gateway is configured and enabled. Using{' '}
                            <strong>{paymentFormData.environment}</strong> environment.
                          </AlertDescription>
                        </Alert>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications-settings">
            <Card>
              <CardHeader>
                <CardTitle>Order Completion Notifications</CardTitle>
                <CardDescription>
                  Configure admin recipients and route supplier emails by category and subcategory.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingNotificationSettings ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading notification settings...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="text-base font-medium">Enable Order Notifications</Label>
                        <p className="text-sm text-gray-500 mt-1">
                          Send notification emails to admins and matched suppliers when an order is completed.
                        </p>
                      </div>
                      <Switch
                        checked={notificationFormData.notifications_enabled}
                        onCheckedChange={(checked) =>
                          setNotificationFormData({ ...notificationFormData, notifications_enabled: checked })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="admin_notification_emails">Admin Recipient Emails</Label>
                      <Textarea
                        id="admin_notification_emails"
                        placeholder="one@example.com&#10;two@example.com"
                        value={notificationFormData.admin_emails}
                        onChange={(e) =>
                          setNotificationFormData({
                            ...notificationFormData,
                            admin_emails: e.target.value,
                          })
                        }
                        rows={4}
                      />
                      <p className="text-xs text-gray-500">
                        Enter one email per line. These recipients receive every completed order notification.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">Supplier Routes</h3>
                          <p className="text-sm text-gray-500">
                            Match supplier emails to the product category or subcategory they should be notified about.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setSupplierRoutes([
                              ...supplierRoutes,
                              {
                                id: `new-${Date.now()}`,
                                email: '',
                                category_id: categoryOptions[0]?.id || '',
                                subcategory_id: '',
                                is_enabled: true,
                              },
                            ])
                          }
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Supplier
                        </Button>
                      </div>

                      {supplierRoutes.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">
                          No supplier notification routes configured yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {supplierRoutes.map((route) => {
                            const subcategoryOptions = subcategoryOptionsByCategory[route.category_id] || [];

                            return (
                              <div key={route.id} className="rounded-lg border p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                  <Label className="text-base font-medium">Supplier Notification Route</Label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() =>
                                      setSupplierRoutes(supplierRoutes.filter((supplierRoute) => supplierRoute.id !== route.id))
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove
                                  </Button>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                      type="email"
                                      placeholder="supplier@example.com"
                                      value={route.email}
                                      onChange={(e) =>
                                        setSupplierRoutes(
                                          supplierRoutes.map((supplierRoute) =>
                                            supplierRoute.id === route.id
                                              ? { ...supplierRoute, email: e.target.value }
                                              : supplierRoute
                                          )
                                        )
                                      }
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select
                                      value={route.category_id}
                                      onValueChange={(value) =>
                                        setSupplierRoutes(
                                          supplierRoutes.map((supplierRoute) =>
                                            supplierRoute.id === route.id
                                              ? {
                                                  ...supplierRoute,
                                                  category_id: value,
                                                  subcategory_id: '',
                                                }
                                              : supplierRoute
                                          )
                                        )
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {categoryOptions.map((option) => (
                                          <SelectItem key={option.id} value={option.id}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Subcategory</Label>
                                    <Select
                                      value={route.subcategory_id || '__all__'}
                                      onValueChange={(value) =>
                                        setSupplierRoutes(
                                          supplierRoutes.map((supplierRoute) =>
                                            supplierRoute.id === route.id
                                              ? {
                                                  ...supplierRoute,
                                                  subcategory_id: value === '__all__' ? '' : value,
                                                }
                                              : supplierRoute
                                          )
                                        )
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="All subcategories" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__all__">All subcategories</SelectItem>
                                        {subcategoryOptions.map((subcategoryId) => (
                                          <SelectItem key={subcategoryId} value={subcategoryId}>
                                            {subcategoryId}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <Label className="font-medium">Route Enabled</Label>
                                    <p className="text-xs text-gray-500">Disabled routes will be ignored during notification dispatch.</p>
                                  </div>
                                  <Switch
                                    checked={route.is_enabled}
                                    onCheckedChange={(checked) =>
                                      setSupplierRoutes(
                                        supplierRoutes.map((supplierRoute) =>
                                          supplierRoute.id === route.id
                                            ? { ...supplierRoute, is_enabled: checked }
                                            : supplierRoute
                                        )
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNotificationFormData({
                            notifications_enabled: notificationSettings?.notifications_enabled || false,
                            admin_emails: (notificationSettings?.admin_emails || []).join('\n'),
                          });
                          orderNotificationSettingsService.getSupplierRoutes().then((routes) => {
                            setSupplierRoutes(
                              routes.map((route) => ({
                                id: route.id,
                                email: route.email,
                                category_id: route.category_id,
                                subcategory_id: route.subcategory_id || '',
                                is_enabled: route.is_enabled,
                              }))
                            );
                          });
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        onClick={async () => {
                          const adminEmails = notificationFormData.admin_emails
                            .split(/[\n,]+/)
                            .map((email) => email.trim())
                            .filter(Boolean);

                          const invalidSupplierRoute = supplierRoutes.find(
                            (route) => route.email.trim() === '' || route.category_id.trim() === ''
                          );

                          if (invalidSupplierRoute) {
                            toast.error('Each supplier route needs an email and category');
                            return;
                          }

                          setIsSavingNotificationSettings(true);
                          try {
                            const updatedSettings = await orderNotificationSettingsService.saveSettings({
                              notifications_enabled: notificationFormData.notifications_enabled,
                              admin_emails: adminEmails,
                            });

                            await orderNotificationSettingsService.replaceSupplierRoutes(
                              supplierRoutes.map((route) => ({
                                email: route.email.trim(),
                                category_id: route.category_id,
                                subcategory_id: route.subcategory_id || null,
                                is_enabled: route.is_enabled,
                              }))
                            );

                            const updatedRoutes = await orderNotificationSettingsService.getSupplierRoutes();
                            setNotificationSettings(updatedSettings);
                            setSupplierRoutes(
                              updatedRoutes.map((route) => ({
                                id: route.id,
                                email: route.email,
                                category_id: route.category_id,
                                subcategory_id: route.subcategory_id || '',
                                is_enabled: route.is_enabled,
                              }))
                            );

                            toast.success('Notification settings saved successfully!');
                          } catch (error) {
                            console.error('Error saving notification settings:', error);
                            toast.error('Failed to save notification settings');
                          } finally {
                            setIsSavingNotificationSettings(false);
                          }
                        }}
                        disabled={isSavingNotificationSettings}
                      >
                        {isSavingNotificationSettings ? 'Saving...' : 'Save Notifications'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
