export interface OrderNotificationPayload {
  userId: string; orderNumber: string; total: number; subtotal: number; tax: number; shippingCost: number; currency: string;
  customer: { fullName: string; email: string; phone: string };
  shipping: { address: string; city: string; state: string; zipCode: string; country: string; method: string };
  items: Array<{ productId: string; productName: string; productImageUrl?: string; quantity: number; unitPrice: number; totalPrice: number; category: string; categoryId?: string; subcategoryId?: string }>;
}

/** Email delivery is intentionally provider-neutral. Configure the selected provider's server route before enabling notifications. */
export const orderNotificationService = {
  async sendOrderCompleteNotifications(_payload: OrderNotificationPayload): Promise<void> {
    if (!import.meta.env.VITE_ORDER_EMAIL_NOTIFICATIONS) return;
    const response = await fetch('/api/notifications/order-complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(_payload) });
    if (!response.ok) throw new Error('Order email delivery failed');
  },
};
