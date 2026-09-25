import type { VercelRequest, VercelResponse } from '@vercel/node';
import products from '../src/server/publicApi/products.js';
import categories from '../src/server/publicApi/categories.js';
import reviews from '../src/server/publicApi/reviews.js';
import currencyRates from '../src/server/publicApi/currency-rates.js';
import objectStorage from '../src/server/objectStorage.js';

const handlers: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<unknown>> = {
  products,
  categories,
  reviews,
  'currency-rates': currencyRates,
  storage: objectStorage,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const resource = req.query.resource;
  const selected = typeof resource === 'string' ? handlers[resource] : undefined;
  if (!selected) return res.status(404).json({ error: 'API route not found' });
  return selected(req, res);
}
