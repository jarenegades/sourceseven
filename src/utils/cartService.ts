import { accountApi } from './accountApi';

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: {
    name: string;
    price: number;
    image_url: string;
    category: string;
    category_id?: string;
    subcategory_id?: string;
  };
}

export const cartService = {
  async getAll(_userId: string): Promise<CartItem[]> {
    const { items } = await accountApi<{ items: CartItem[] }>('cart');
    return items;
  },

  async addItem(_userId: string, productId: string, quantity = 1): Promise<CartItem> {
    const { item } = await accountApi<{ item: CartItem }>('cart', {
      method: 'POST', body: { productId, quantity },
    });
    return item;
  },

  async updateQuantity(cartItemId: string, quantity: number): Promise<CartItem> {
    const { item } = await accountApi<{ item: CartItem }>('cart', {
      method: 'PATCH', body: { itemId: cartItemId, quantity },
    });
    return item;
  },

  async removeItem(cartItemId: string): Promise<void> {
    await accountApi('cart', { method: 'DELETE', query: { id: cartItemId } });
  },

  async clearCart(_userId: string): Promise<void> {
    await accountApi('cart', { method: 'DELETE', query: { clear: '1' } });
  },

  async getCount(_userId: string): Promise<number> {
    const items = await this.getAll(_userId);
    return items.reduce((count, item) => count + item.quantity, 0);
  },
};
