import { authenticatedApi } from './accountApi';
import type { Currency } from './currencyService';

export interface CurrencyRate {
  id: string;
  currency: Currency;
  rate: number;
  source: 'api' | 'manual';
  updated_at: string;
  updated_by_user_id?: string;
}

async function getRateResponse<T>(query = ''): Promise<T> {
  const response = await fetch(`/api/currency-rates${query}`, { cache: 'no-store' });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || `Could not load currency rates (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const currencyRatesService = {
  async getRates(): Promise<Record<Currency, number>> {
    try {
      const { rates } = await getRateResponse<{ rates: Record<Currency, number> }>();
      return rates;
    } catch (error) {
      console.error('Error fetching currency rates:', error);
      // The currency service falls back to its external API and cached rates.
      return null as any;
    }
  },

  async getRate(currency: Currency): Promise<number | null> {
    if (currency === 'USD') return 1;
    try {
      const { rate } = await getRateResponse<{ rate: number }>(`?currency=${encodeURIComponent(currency)}`);
      return rate;
    } catch (error) {
      console.error(`Error fetching ${currency} rate:`, error);
      return null;
    }
  },

  async updateRate(currency: Currency, rate: number, source: 'api' | 'manual' = 'manual'): Promise<CurrencyRate> {
    if (currency === 'USD') throw new Error('Cannot update USD rate (base currency)');
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Rate must be greater than 0');
    const result = await authenticatedApi<{ rate: CurrencyRate }>('/api/currency-rates', {
      method: 'PATCH',
      body: { currency, rate, source },
    });
    return result.rate;
  },

  async updateRates(rates: Record<Currency, number>, source: 'api' | 'manual' = 'manual'): Promise<CurrencyRate[]> {
    return Promise.all((['JMD', 'CAD'] as const)
      .filter((currency) => Number.isFinite(rates[currency]) && rates[currency] > 0)
      .map((currency) => this.updateRate(currency, rates[currency], source)));
  },

  async getAllRatesWithMetadata(): Promise<CurrencyRate[]> {
    const { rates } = await getRateResponse<{ rates: CurrencyRate[] }>('?metadata=1');
    return rates;
  },

  async hasCurrencyRatesTable(): Promise<boolean> {
    try {
      await getRateResponse('?metadata=1');
      return true;
    } catch {
      return false;
    }
  },
};
