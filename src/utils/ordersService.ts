import { accountApi, authenticatedApi } from './accountApi';

export interface Order {
  id: string; order_number: string; user_id: string;
  status: 'processing' | 'confirmed' | 'in-transit' | 'delivered' | 'cancelled' | 'refunded';
  subtotal: number; tax: number; shipping_cost: number; total: number;
  currency?: 'USD' | 'JMD' | 'CAD'; shipping_method?: 'standard' | 'express' | 'overnight';
  tracking_number?: string; estimated_delivery?: string; delivered_at?: string;
  shipping_full_name: string; shipping_email: string; shipping_phone?: string;
  shipping_address: string; shipping_city: string; shipping_state: string; shipping_zip_code: string; shipping_country: string;
  payment_method?: 'credit-card' | 'debit-card' | 'paypal' | 'bank-transfer' | 'cash-on-delivery';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'; payment_transaction_id?: string;
  created_at: string; updated_at: string;
}
export interface OrderItem { id: string; order_id: string; product_id: string; product_name: string; product_image_url?: string; quantity: number; unit_price: number; total_price: number; created_at: string; }
export interface OrderWithItems extends Order { items: OrderItem[]; }

function normalize(order: any): OrderWithItems {
  return { ...order, subtotal: Number(order.subtotal), tax: Number(order.tax), shipping_cost: Number(order.shipping_cost), total: Number(order.total), items: (order.items || []).map((item: any) => ({ ...item, unit_price: Number(item.unit_price), total_price: Number(item.total_price) })) };
}

export const ordersService = {
  async getAllByUser(_userId: string) { const { orders } = await accountApi<{ orders: OrderWithItems[] }>('orders'); return orders.map(normalize); },
  async getById(orderId: string) { const { order } = await accountApi<{ order: OrderWithItems }>(`orders/${encodeURIComponent(orderId)}`); return order ? normalize(order) : null; },
  async getByOrderNumber(orderNumber: string) { const { order } = await accountApi<{ order: OrderWithItems }>('orders', { query: { orderNumber } }); return order ? normalize(order) : null; },
  async create(orderData: any, _items: any[], checkoutAttemptId?: string) {
    const paymentMethod = orderData.payment_method === 'cash-on-delivery' ? 'cash-on-delivery' : orderData.payment_method === 'bank-transfer' ? 'bank-transfer' : 'card';
    const { order } = await authenticatedApi<{ order: OrderWithItems }>('/api/payments/place-order', { method: 'POST', body: { currency: orderData.currency || 'USD', shippingMethod: orderData.shipping_method || 'standard', paymentMethod, paymentIntentId: orderData.payment_transaction_id || undefined, checkoutAttemptId, shipping: { fullName: orderData.shipping_full_name, email: orderData.shipping_email, phone: orderData.shipping_phone, address: orderData.shipping_address, city: orderData.shipping_city, state: orderData.shipping_state, zipCode: orderData.shipping_zip_code, country: orderData.shipping_country } } });
    return normalize(order);
  },
  async updateStatus(orderId: string, status: Order['status']) { const { order } = await authenticatedApi<{ order: Order }>('/api/admin/orders', { method: 'POST', body: { action: 'update-order', orderId, status } }); return order; },
  async updateTracking(orderId: string, trackingNumber: string, estimatedDelivery?: string) { const { order } = await authenticatedApi<{ order: Order }>('/api/admin/orders', { method: 'POST', body: { action: 'update-order', orderId, status: 'processing', tracking_number: trackingNumber, estimated_delivery: estimatedDelivery } }); return order; },
  async cancel(orderId: string) { return this.updateStatus(orderId, 'cancelled'); },
  async getStats(_userId: string) { const { stats } = await accountApi<{ stats: { total: number; processing: number; inTransit: number; delivered: number; cancelled: number } }>('orders', { query: { stats: '1' } }); return { total: Number(stats.total), processing: Number(stats.processing), inTransit: Number(stats.inTransit), delivered: Number(stats.delivered), cancelled: Number(stats.cancelled) }; },
  generateOrderNumber() { return `NG${new Date().getFullYear()}${Date.now().toString(36).toUpperCase()}`; },
};
