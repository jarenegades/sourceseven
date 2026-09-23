import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ProductCard, Product } from './components/ProductCard';
import { LoginDialog } from './components/LoginDialog';
import { AboutPage } from './components/AboutPage';
import { BlogPage } from './components/BlogPage';
import { ContactPage } from './components/ContactPage';
import { CartPage } from './components/CartPage';
import { CheckoutPage } from './components/CheckoutPage';
import { FeaturedSection } from './components/FeaturedSection';
import { CategoryBrowser, PRODUCT_CATEGORIES } from './components/CategoryBrowser';
import { CategoryBreadcrumb } from './components/CategoryBreadcrumb';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsConditionsPage } from './components/TermsConditionsPage';
import { ReturnPolicyPage } from './components/ReturnPolicyPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { OrdersPage } from './components/OrdersPage';
import { WishlistPage } from './components/WishlistPage';
import { AccountPage } from './components/AccountPage';
import { MfaSessionGate } from './components/MfaSessionGate';
import { AdminPage } from './components/AdminPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { Dialog, DialogContent, DialogTitle } from './components/ui/dialog';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { productsService } from './utils/productsService';
import { cartService, CartItem } from './utils/cartService';
import { wishlistService, WishlistItem } from './utils/wishlistService';
import { config } from './utils/config';
import { Currency, getUserCurrency, setUserCurrency, convertCurrency, formatCurrency, updateExchangeRates } from './utils/currencyService';
import { authService } from './utils/authService';
import type { ProductCategoryFilter, ProductCategoryId } from './utils/categoryIds';

// Unused image imports - kept for reference only
/* 
import benadrylImage from 'figma:asset/f5fcd53fa40e8e1ada6fc6ba6cdf6cf4c0b3b67e.png';
import benadrylTabletsImage from 'figma:asset/aad74bcf3080943c101c2cefe49a6919d71529cc.png';
import dayquilImage from 'figma:asset/6d0559379d9c2c4facdbb9679dab6a38b661b49a.png';
import dayquilLiquicapsImage from 'figma:asset/1274f8cffa84f62263f79c12f8a14e66756c4c6d.png';
import dayquil8ozImage from 'figma:asset/eeb07de085674ec82934af1339dc7e684d737784.png';
import nyquilGreenImage from 'figma:asset/120245a748c6e9c1f57b7f4588019a9f7a3038cc.png';
import nyquilRedImage from 'figma:asset/6b6764bf08e820b8b61d7e58d3d8142f0f1790dd.png';
import robitussinImage from 'figma:asset/b9594807f77ec5a8ec8ae727f457cabb611df519.png';
import therafluImage from 'figma:asset/e9b68023a5c48f326a40775d2b6b9ba300bd66c2.png';
import therafluOrangeImage from 'figma:asset/03d77e5e58ab613f4c41160cecd311d27b98b894.png';
import tylenolChildrenImage from 'figma:asset/407864ea57f3cc5592dbb53cbb83014b2360ce0b.png';
import benadrylChildrenImage from 'figma:asset/b0b213ee753d620ff0fbb6436dfa4bd51c5cb8b0.png';
import babyJeansImage from 'figma:asset/1ca322440c531606319c7a60caf219e16a7a423a.png';
import babyJeans2Image from 'figma:asset/937982d33adc5b3bdb9a98fef136fa424c6a06c0.png';
import babyBoySetImage from 'figma:asset/90c52f96c23487df2e1920efd61340a77e7774ef.png';
import babyPoloTopImage from 'figma:asset/f9612a4a2f847a83c97f026a6addc24e1ec064f2.png';
import girlShortsImage from 'figma:asset/b938a16a6d13c2ec8be3083fe34a02eb3a81afb2.png';
import girlSetsImage from 'figma:asset/ce88cf0e8ae3904dc3824211cb2b3ee3f0b5660e.png';
import girlJeansShortsImage from 'figma:asset/635b35ac7f63702daafda43da1d72d6507cdbcaf.png';
import girlDressImage from 'figma:asset/974f52e7f6a3d171bc315f35d9bf968d55106b58.png';
import babyBoyShortsImage from 'figma:asset/93e311d341a7c58921f604eb2dee331012bab249.png';
import babyBoyShirtImage from 'figma:asset/71e60a7df11f5c5e9d9fd1d2e0e7a0df7eb6e55d.png';
*/

// App Content Component (contains the main app logic)
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [_userEmail, setUserEmail] = useState<string>('');
  const [userFirstName, setUserFirstName] = useState<string>('');
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showCategoryBrowser, setShowCategoryBrowser] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bestSellerProducts, setBestSellerProducts] = useState<Product[]>([]);
  const [onSaleProducts, setOnSaleProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategoryFilter>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [selectedCurrency, setSelectedCurrencyState] = useState<Currency>(getUserCurrency());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // Sort State
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'rating'>('newest');
  const wishlistProductIds = useMemo(
    () => new Set(wishlistItems.map((item) => item.product_id)),
    [wishlistItems]
  );

  // Handle currency change
  const handleCurrencyChange = (currency: Currency) => {
    setUserCurrency(currency);
    setSelectedCurrencyState(currency);
  };

  // Initialize exchange rates on app load
  useEffect(() => {
    updateExchangeRates().catch(console.error);
  }, []);

  // Check for existing auth session on mount and listen for changes
  useEffect(() => {
    const checkSession = async () => {
      if (!config.useSupabase && !config.useNeonAuth) return;

      const user = await authService.getCurrentUser();
      if (user) {
        setIsLoggedIn(true);
        setUserEmail(user.email || '');
        setUserFirstName(user.user_metadata?.first_name || '');
        setIsAdmin(await authService.isAdmin());
      }
    };

    checkSession();

    // Listen for auth state changes
    const subscription = authService.onAuthStateChange(async (user) => {
      if (user) {
        setIsLoggedIn(true);
        setUserEmail(user.email || '');
        setUserFirstName(user.user_metadata?.first_name || '');
        setIsAdmin(await authService.isAdmin());
        setShowLoginDialog(false);
        toast.success(`Welcome back${user.user_metadata?.first_name ? `, ${user.user_metadata.first_name}` : ''}!`);
      } else {
        setIsLoggedIn(false);
        setUserEmail('');
        setUserFirstName('');
        setIsAdmin(false);
        // Clear cart and wishlist on sign out
        setCartItems([]);
        setWishlistItems([]);
        toast.success('Signed out successfully');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load products when filters or pagination change
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setProductsLoaded(false);
        const { products: loadedProducts, count } = await productsService.getProducts({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          category: selectedCategory,
          categoryId: selectedCategoryId || undefined,
          subcategoryId: selectedSubcategoryId || undefined,
          search: searchQuery,
          sortBy: sortBy
        });

        setProducts(loadedProducts);
        setTotalProducts(count);
        setProductsLoaded(true);
      } catch (error: any) {
        console.error('Failed to load products:', error);
        // If it's a network error, show empty state but don't show error toast
        if (error.message?.includes('Failed to fetch') ||
          error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          console.warn('⚠️ Network error: Cannot reach Supabase. App will work in offline mode.');
          setProducts([]); // Set empty products array
        }
        setProductsLoaded(true); // Still set to true to show empty state
      }
    };

    const timeoutId = setTimeout(() => {
      loadProducts();
    }, 300); // Debounce to prevent rapid firing

    return () => clearTimeout(timeoutId);
  }, [currentPage, selectedCategory, selectedCategoryId, selectedSubcategoryId, searchQuery, sortBy]);

  // Load all bestseller and on-sale products (not paginated)
  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        const allProducts = await productsService.getAll();
        const bestSellers = allProducts.filter(p => p.badge === 'Best Seller');
        const onSale = allProducts.filter(p => p.originalPrice && p.originalPrice > 0);
        setBestSellerProducts(bestSellers);
        setOnSaleProducts(onSale);
      } catch (error) {
        console.error('Failed to load featured products:', error);
        setBestSellerProducts([]);
        setOnSaleProducts([]);
      }
    };

    loadFeaturedProducts();
  }, []);

  // Load cart and wishlist on login
  useEffect(() => {
    if (isLoggedIn) {
      const loadUserData = async () => {
        try {
          const user = await authService.getCurrentUser();
          if (user) {
            // Load cart
            const cartData = await cartService.getAll(user.id);
            setCartItems(cartData);

            // Load wishlist
            const wishlistData = await wishlistService.getAll(user.id);
            setWishlistItems(wishlistData);
          }
        } catch (error) {
          console.error('Failed to load user data:', error);
        }
      };

      loadUserData();
    } else {
      setCartItems([]);
      setWishlistItems([]);
    }
  }, [isLoggedIn]);

  // Navigation handler
  const handleNavigate = (page: string) => {
    if (page === 'home') {
      navigate('/');
    } else {
      navigate(`/${page}`);
    }
  };

  // Handle login prompt
  const handleLoginPrompt = () => {
    setShowLoginDialog(true);
  };

  // Handle category change
  const handleCategoryChange = (category: ProductCategoryFilter) => {
    setSelectedCategory(category);
    setSelectedCategoryId(null);
    setSelectedSubcategoryId(null);
    setSearchQuery('');
    setCurrentPage(1); // Reset to first page
    navigate('/');
  };

  // Handle search
  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    setSelectedCategory('all');
    setSelectedCategoryId(null);
    setSelectedSubcategoryId(null);
    setCurrentPage(1); // Reset to first page
  };

  // Handle product click
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    navigate(`/product/${product.id}`);
  };

  // Handle add to cart
  const handleAddToCart = async (product: Product, quantity: number = 1) => {
    if (!isLoggedIn) {
      handleLoginPrompt();
      return;
    }

    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      await cartService.addItem(user.id, product.id, quantity);
      // Reload cart to get updated data
      const cartData = await cartService.getAll(user.id);
      setCartItems(cartData);
      toast.success(`${product.name} added to cart`);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  // Handle remove from cart
  const handleRemoveFromCart = async (cartItemId: string) => {
    try {
      await cartService.removeItem(cartItemId);
      // Reload cart to get updated data
      const user = await authService.getCurrentUser();
      if (user) {
        const cartData = await cartService.getAll(user.id);
        setCartItems(cartData);
      }
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      toast.error('Failed to remove item from cart');
    }
  };

  // Handle update cart quantity
  const handleUpdateCartQuantity = async (cartItemId: string, quantity: number) => {
    try {
      await cartService.updateQuantity(cartItemId, quantity);
      // Reload cart to get updated data
      const user = await authService.getCurrentUser();
      if (user) {
        const cartData = await cartService.getAll(user.id);
        setCartItems(cartData);
      }
    } catch (error) {
      console.error('Failed to update cart quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  const isProductInWishlist = (productId: string) => wishlistProductIds.has(productId);

  // Handle add/remove wishlist from product cards and detail page
  const handleToggleWishlist = async (product: Product) => {
    if (!isLoggedIn) {
      handleLoginPrompt();
      return;
    }

    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      if (wishlistProductIds.has(product.id)) {
        await wishlistService.removeByProductId(user.id, product.id);
        toast.success(`${product.name} removed from wishlist`);
      } else {
        await wishlistService.addItem(user.id, product.id);
        toast.success(`${product.name} added to wishlist`);
      }

      const wishlistData = await wishlistService.getAll(user.id);
      setWishlistItems(wishlistData);
    } catch (error) {
      console.error('Failed to update wishlist:', error);
      toast.error('Failed to update wishlist');
    }
  };

  // Handle remove from wishlist
  const handleRemoveFromWishlist = async (wishlistItemId: string) => {
    try {
      await wishlistService.removeItem(wishlistItemId);
      // Reload wishlist to get updated data
      const user = await authService.getCurrentUser();
      if (user) {
        const wishlistData = await wishlistService.getAll(user.id);
        setWishlistItems(wishlistData);
      }
      toast.success('Item removed from wishlist');
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      toast.error('Failed to remove item from wishlist');
    }
  };

  // Handle checkout
  const handleCheckout = () => {
    if (!isLoggedIn) {
      handleLoginPrompt();
      return;
    }
    navigate('/checkout');
  };

  // No client-side filtering needed anymore
  const filteredProducts = products;

  // Calculate cart total
  const cartTotal = cartItems.reduce((total, item) => {
    if (item.product) {
      return total + (item.product.price * item.quantity);
    }
    return total;
  }, 0);
  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <>
      <Header
        isLoggedIn={isLoggedIn}
        userFirstName={userFirstName}
        cartCount={cartItemCount}
        onLoginClick={handleLoginPrompt}
        onLogout={async () => {
          await authService.signOut();
        }}
        selectedCategory={selectedCategory}
        onCategoryChange={(category) => handleCategoryChange(category as ProductCategoryFilter)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        currentPage={location.pathname}
        onNavigate={handleNavigate as any}
        onOpenCategoryBrowser={() => setShowCategoryBrowser(true)}
        selectedCurrency={selectedCurrency}
        onCurrencyChange={handleCurrencyChange}
      />

      <Routes>
        <Route path="/" element={
          <div className="max-w-[1500px] mx-auto px-4 py-6">
            <CategoryBreadcrumb
              selectedCategory={selectedCategory}
              selectedCategoryId={selectedCategoryId}
              selectedSubcategoryId={selectedSubcategoryId}
              onNavigate={(category, categoryId, subcategoryId) => {
                setSelectedCategory(category);
                setSelectedCategoryId(categoryId || null);
                setSelectedSubcategoryId(subcategoryId || null);
                setSearchQuery('');
                setCurrentPage(1); // Reset to first page
              }}
            />

            {/* Show featured sections only if no filters are active */}
            {selectedCategory === 'all' && !selectedCategoryId && !selectedSubcategoryId && !searchQuery && (
              <FeaturedSection
                bestsellers={bestSellerProducts}
                onSaleItems={onSaleProducts}
                isLoggedIn={isLoggedIn}
                selectedCurrency={selectedCurrency}
                isInWishlist={isProductInWishlist}
                onAddToCart={(productId) => {
                  const product = bestSellerProducts.find(p => p.id === productId) || onSaleProducts.find(p => p.id === productId) || products.find(p => p.id === productId);
                  if (product) handleAddToCart(product);
                }}
                onToggleWishlist={(productId) => {
                  const product = bestSellerProducts.find(p => p.id === productId) || onSaleProducts.find(p => p.id === productId) || products.find(p => p.id === productId);
                  if (product) handleToggleWishlist(product);
                }}
                onLoginPrompt={handleLoginPrompt}
                onProductClick={(productId) => {
                  const product = bestSellerProducts.find(p => p.id === productId) || onSaleProducts.find(p => p.id === productId) || products.find(p => p.id === productId);
                  if (product) handleProductClick(product);
                }}
              />
            )}

            {/* All Products Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[#003366] text-xl font-semibold">
                    {searchQuery ? `Search Results for "${searchQuery}"` :
                      selectedCategoryId || selectedSubcategoryId ? 'Filtered Products' :
                        selectedCategory === 'all' ? 'All Products' :
                          selectedCategory === 'mounted-linear-units' ? 'Mounted & Linear Units' :
                            'Rolling Bearings'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {totalProducts} {totalProducts === 1 ? 'product' : 'products'} found
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as 'newest' | 'price-low' | 'price-high' | 'rating');
                      setCurrentPage(1); // Reset to first page on sort change
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0055AA]"
                  >
                    <option value="newest">Newest</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Rating</option>
                  </select>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No products found</p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-4 text-[#0055AA] hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isLoggedIn={isLoggedIn}
                      onAddToCart={(productId) => {
                        const product = products.find(p => p.id === productId);
                        if (product) handleAddToCart(product);
                      }}
                      onLoginPrompt={handleLoginPrompt}
                      onProductClick={(productId) => {
                        const product = products.find(p => p.id === productId);
                        if (product) handleProductClick(product);
                      }}
                      isInWishlist={isProductInWishlist(product.id)}
                      onToggleWishlist={(productId) => {
                        const product = products.find(p => p.id === productId);
                        if (product) handleToggleWishlist(product);
                      }}
                      selectedCurrency={selectedCurrency}
                    />
                  ))}
                </div>
              )}


              {/* Pagination Controls */}
              {totalProducts > ITEMS_PER_PAGE && (
                <div className="flex justify-center items-center gap-2 mt-8 py-4 border-t border-gray-100">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {Math.ceil(totalProducts / ITEMS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= Math.ceil(totalProducts / ITEMS_PER_PAGE)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        } />

        <Route path="/about" element={<AboutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsConditionsPage />} />
        <Route path="/returns" element={<ReturnPolicyPage />} />

        <Route path="/cart" element={
          <CartPage
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveFromCart}
            onCheckout={handleCheckout}
            selectedCurrency={selectedCurrency}
          />
        } />

        <Route path="/checkout" element={
          <CheckoutPage
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveFromCart}
            selectedCurrency={selectedCurrency}
            onOrderComplete={async () => {
              setCartItems([]);
              navigate('/orders');
            }}
          />
        } />

        <Route path="/product/:id" element={
          <ProductDetailPage
            product={selectedProduct}
            isLoggedIn={isLoggedIn}
            onAddToCart={(productId) => {
              const product = products.find(p => p.id === productId);
              if (product) handleAddToCart(product);
            }}
            onBuyNow={(productId) => {
              const product = products.find(p => p.id === productId);
              if (product) {
                handleAddToCart(product);
                navigate('/checkout');
              }
            }}
            onToggleWishlist={handleToggleWishlist}
            isInWishlist={isProductInWishlist}
            onBack={() => navigate(-1)}
            onLoginPrompt={handleLoginPrompt}
            selectedCurrency={selectedCurrency}
          />
        } />

        <Route path="/orders" element={
          isLoggedIn ? (
            <OrdersPage onProductClick={(productId) => {
              const product = products.find(p => p.id === productId);
              if (product) handleProductClick(product);
            }} />
          ) : (
            <div className="max-w-[1200px] mx-auto px-4 py-8">
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <h2 className="text-[#003366] mb-2">Sign in to view your orders</h2>
                <p className="text-gray-600 mb-6">You must be signed in to access this page</p>
                <button
                  onClick={handleLoginPrompt}
                  className="bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900 px-6 py-2 rounded transition-colors"
                >
                  Sign In
                </button>
              </div>
            </div>
          )
        } />

        <Route path="/wishlist" element={
          isLoggedIn ? (
            <WishlistPage
              wishlistItems={wishlistItems}
              onRemoveFromWishlist={handleRemoveFromWishlist}
              onAddToCart={handleAddToCart}
              onProductClick={handleProductClick}
            />
          ) : (
            <div className="max-w-[1200px] mx-auto px-4 py-8">
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <h2 className="text-[#003366] mb-2">Sign in to view your wishlist</h2>
                <p className="text-gray-600 mb-6">You must be signed in to access this page</p>
                <button
                  onClick={handleLoginPrompt}
                  className="bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900 px-6 py-2 rounded transition-colors"
                >
                  Sign In
                </button>
              </div>
            </div>
          )
        } />

        <Route path="/account" element={
          isLoggedIn ? (
            <AccountPage
              onNavigateToOrders={() => navigate('/orders')}
              onNavigateToWishlist={() => navigate('/wishlist')}
              isAdmin={isAdmin}
              onNavigateToAdmin={() => navigate('/admin')}
            />
          ) : (
            <div className="max-w-[1200px] mx-auto px-4 py-8">
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <h2 className="text-[#003366] mb-2">Sign in to view your account</h2>
                <p className="text-gray-600 mb-6">You must be signed in to access this page</p>
                <button
                  onClick={handleLoginPrompt}
                  className="bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900 px-6 py-2 rounded transition-colors"
                >
                  Sign In
                </button>
              </div>
            </div>
          )
        } />

        <Route path="/admin" element={
          isLoggedIn && isAdmin ? (
            <AdminPage
              products={products}
              onAddProduct={async (product) => {
                try {
                  await productsService.create(product);
                  // Reload products
                  const { products: loadedProducts, count } = await productsService.getProducts({
                    page: currentPage,
                    limit: ITEMS_PER_PAGE,
                    category: selectedCategory,
                    categoryId: selectedCategoryId || undefined,
                    subcategoryId: selectedSubcategoryId || undefined,
                    search: searchQuery
                  });
                  setProducts(loadedProducts);
                  setTotalProducts(count);
                } catch (error) {
                  console.error('Failed to add product:', error);
                  throw error;
                }
              }}
              onBulkImport={async (productsToImport) => {
                try {
                  const count = await productsService.bulkImport(productsToImport);
                  // Reload products
                  const { products: loadedProducts, count: totalCount } = await productsService.getProducts({
                    page: currentPage,
                    limit: ITEMS_PER_PAGE,
                    category: selectedCategory,
                    categoryId: selectedCategoryId || undefined,
                    subcategoryId: selectedSubcategoryId || undefined,
                    search: searchQuery
                  });
                  setProducts(loadedProducts);
                  setTotalProducts(totalCount);
                  return count;
                } catch (error) {
                  console.error('Failed to bulk import products:', error);
                  toast.error('Failed to bulk import products');
                  throw error;
                }
              }}
              onUpdateProduct={async (id, updates) => {
                try {
                  await productsService.update(id, updates);
                  // Reload products
                  const { products: loadedProducts, count } = await productsService.getProducts({
                    page: currentPage,
                    limit: ITEMS_PER_PAGE,
                    category: selectedCategory,
                    categoryId: selectedCategoryId || undefined,
                    subcategoryId: selectedSubcategoryId || undefined,
                    search: searchQuery
                  });
                  setProducts(loadedProducts);
                  setTotalProducts(count);

                  // Reload featured products after update
                  const allProducts = await productsService.getAll();
                  const bestSellers = allProducts.filter(p => p.badge === 'Best Seller');
                  const onSale = allProducts.filter(p => p.originalPrice && p.originalPrice > 0);
                  setBestSellerProducts(bestSellers);
                  setOnSaleProducts(onSale);

                } catch (error) {
                  console.error('Failed to update product:', error);
                  throw error;
                }
              }}
              onDeleteProduct={async (id) => {
                try {
                  await productsService.delete(id);
                  // Reload products
                  const { products: loadedProducts, count } = await productsService.getProducts({
                    page: currentPage,
                    limit: ITEMS_PER_PAGE,
                    category: selectedCategory,
                    categoryId: selectedCategoryId || undefined,
                    subcategoryId: selectedSubcategoryId || undefined,
                    search: searchQuery
                  });
                  setProducts(loadedProducts);
                  setTotalProducts(count);

                  // Reload featured products after delete
                  const allProducts = await productsService.getAll();
                  const bestSellers = allProducts.filter(p => p.badge === 'Best Seller');
                  const onSale = allProducts.filter(p => p.originalPrice && p.originalPrice > 0);
                  setBestSellerProducts(bestSellers);
                  setOnSaleProducts(onSale);

                } catch (error) {
                  console.error('Failed to delete product:', error);
                  throw error;
                }
              }}
              onCreateSale={async (productId, discountPercent) => {
                try {
                  // Load product directly from database instead of searching in current page
                  const product = await productsService.getById(productId);
                  if (!product) {
                    toast.error('Product not found');
                    return;
                  }
                  const newPrice = product.price * (1 - discountPercent / 100);
                  await productsService.update(productId, {
                    price: newPrice,
                    originalPrice: product.price
                  });

                  // Reload all product data
                  // 1. Reload current page products
                  const { products: loadedProducts, count } = await productsService.getProducts({
                    page: currentPage,
                    limit: ITEMS_PER_PAGE,
                    category: selectedCategory,
                    categoryId: selectedCategoryId || undefined,
                    subcategoryId: selectedSubcategoryId || undefined,
                    search: searchQuery
                  });
                  setProducts(loadedProducts);
                  setTotalProducts(count);

                  // 2. Reload all products for admin and featured sections
                  const allProducts = await productsService.getAll();
                  const bestSellers = allProducts.filter(p => p.badge === 'Best Seller');
                  const onSale = allProducts.filter(p => p.originalPrice && p.originalPrice > 0);
                  setBestSellerProducts(bestSellers);
                  setOnSaleProducts(onSale);

                  toast.success(`Sale applied: ${discountPercent}% off`);
                } catch (error) {
                  console.error('Failed to create sale:', error);
                  toast.error('Failed to create sale');
                }
              }}
            />
          ) : (
            <div className="max-w-[1200px] mx-auto px-4 py-8">
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <h2 className="text-[#003366] mb-2">Access Denied</h2>
                <p className="text-gray-600 mb-6">You must be an admin to access this page</p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900 px-6 py-2 rounded transition-colors"
                >
                  Go Home
                </button>
              </div>
            </div>
          )
        } />

        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes >

      {/* Login Dialog */}
      < LoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onLogin={(email, isAdmin) => {
          // Login is handled by auth state change listener
          console.log('Login successful:', email, isAdmin);
        }
        }
      />

      {/* Category Browser Dialog */}
      <Dialog open={showCategoryBrowser} onOpenChange={setShowCategoryBrowser}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogTitle>Shop by Category</DialogTitle>
          <CategoryBrowser
            onCategorySelect={(departmentId, categoryId, subcategoryId) => {
              setSelectedCategory(departmentId as ProductCategoryFilter);
              setSelectedCategoryId(categoryId || null);
              setSelectedSubcategoryId(subcategoryId || null);
              setShowCategoryBrowser(false);
            }}
            onClose={() => setShowCategoryBrowser(false)}
          />
        </DialogContent>
      </Dialog>

      <Toaster />
      <MfaSessionGate loggedIn={isLoggedIn} />
      <Footer onNavigate={(page) => {
        if (page === 'home' || page === '/') {
          navigate('/');
        } else if (page.startsWith('/')) {
          navigate(page);
        } else {
          // For internal page identifiers
          if (page === 'cart' || page === 'about' || page === 'contact' || page === 'orders' || page === 'wishlist' || page === 'account') {
            navigate(`/${page === 'home' ? '' : page}`);
          } else {
            navigate(`/${page}`);
          }
        }
      }} />
    </>
  );
}

// Main App Component with Router
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
