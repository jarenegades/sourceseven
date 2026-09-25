import { authenticatedApi } from './accountApi';

export type PaymentMethodCode = 'card' | 'cash-on-delivery' | 'bank-transfer';
export interface PaymentMethodSetting { code: PaymentMethodCode; name: string; description?: string | null; is_active: boolean; display_order: number; }
export interface ProductPricingSetting { product_id: string; purchase_mode: 'price' | 'quote'; }

export const commerceSettingsService = {
  async getActivePaymentMethods(): Promise<PaymentMethodSetting[]> {
    const response = await fetch('/api/checkout/settings', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load payment methods');
    return (result.paymentMethods || []) as PaymentMethodSetting[];
  },
  async getAllPaymentMethods(): Promise<PaymentMethodSetting[]> {
    const { paymentMethods } = await authenticatedApi<{ paymentMethods: PaymentMethodSetting[] }>(
      '/api/checkout/settings', { query: { admin: 'payments' } },
    );
    return paymentMethods;
  },
  async savePaymentMethods(methods: PaymentMethodSetting[]) {
    await authenticatedApi('/api/checkout/settings', {
      method: 'PUT',
      query: { admin: 'payments' },
      body: { methods },
    });
  },
  async getPricingSettings(): Promise<ProductPricingSetting[]> {
    const { pricingSettings } = await authenticatedApi<{ pricingSettings: ProductPricingSetting[] }>(
      '/api/checkout/settings', { query: { admin: 'pricing' } },
    );
    return pricingSettings;
  },
  async setProductPurchaseMode(productId: string, purchaseMode: 'price' | 'quote') {
    await this.setProductPurchaseModes([productId], purchaseMode);
  },
  async setProductPurchaseModes(productIds: string[], purchaseMode: 'price' | 'quote') {
    if (productIds.length === 0) return;
    for (let start = 0; start < productIds.length; start += 500) {
      await authenticatedApi('/api/checkout/settings', {
        method: 'PUT',
        query: { admin: 'pricing' },
        body: { productIds: productIds.slice(start, start + 500), purchaseMode },
      });
    }
  },
};
