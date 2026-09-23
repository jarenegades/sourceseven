import { Search, ShoppingCart, User, ChevronDown, Menu } from 'lucide-react';
import { Currency, CURRENCY_INFO, getUserCurrency, setUserCurrency } from '../utils/currencyService';
import type { ProductCategoryFilter } from '../utils/categoryIds';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
const logoImage = '/source-7-logo-navy.png';

interface HeaderProps {
  isLoggedIn: boolean;
  userFirstName?: string;
  onLoginClick: () => void;
  onLogout: () => void;
  cartCount: number;
  selectedCategory: ProductCategoryFilter;
  onCategoryChange: (category: ProductCategoryFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  currentPage: string;
  onNavigate: (page: 'home' | 'about' | 'blog' | 'contact' | 'cart' | 'privacy' | 'returns' | 'orders' | 'wishlist' | 'account') => void;
  onOpenCategoryBrowser: () => void;
  selectedCurrency?: Currency;
  onCurrencyChange?: (currency: Currency) => void;
}

export function Header({
  isLoggedIn,
  userFirstName,
  onLoginClick,
  onLogout,
  cartCount,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  currentPage,
  onNavigate,
  onOpenCategoryBrowser,
  selectedCurrency,
  onCurrencyChange,
}: HeaderProps) {
  const currentCurrency = selectedCurrency || getUserCurrency();

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchSubmit(searchQuery);
    }
  };

  const handleCurrencyChange = (currency: Currency) => {
    setUserCurrency(currency);
    if (onCurrencyChange) {
      onCurrencyChange(currency);
    } else {
      // Force page reload to update all prices
      window.location.reload();
    }
  };

  return (
    <header className="bg-[#131921] text-white">
      {/* Top header */}
      <div className="bg-[#EAEDED] border-b border-gray-300">
        <div className="max-w-[1500px] mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between gap-1.5 sm:gap-3 md:gap-6 py-2 sm:py-3">
            {/* Logo */}
            <div
              onClick={() => onNavigate('home')}
              className="cursor-pointer hover:opacity-80 transition-opacity shrink-0"
            >
              <img
                src={logoImage}
                alt="Source Sevens"
                className="h-8 sm:h-9 md:h-11 w-auto object-contain"
              />
            </div>

            {/* Search bar */}
            <div className="flex-1 min-w-0 max-w-3xl mx-auto">
              <div className="flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="hidden md:flex bg-[#f3f3f3] text-gray-700 px-3 py-2.5 rounded-l-md hover:bg-gray-200 items-center gap-1 border-r border-gray-300">
                      <span className="text-sm">All</span>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onCategoryChange('all')}>All Categories</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCategoryChange('mounted-linear-units')}>Mounted & Linear Units</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCategoryChange('rolling-bearings')}>Rolling Bearings</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <input
                  type="text"
                  placeholder="Search products we can source and ship..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="flex-1 min-w-0 px-2 sm:px-3 md:px-4 py-2 md:py-2.5 text-gray-100 bg-[#232F3E] focus:outline-none focus:ring-2 focus:ring-[#FF9900] placeholder-gray-400 rounded-l-md md:rounded-l-none text-xs sm:text-sm md:text-base"
                />
                <button 
                  onClick={() => onSearchSubmit(searchQuery)}
                  className="bg-[#FF9900] hover:bg-[#F08000] px-2 sm:px-3 md:px-4 py-2 md:py-2.5 rounded-r-md transition-colors shrink-0"
                >
                  <Search className="h-4 w-4 md:h-5 md:w-5 text-[#232F3E]" />
                </button>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-6 shrink-0">
              {/* Currency Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 hover:bg-gray-200 rounded px-2 py-1.5 transition-all text-[#003366]">
                    <span className="text-lg">{CURRENCY_INFO[currentCurrency].flag}</span>
                    <span className="hidden sm:inline text-sm font-medium">{currentCurrency}</span>
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleCurrencyChange('USD')}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-xl">🇺🇸</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">USD</span>
                        <span className="text-xs text-gray-500">US Dollar</span>
                      </div>
                      {currentCurrency === 'USD' && <span className="ml-auto">✓</span>}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCurrencyChange('JMD')}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-xl">🇯🇲</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">JMD</span>
                        <span className="text-xs text-gray-500">Jamaican Dollar</span>
                      </div>
                      {currentCurrency === 'JMD' && <span className="ml-auto">✓</span>}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCurrencyChange('CAD')}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-xl">🇨🇦</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">CAD</span>
                        <span className="text-xs text-gray-500">Canadian Dollar</span>
                      </div>
                      {currentCurrency === 'CAD' && <span className="ml-auto">✓</span>}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Cart */}
              <button 
                onClick={() => onNavigate('cart')}
                className="flex items-center gap-1 md:gap-2 hover:bg-gray-200 rounded p-1.5 sm:px-2 sm:py-1 transition-all relative text-[#003366]"
              >
                <div className="relative">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-[#DC143C] text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="hidden md:inline text-sm">Cart</span>
              </button>

              {/* Account */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden md:flex flex-col items-start hover:border border-[#003366] rounded px-2 py-1 transition-all text-[#003366]">
                    <span className="text-xs">Hello, {isLoggedIn ? (userFirstName || 'Customer') : 'Sign in'}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">Account</span>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {!isLoggedIn ? (
                    <>
                      <DropdownMenuItem onClick={onLoginClick}>
                        <User className="h-4 w-4 mr-2" />
                        Sign In
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => onNavigate('account')}>Your Account</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onNavigate('orders')}>Orders</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onNavigate('wishlist')}>Wishlist</DropdownMenuItem>
                      <DropdownMenuItem onClick={onLogout}>Sign Out</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Account Icon */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="md:hidden p-1.5 sm:p-2 hover:bg-gray-200 rounded transition-all text-[#003366]">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {!isLoggedIn ? (
                    <>
                      <DropdownMenuItem onClick={onLoginClick}>
                        <User className="h-4 w-4 mr-2" />
                        Sign In
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => onNavigate('account')}>Your Account</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onNavigate('orders')}>Orders</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onNavigate('wishlist')}>Wishlist</DropdownMenuItem>
                      <DropdownMenuItem onClick={onLogout}>Sign Out</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-[#003366]">
        <div className="max-w-[1500px] mx-auto px-4">
          <nav className="flex items-center gap-3 md:gap-6 py-2 text-xs md:text-sm overflow-x-auto scrollbar-hide">
            <button
              onClick={onOpenCategoryBrowser}
              className="hover:bg-[#004080] rounded px-2 py-1 transition-all whitespace-nowrap flex items-center gap-1"
            >
              <Menu className="h-4 w-4" />
              Shop by Category
            </button>
            <button
              onClick={() => onCategoryChange('all')}
              className={`hover:bg-[#004080] rounded px-2 py-1 transition-all whitespace-nowrap ${
                selectedCategory === 'all' && currentPage === '/' ? 'bg-[#004080]' : ''
              }`}
            >
              All Products
            </button>
            <button
              onClick={() => onCategoryChange('mounted-linear-units')}
              className={`hover:bg-[#004080] rounded px-2 py-1 transition-all whitespace-nowrap ${
                selectedCategory === 'mounted-linear-units' && currentPage === '/' ? 'bg-[#004080]' : ''
              }`}
            >
              Mounted & Linear Units
            </button>
            <button
              onClick={() => onCategoryChange('rolling-bearings')}
              className={`hover:bg-[#004080] rounded px-2 py-1 transition-all whitespace-nowrap ${
                selectedCategory === 'rolling-bearings' && currentPage === '/' ? 'bg-[#004080]' : ''
              }`}
            >
              Rolling Bearings
            </button>
            <button 
              onClick={() => onNavigate('about')}
              className={`hover:bg-[#004080] rounded px-2 py-1 transition-all whitespace-nowrap ${
                currentPage === '/about' ? 'bg-[#004080]' : ''
              }`}
            >
              About Us
            </button>
            <button
              onClick={() => onNavigate('blog')}
              className={`px-3 py-3 text-sm hover:bg-[#004080] transition-colors ${currentPage === '/blog' ? 'bg-[#004080]' : ''}`}
            >
              Resources
            </button>
            <button 
              onClick={() => onNavigate('contact')}
              className={`hover:bg-[#004080] rounded px-2 py-1 transition-all whitespace-nowrap ${
                currentPage === '/contact' ? 'bg-[#004080]' : ''
              }`}
            >
              Contact Us
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
