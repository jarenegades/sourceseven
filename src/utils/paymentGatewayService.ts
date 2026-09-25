import { authenticatedApi } from './accountApi';

export interface PaymentGatewaySettings {
  id: string;
  merchant_id: string | null;
  secret_key: string | null;
  has_secret_key: boolean;
  client_key: string | null;
  environment: 'sandbox' | 'production';
  fee_handling: 'merchant' | 'customer';
  platform_fee_percentage: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

const path = '/api/admin/settings';
const query = { section: 'payment-gateway' };

export const paymentGatewayService = {
  async getSettings(): Promise<PaymentGatewaySettings | null> {
    const { settings } = await authenticatedApi<{ settings: PaymentGatewaySettings | null }>(path, { query });
    return settings;
  },

  async updateSettings(updates: Partial<Omit<PaymentGatewaySettings, 'id' | 'created_at' | 'updated_at' | 'has_secret_key'>>): Promise<PaymentGatewaySettings> {
    const { settings } = await authenticatedApi<{ settings: PaymentGatewaySettings }>(path, {
      method: 'PATCH', query, body: updates,
    });
    return settings;
  },

  getDimePayBaseUrl(environment: 'sandbox' | 'production'): string {
    return environment === 'production'
      ? 'https://api.dimepay.app/dapi/v1'
      : 'https://sandbox.api.dimepay.app/dapi/v1';
  },

  async isConfigured(): Promise<boolean> {
    const settings = await this.getSettings();
    return !!(settings?.is_enabled && settings?.merchant_id && settings?.has_secret_key && settings?.client_key);
  },
};
