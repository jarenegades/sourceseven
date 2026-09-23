import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../src/server/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Authorization');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authorization = await authenticateRequest(req);
  if (authorization.authorized === false) {
    return res.status(authorization.status).json({ error: authorization.message });
  }

  return res.status(200).json({ is_admin: authorization.isAdmin });
}
