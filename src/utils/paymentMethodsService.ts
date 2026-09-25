import { accountApi } from './accountApi';

export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
}

export const paymentMethodsService = {
  async list(): Promise<SavedPaymentMethod[]> {
    const result = await accountApi<{ paymentMethods: SavedPaymentMethod[] }>('payment-methods');
    return result.paymentMethods;
  },
  async openPortal(): Promise<string> {
    const result = await accountApi<{ url: string }>('payment-methods', { method: 'POST' });
    return result.url;
  },
};
