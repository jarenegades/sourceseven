import type { VercelRequest, VercelResponse } from '@vercel/node';
import products from '../../src/server/adminApi/products.js';
import categories from '../../src/server/adminApi/categories.js';
import settings from '../../src/server/adminApi/settings.js';
import users from '../../src/server/adminApi/users.js';

const handlers: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<unknown>> = {
  products,
  categories,
  settings,
  users,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const resource = req.query.resource;
  const selected = typeof resource === 'string' ? handlers[resource] : undefined;
  if (!selected) return res.status(404).json({ error: 'Admin API route not found' });
  return selected(req, res);
}
