/**
 * Currency Service - Handles currency conversion and formatting
 * Supports USD, JMD (Jamaican Dollar), and CAD (Canadian Dollar)
 */

import { config } from './config';
import { currencyRatesService } from './currencyRatesService';

export type Currency = 'USD' | 'JMD' | 'CAD';
export type RateSourcePreference = 'manual' | 'api' | 'auto'; // auto = prefer manual, fall back to API

// Exchange rates (base currency: USD)
// These are fallback rates - the system will try to fetch real-time rates on app load
// Exchange rates are updated from exchangerate-api.com (free tier, no API key required)
const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1.0,      // Base currency
  JMD: 155.75,   // 1 USD = 155.75 JMD (fallback - Bank of Jamaica reference rate, updated Jan 2025)
  CAD: 1.35,     // 1 USD = 1.35 CAD (fallback - Bank of Canada reference rate, updated Jan 2025)
};

// Currency symbols and formatting
export const CURRENCY_INFO: Record<Currency, { symbol: string; name: string; flag: string }> = {
  USD: { symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  JMD: { symbol: 'J$', name: 'Jamaican Dollar', flag: '🇯🇲' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
};

/**
 * Get current exchange rate from base currency (USD) to target currency
 */
export function getExchangeRate(from: Currency, to: Currency): number {
  if (from === to) return 1.0;
  
  // Convert from -> USD, then USD -> to
  const fromRate = EXCHANGE_RATES[from];
  const toRate = EXCHANGE_RATES[to];
  
  return toRate / fromRate;
}

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  
  const rate = getExchangeRate(from, to);
  return amount * rate;
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const info = CURRENCY_INFO[currency];
  
  // Round to 2 decimal places for USD and CAD, 0 for JMD
  const rounded = currency === 'JMD' 
    ? Math.round(amount) 
    : Math.round(amount * 100) / 100;
  
  // Format with appropriate decimal places
  const formatted = currency === 'JMD'
    ? rounded.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  return `${info.symbol}${formatted}`;
}

/**
 * Get user's preferred currency from localStorage or detect from region
 */
export function getUserCurrency(): Currency {
  // Check localStorage first
  const stored = localStorage.getItem('preferredCurrency') as Currency | null;
  if (stored && ['USD', 'JMD', 'CAD'].includes(stored)) {
    return stored;
  }
  
  // Try to detect from browser locale/region
  try {
    const locale = navigator.language || 'en-US';
    const region = locale.split('-')[1]?.toUpperCase();
    
    if (region === 'JM') return 'JMD';
    if (region === 'CA') return 'CAD';
    // Default to USD for US and other regions
    return 'USD';
  } catch {
    return 'USD';
  }
}

/**
 * Set user's preferred currency
 */
export function setUserCurrency(currency: Currency): void {
  localStorage.setItem('preferredCurrency', currency);
}

/**
 * Get rate source preference (manual, api, or auto)
 */
export function getRateSourcePreference(): RateSourcePreference {
  const stored = localStorage.getItem('rateSourcePreference') as RateSourcePreference | null;
  return stored || 'auto'; // Default to auto (prefer manual, fall back to API)
}

/**
 * Set rate source preference
 */
export function setRateSourcePreference(preference: RateSourcePreference): void {
  localStorage.setItem('rateSourcePreference', preference);
}

/**
 * Update exchange rates from a real-time API or database
 * Uses admin-maintained rates first, then exchangerate-api.com
 * Falls back to static rates if both fail
 */
let exchangeRatesCache = { ...EXCHANGE_RATES };
let lastFetchTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function updateExchangeRates(): Promise<void> {
  try {
    const now = Date.now();
    
    // Use cache if less than 24 hours old and not the initial fallback
    if (now - lastFetchTime < CACHE_DURATION && exchangeRatesCache.JMD !== EXCHANGE_RATES.JMD) {
      Object.assign(EXCHANGE_RATES, exchangeRatesCache);
      console.log('Using cached exchange rates');
      return;
    }

    // Try to fetch admin-maintained rates first.
    try {
      const dbRates = await currencyRatesService.getRates();
      if (dbRates && dbRates.JMD && dbRates.CAD) {
        exchangeRatesCache = dbRates;
        Object.assign(EXCHANGE_RATES, dbRates);
        lastFetchTime = now;
        if (config.debugMode || window.location.search.includes('debug=true')) {
          console.log('✅ Exchange rates updated from database:', {
            JMD: EXCHANGE_RATES.JMD,
            CAD: EXCHANGE_RATES.CAD,
            source: 'database'
          });
        }
        return;
      }
    } catch (dbError) {
      console.warn('Failed to fetch rates from database, trying API:', dbError);
    }

    // Try to fetch from exchangerate-api.com (free, no API key)
    // This API provides accurate, updated exchange rates
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update rates if available (JMD and CAD are standard currencies, should always be available)
        if (data.rates && typeof data.rates.JMD === 'number' && data.rates.JMD > 0) {
          exchangeRatesCache.JMD = data.rates.JMD;
          EXCHANGE_RATES.JMD = data.rates.JMD;
        }
        if (data.rates && typeof data.rates.CAD === 'number' && data.rates.CAD > 0) {
          exchangeRatesCache.CAD = data.rates.CAD;
          EXCHANGE_RATES.CAD = data.rates.CAD;
        }
        
        lastFetchTime = now;
        if (config.debugMode || window.location.search.includes('debug=true')) {
          console.log('✅ Exchange rates updated from API:', {
            JMD: EXCHANGE_RATES.JMD,
            CAD: EXCHANGE_RATES.CAD,
            source: 'exchangerate-api.com'
          });
        }
        return;
      } else {
        console.warn(`Exchange rate API returned status ${response.status}, using cached/fallback rates`);
      }
    } catch (apiError) {
      // Silently fail and use cached/fallback rates - don't spam console in production
      if (config.debugMode || window.location.search.includes('debug=true')) {
        console.warn('Failed to fetch exchange rates from API, using cached/fallback rates:', apiError);
      }
    }

    // Fallback: Use static rates if API fails
    console.log('Using static exchange rates');
  } catch (error) {
    console.error('Failed to update exchange rates:', error);
    // Continue with existing rates
  }
}

/**
 * Get current exchange rates (may trigger update if cache expired)
 */
export async function getCurrentExchangeRates(): Promise<Record<Currency, number>> {
  await updateExchangeRates();
  return { ...EXCHANGE_RATES };
}

/**
 * Get all supported currencies
 */
export function getSupportedCurrencies(): Currency[] {
  return Object.keys(CURRENCY_INFO) as Currency[];
}

