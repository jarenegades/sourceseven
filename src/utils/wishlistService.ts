import { accountApi } from './accountApi';

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: {
    name: string;
    price: number;
    image_url: string;
    category: string;
    rating?: number;
    review_count?: number;
    in_stock?: boolean;
  };
}

export const wishlistService = {
  async getAll(_userId: string): Promise<WishlistItem[]> {
    const { items } = await accountApi<{ items: WishlistItem[] }>('wishlist');
    return items;
  },

  async addItem(_userId: string, productId: string): Promise<WishlistItem> {
    const { item } = await accountApi<{ item: WishlistItem }>('wishlist', {
      method: 'POST', body: { productId },
    });
    return item;
  },

  async removeItem(wishlistItemId: string): Promise<void> {
    await accountApi('wishlist', { method: 'DELETE', query: { id: wishlistItemId } });
  },

  async removeByProductId(_userId: string, productId: string): Promise<void> {
    await accountApi('wishlist', { method: 'DELETE', query: { productId } });
  },

  async isInWishlist(_userId: string, productId: string): Promise<boolean> {
    const items = await this.getAll(_userId);
    return items.some((item) => item.product_id === productId);
  },

  async clearWishlist(_userId: string): Promise<void> {
    await accountApi('wishlist', { method: 'DELETE', query: { clear: '1' } });
  },

  async getCount(_userId: string): Promise<number> {
    const items = await this.getAll(_userId);
    return items.length;
  },
};
