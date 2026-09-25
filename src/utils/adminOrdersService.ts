import { getNeonAuthHeaders } from './neonAuthClient';

const ADMIN_ORDERS_URL = '/api/admin/orders';

export interface AdminOrderRecord {
  id: string;
  order_number: string;
  created_at: string;
  status: 'processing' | 'confirmed' | 'in-transit' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_transaction_id: string | null;
  total: number;
  subtotal: number;
  tax: number;
  shipping_cost: number;
  shipping_method: string | null;
  tracking_number: string | null;
  estimated_delivery: string | null;
  shipping_full_name: string;
  shipping_email: string;
  shipping_phone: string | null;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip_code: string;
  shipping_country: string;
  items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers = await getNeonAuthHeaders();
  if (!headers.Authorization) throw new Error('Admin session not found');
  return { ...headers, 'Content-Type': 'application/json' };
}

async function readResponse(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || fallback);
  return data;
}

export const adminOrdersService = {
  async getAll(): Promise<AdminOrderRecord[]> {
    const headers = await getAuthHeaders();
    const orders: AdminOrderRecord[] = [];
    for (let page = 1; page <= 1000; page++) {
      const response = await fetch(`${ADMIN_ORDERS_URL}?page=${page}&limit=100`, {
        method: 'GET', headers, cache: 'no-store',
      });
      const data = await readResponse(response, 'Failed to load admin orders');
      orders.push(...(data.orders || []));
      if (orders.length >= data.count || data.orders.length < 100) return orders;
    }
    throw new Error('Too many orders to load');
  },

  async updateOrder(orderId: string, updates: {
    status?: AdminOrderRecord['status'];
    tracking_number?: string | null;
    estimated_delivery?: string | null;
  }): Promise<AdminOrderRecord> {
    const headers = await getAuthHeaders();
    const response = await fetch(ADMIN_ORDERS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'update-order', orderId, ...updates }),
    });
    const data = await readResponse(response, 'Failed to update order');
    return data.order;
  },

  async processRefund(orderId: string): Promise<AdminOrderRecord> {
    const headers = await getAuthHeaders();
    const response = await fetch(ADMIN_ORDERS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'refund', orderId }),
    });
    const data = await readResponse(response, 'Failed to process refund');
    return data.order;
  },
};
