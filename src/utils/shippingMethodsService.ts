import { authenticatedApi } from './accountApi';

export interface ShippingMethod {
  code: 'standard' | 'express' | 'overnight';
  name: string;
  description?: string | null;
  price: number;
  free_shipping_threshold?: number | null;
  estimated_delivery: string;
  display_order: number;
  is_active: boolean;
}

const fallbackMethods: ShippingMethod[] = [
  { code: 'standard', name: 'Standard Shipping', description: 'Reliable delivery for most bearing orders.', price: 9.99, free_shipping_threshold: 50, estimated_delivery: '5–7 business days', display_order: 10, is_active: true },
  { code: 'express', name: 'Express Shipping', description: 'Priority delivery for time-sensitive requirements.', price: 19.99, free_shipping_threshold: null, estimated_delivery: '2–3 business days', display_order: 20, is_active: true },
  { code: 'overnight', name: 'Overnight Shipping', description: 'Next-business-day delivery where available.', price: 39.99, free_shipping_threshold: null, estimated_delivery: 'Next business day', display_order: 30, is_active: true },
];

export const shippingMethodsService = {
  async getActive(): Promise<ShippingMethod[]> {
    if (import.meta.env.VITE_NEON_AUTH_URL) {
      const { shippingMethods } = await fetch('/api/checkout/settings', { cache: 'no-store' }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load shipping methods');
        return result as { shippingMethods: ShippingMethod[] };
      });
      return shippingMethods.map((method) => ({
        ...method,
        price: Number(method.price),
        free_shipping_threshold: method.free_shipping_threshold == null ? null : Number(method.free_shipping_threshold),
      }));
    }
    return fallbackMethods.filter((method) => method.is_active);
  },

  async getAll(): Promise<ShippingMethod[]> {
    const { shippingMethods } = await authenticatedApi<{ shippingMethods: ShippingMethod[] }>('/api/checkout/settings?admin=shipping');
    return shippingMethods.map((method) => ({
      ...method,
      price: Number(method.price),
      free_shipping_threshold: method.free_shipping_threshold == null ? null : Number(method.free_shipping_threshold),
    }));
  },

  async update(method: ShippingMethod) {
    const { shippingMethod } = await authenticatedApi<{ shippingMethod: ShippingMethod }>(
      `/api/checkout/settings?admin=shipping&code=${encodeURIComponent(method.code)}`,
      {
        method: 'PATCH',
        body: {
          name: method.name.trim(),
          description: method.description?.trim() || null,
          price: method.price,
          free_shipping_threshold: method.free_shipping_threshold,
          estimated_delivery: method.estimated_delivery.trim(),
          display_order: method.display_order,
          is_active: method.is_active,
        },
      },
    );
    return shippingMethod;
  },
};
