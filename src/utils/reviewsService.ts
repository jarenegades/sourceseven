import { authenticatedApi } from './accountApi';

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  user_name?: string;
  user_avatar?: string;
  created_at: string;
}

async function getReviews<T>(query: URLSearchParams): Promise<T> {
  const response = await fetch(`/api/reviews?${query.toString()}`, { cache: 'no-store' });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || `Could not load reviews (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const reviewsService = {
  async getByProductId(productId: string): Promise<Review[]> {
    try {
      const { reviews } = await getReviews<{ reviews: Review[] }>(new URLSearchParams({ productId }));
      return reviews;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
  },

  async addReview(review: Omit<Review, 'id' | 'created_at'>): Promise<Review> {
    const { review: saved } = await authenticatedApi<{ review: Review }>('/api/reviews', {
      method: 'POST',
      // The API resolves user identity and name from the authenticated session.
      body: { productId: review.product_id, rating: review.rating, comment: review.comment },
    });
    return saved;
  },

  async getUserReview(productId: string, _userId: string): Promise<Review | null> {
    try {
      const { review } = await authenticatedApi<{ review: Review | null }>('/api/reviews', {
        query: { productId, mine: '1' },
      });
      return review;
    } catch (error) {
      console.error('Error checking user review:', error);
      return null;
    }
  },

  async deleteReview(reviewId: string): Promise<void> {
    await authenticatedApi('/api/reviews', { method: 'DELETE', query: { id: reviewId } });
  },

  async getAverageRating(productId: string): Promise<{ averageRating: number; reviewCount: number }> {
    try {
      const { averageRating, reviewCount } = await getReviews<{ averageRating: number; reviewCount: number }>(
        new URLSearchParams({ productId, summary: '1' }),
      );
      return { averageRating, reviewCount };
    } catch (error) {
      console.error('Error calculating average rating:', error);
      return { averageRating: 0, reviewCount: 0 };
    }
  },
};
