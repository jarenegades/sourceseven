import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeAdmin } from '../auth.js';
import { pool } from '../db.js';

const gatewayId = '00000000-0000-0000-0000-000000000001';
const notificationsId = '00000000-0000-0000-0000-000000000002';

type GatewayRow = {
  id: string; merchant_id: string | null; client_key: string | null;
  environment: string; fee_handling: string; platform_fee_percentage: string;
  is_enabled: boolean; has_secret_key: boolean; created_at: Date; updated_at: Date;
};

const gatewaySelect = `SELECT id, merchant_id, client_key, environment, fee_handling,
  platform_fee_percentage, is_enabled, (secret_key IS NOT NULL AND secret_key <> '') AS has_secret_key,
  created_at, updated_at FROM public.payment_gateway_settings WHERE id = $1`;

function serializeGateway(row: GatewayRow) {
  return { ...row, platform_fee_percentage: Number(row.platform_fee_percentage), secret_key: null };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function validEmail(value: string): boolean {
  return value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function gateway(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const result = await pool.query<GatewayRow>(gatewaySelect, [gatewayId]);
    return res.status(200).json({ settings: result.rows[0] ? serializeGateway(result.rows[0]) : null });
  }
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = asObject(req.body);
  const allowed = new Set(['merchant_id', 'secret_key', 'client_key', 'environment', 'fee_handling', 'platform_fee_percentage', 'is_enabled']);
  if (!body || !Object.keys(body).length || Object.keys(body).some((key) => !allowed.has(key))) {
    return res.status(400).json({ error: 'Valid payment gateway settings are required' });
  }
  const updates: string[] = [];
  const values: unknown[] = [];
  const add = (column: string, value: unknown) => { values.push(value); updates.push(`${column} = $${values.length}`); };
  if ('merchant_id' in body) {
    if (body.merchant_id !== null && (typeof body.merchant_id !== 'string' || body.merchant_id.length > 255)) return res.status(400).json({ error: 'Invalid merchant ID' });
    add('merchant_id', typeof body.merchant_id === 'string' ? body.merchant_id.trim() || null : null);
  }
  if ('client_key' in body) {
    if (body.client_key !== null && (typeof body.client_key !== 'string' || body.client_key.length > 500)) return res.status(400).json({ error: 'Invalid client key' });
    add('client_key', typeof body.client_key === 'string' ? body.client_key.trim() || null : null);
  }
  if ('secret_key' in body) {
    if (body.secret_key !== null && (typeof body.secret_key !== 'string' || body.secret_key.length > 500)) return res.status(400).json({ error: 'Invalid secret key' });
    // Empty and null mean preserve the existing secret. A nonempty value replaces it.
    if (typeof body.secret_key === 'string' && body.secret_key.trim()) add('secret_key', body.secret_key.trim());
  }
  if ('environment' in body) {
    if (body.environment !== 'sandbox' && body.environment !== 'production') return res.status(400).json({ error: 'Invalid environment' });
    add('environment', body.environment);
  }
  if ('fee_handling' in body) {
    if (body.fee_handling !== 'merchant' && body.fee_handling !== 'customer') return res.status(400).json({ error: 'Invalid fee handling' });
    add('fee_handling', body.fee_handling);
  }
  if ('platform_fee_percentage' in body) {
    if (typeof body.platform_fee_percentage !== 'number' || !Number.isFinite(body.platform_fee_percentage) ||
        body.platform_fee_percentage < 0 || body.platform_fee_percentage > 100) return res.status(400).json({ error: 'Invalid platform fee' });
    add('platform_fee_percentage', body.platform_fee_percentage);
  }
  if ('is_enabled' in body) {
    if (typeof body.is_enabled !== 'boolean') return res.status(400).json({ error: 'Invalid enabled setting' });
    add('is_enabled', body.is_enabled);
  }
  if (!updates.length) return res.status(400).json({ error: 'No settings to update' });
  values.push(gatewayId);
  const result = await pool.query<GatewayRow>(
    `UPDATE public.payment_gateway_settings SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length} RETURNING id, merchant_id, client_key, environment,
      fee_handling, platform_fee_percentage, is_enabled,
      (secret_key IS NOT NULL AND secret_key <> '') AS has_secret_key, created_at, updated_at`,
    values,
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Payment gateway settings are missing' });
  return res.status(200).json({ settings: serializeGateway(result.rows[0]) });
}

async function notifications(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const result = await pool.query('SELECT * FROM public.order_notification_settings WHERE id = $1', [notificationsId]);
    return res.status(200).json({ settings: result.rows[0] ?? null });
  }
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = asObject(req.body);
  if (!body || Object.keys(body).some((key) => !['notifications_enabled', 'admin_emails'].includes(key)) ||
      typeof body.notifications_enabled !== 'boolean' || !Array.isArray(body.admin_emails) ||
      body.admin_emails.length > 25 || !body.admin_emails.every((email) => typeof email === 'string' && validEmail(email))) {
    return res.status(400).json({ error: 'Invalid notification settings' });
  }
  const emails = [...new Set((body.admin_emails as string[]).map((email) => email.trim().toLowerCase()))];
  const result = await pool.query(
    `UPDATE public.order_notification_settings
        SET notifications_enabled = $1, admin_emails = $2, updated_at = NOW()
      WHERE id = $3 RETURNING *`,
    [body.notifications_enabled, emails, notificationsId],
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Notification settings are missing' });
  return res.status(200).json({ settings: result.rows[0] });
}

type SupplierRoute = { email: string; category_id: string; subcategory_id: string | null; is_enabled: boolean };

function parseRoutes(value: unknown): SupplierRoute[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const routes: SupplierRoute[] = [];
  for (const item of value) {
    const route = asObject(item);
    if (!route || Object.keys(route).some((key) => !['email', 'category_id', 'subcategory_id', 'is_enabled'].includes(key)) ||
        typeof route.email !== 'string' || !validEmail(route.email) ||
        typeof route.category_id !== 'string' || !/^[a-z0-9_-]{1,100}$/.test(route.category_id) ||
        (route.subcategory_id !== undefined && route.subcategory_id !== null &&
          (typeof route.subcategory_id !== 'string' || !/^[a-z0-9_-]{1,100}$/.test(route.subcategory_id))) ||
        typeof route.is_enabled !== 'boolean') return null;
    routes.push({
      email: route.email.trim().toLowerCase(),
      category_id: route.category_id,
      subcategory_id: typeof route.subcategory_id === 'string' ? route.subcategory_id : null,
      is_enabled: route.is_enabled,
    });
  }
  return routes;
}

async function supplierRoutes(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const result = await pool.query('SELECT * FROM public.supplier_notification_routes ORDER BY created_at, id');
    return res.status(200).json({ routes: result.rows });
  }
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = asObject(req.body);
  const routes = parseRoutes(body?.routes);
  if (!body || Object.keys(body).some((key) => key !== 'routes') || !routes) {
    return res.status(400).json({ error: 'Invalid supplier routes' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM public.supplier_notification_routes');
    for (const route of routes) {
      await client.query(
        `INSERT INTO public.supplier_notification_routes (email, category_id, subcategory_id, is_enabled)
         VALUES ($1, $2, $3, $4)`,
        [route.email, route.category_id, route.subcategory_id, route.is_enabled],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  const result = await pool.query('SELECT * FROM public.supplier_notification_routes ORDER BY created_at, id');
  return res.status(200).json({ routes: result.rows });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Authorization');
  const auth = await authorizeAdmin(req);
  if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });
  try {
    switch (req.query.section) {
      case 'payment-gateway': return gateway(req, res);
      case 'order-notifications': return notifications(req, res);
      case 'supplier-routes': return supplierRoutes(req, res);
      default: return res.status(404).json({ error: 'Admin settings section not found' });
    }
  } catch (error) {
    console.error('Admin settings API failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(503).json({ error: 'Unable to load or save admin settings' });
  }
}
