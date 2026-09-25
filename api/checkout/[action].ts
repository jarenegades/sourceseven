import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from '../../src/server/db.js';
import { authorizeAdmin, authenticateRequest } from '../../src/server/auth.js';
import { createCheckoutQuote, CheckoutError, type CheckoutCurrency } from '../../src/server/checkout.js';
import { parseCheckoutPaymentMethods } from '../../src/server/checkoutSettings.js';

const allowedShippingCodes = new Set(['standard', 'express', 'overnight']);
const currencies: CheckoutCurrency[] = ['USD', 'JMD', 'CAD'];

async function handleAdminShipping(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Authorization');
  if (!['GET', 'PATCH'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authorizeAdmin(req);
  if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });

  if (req.method === 'GET') {
    const result = await pool.query(
      `SELECT code, name, description, price, free_shipping_threshold,
              estimated_delivery, display_order, is_active
       FROM public.shipping_methods ORDER BY display_order, code`,
    );
    return res.status(200).json({ shippingMethods: result.rows });
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body as Record<string, unknown>
    : null;
  if (!allowedShippingCodes.has(code) || !body) return res.status(400).json({ error: 'A valid shipping method and JSON object are required' });

  const validKeys = new Set(['name', 'description', 'price', 'free_shipping_threshold', 'estimated_delivery', 'display_order', 'is_active']);
  if (Object.keys(body).some((key) => !validKeys.has(key))) return res.status(400).json({ error: 'Unsupported shipping setting' });
  const { name, description, price, free_shipping_threshold, estimated_delivery, display_order, is_active } = body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 ||
      (description !== null && typeof description !== 'string') ||
      typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 1_000_000 ||
      !(free_shipping_threshold === null || typeof free_shipping_threshold === 'number' && Number.isFinite(free_shipping_threshold) && free_shipping_threshold >= 0 && free_shipping_threshold <= 1_000_000) ||
      typeof estimated_delivery !== 'string' || !estimated_delivery.trim() || estimated_delivery.trim().length > 100 ||
      typeof display_order !== 'number' || !Number.isSafeInteger(display_order) ||
      typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'Shipping settings contain invalid values' });
  }

  const result = await pool.query(
    `UPDATE public.shipping_methods SET
       name = $2, description = $3, price = $4, free_shipping_threshold = $5,
       estimated_delivery = $6, display_order = $7, is_active = $8, updated_at = now()
     WHERE code = $1
     RETURNING code, name, description, price, free_shipping_threshold,
               estimated_delivery, display_order, is_active`,
    [code, name.trim(), typeof description === 'string' ? description.trim() || null : null,
      price, free_shipping_threshold, estimated_delivery.trim(), display_order, is_active],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Shipping method not found' });
  return res.status(200).json({ shippingMethod: result.rows[0] });
}

async function handleAdminPayments(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Authorization');
  if (!['GET', 'PUT'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authorizeAdmin(req);
  if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });

  if (req.method === 'GET') {
    const result = await pool.query(
      `SELECT code, name, description, is_active, display_order
       FROM public.payment_methods ORDER BY display_order, code`,
    );
    return res.status(200).json({ paymentMethods: result.rows });
  }

  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body as Record<string, unknown>
    : null;
  const methods = body ? parseCheckoutPaymentMethods(body.methods) : null;
  if (!methods) return res.status(400).json({ error: 'Payment method settings are invalid' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const method of methods) {
      const result = await client.query(
        `UPDATE public.payment_methods SET
           name = $2, description = $3, is_active = $4, display_order = $5, updated_at = now()
         WHERE code = $1`,
        [method.code, method.name, method.description, method.is_active, method.display_order],
      );
      if (!result.rowCount) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'A configured payment method is missing from Neon' });
      }
    }
    await client.query('COMMIT');
    return res.status(200).json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function handleAdminPricing(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Authorization');
  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const auth = await authorizeAdmin(req);
  if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });

  if (req.method === 'GET') {
    const result = await pool.query(
      'SELECT product_id, purchase_mode FROM public.product_pricing_settings ORDER BY product_id',
    );
    return res.status(200).json({ pricingSettings: result.rows });
  }

  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body as Record<string, unknown>
    : null;
  const ids = body?.productIds;
  const mode = body?.purchaseMode;
  if (!body || Object.keys(body).some((key) => key !== 'productIds' && key !== 'purchaseMode') ||
      !Array.isArray(ids) || ids.length < 1 || ids.length > 500 ||
      ids.some((id) => typeof id !== 'string' || !id.trim() || id.length > 255) ||
      new Set(ids).size !== ids.length || (mode !== 'price' && mode !== 'quote')) {
    return res.status(400).json({ error: 'Invalid product pricing settings' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const saved = await client.query(
      `INSERT INTO public.product_pricing_settings (product_id, purchase_mode)
       SELECT id, $2 FROM public.products WHERE id = ANY($1::text[])
       ON CONFLICT (product_id) DO UPDATE SET purchase_mode = EXCLUDED.purchase_mode, updated_at = now()
       RETURNING product_id`,
      [ids, mode],
    );
    if (saved.rowCount !== ids.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'One or more products were not found' });
    }
    await client.query('COMMIT');
    return res.status(200).json({ updated: saved.rowCount });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function handleQuote(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticateRequest(req);
  if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });

  try {
    const profileResult = await pool.query<{ id: string }>(
      'SELECT id FROM public.user_profiles WHERE neon_auth_user_id = $1 LIMIT 1', [auth.userId],
    );
    const profileId = profileResult.rows[0]?.id;
    if (!profileId) return res.status(409).json({ error: 'Account profile is still being created. Try again shortly.' });

    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? req.body as Record<string, unknown>
      : {};
    const currency = typeof body.currency === 'string' ? body.currency.toUpperCase() as CheckoutCurrency : 'USD';
    const shippingMethod = typeof body.shippingMethod === 'string' ? body.shippingMethod : '';
    if (!currencies.includes(currency) || !shippingMethod || shippingMethod.length > 50) {
      return res.status(400).json({ error: 'Checkout currency or shipping method is invalid' });
    }

    const { quote } = await createCheckoutQuote(profileId, currency, shippingMethod);
    return res.status(200).json({ quote });
  } catch (error) {
    console.error('Neon checkout quote failed:', error instanceof Error ? error.message : 'unknown error');
    if (error instanceof CheckoutError) return res.status(409).json({ error: error.message });
    return res.status(503).json({ error: 'Unable to calculate the checkout total. Please try again shortly.' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action;
  if (action === 'quote') return handleQuote(req, res);

  if (action === 'settings') {
    if (req.query.admin === 'shipping') {
      try {
        return await handleAdminShipping(req, res);
      } catch (error) {
        console.error('Admin shipping settings request failed:', error instanceof Error ? error.message : 'unknown error');
        return res.status(500).json({ error: 'Unable to load or save shipping settings' });
      }
    }
    if (req.query.admin === 'payments') {
      try {
        return await handleAdminPayments(req, res);
      } catch (error) {
        console.error('Admin payment settings request failed:', error instanceof Error ? error.message : 'unknown error');
        return res.status(500).json({ error: 'Unable to load or save payment settings' });
      }
    }
    if (req.query.admin === 'pricing') {
      try {
        return await handleAdminPricing(req, res);
      } catch (error) {
        console.error('Admin pricing settings request failed:', error instanceof Error ? error.message : 'unknown error');
        return res.status(500).json({ error: 'Unable to load or save pricing settings' });
      }
    }
    if (req.query.admin !== undefined) return res.status(400).json({ error: 'Unsupported checkout settings view' });

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const [shipping, payments] = await Promise.all([
        pool.query(`SELECT code, name, description, price, free_shipping_threshold, estimated_delivery, display_order, is_active
          FROM public.shipping_methods WHERE is_active = true ORDER BY display_order`),
        pool.query(`SELECT code, name, description, is_active, display_order
          FROM public.payment_methods WHERE is_active = true ORDER BY display_order`),
      ]);
      return res.status(200).json({
        shippingMethods: shipping.rows.map((row) => ({
          ...row,
          price: Number(row.price),
          free_shipping_threshold: row.free_shipping_threshold == null ? null : Number(row.free_shipping_threshold),
        })),
        paymentMethods: payments.rows,
      });
    } catch (error) {
      console.error('Checkout settings load failed:', error instanceof Error ? error.message : 'unknown error');
      return res.status(503).json({ error: 'Checkout settings are temporarily unavailable' });
    }
  }

  return res.status(404).json({ error: 'Checkout route not found' });
}
