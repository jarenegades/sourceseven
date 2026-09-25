import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PoolClient } from 'pg';
import { authorizeAdmin } from '../../src/server/auth.js';
import { pool } from '../../src/server/db.js';
import { getStripeClient } from '../../src/server/stripe.js';

const fulfillmentStatuses = new Set(['processing', 'confirmed', 'in-transit', 'delivered', 'cancelled']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function serializeOrder(row: Record<string, any>) {
  return {
    ...row,
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    shipping_cost: Number(row.shipping_cost),
    total: Number(row.total),
    estimated_delivery: row.estimated_delivery instanceof Date
      ? row.estimated_delivery.toISOString().slice(0, 10)
      : row.estimated_delivery,
    items: (row.items || []).map((item: Record<string, any>) => ({
      ...item,
      unit_price: Number(item.unit_price),
      total_price: Number(item.total_price),
    })),
  };
}

async function findOrder(client: PoolClient, orderId: string) {
  const result = await client.query(
    `SELECT o.*, COALESCE((
       SELECT json_agg(oi ORDER BY oi.created_at, oi.id)
       FROM public.order_items oi WHERE oi.order_id = o.id
     ), '[]'::json) AS items
     FROM public.orders o WHERE o.id = $1`,
    [orderId],
  );
  return result.rows[0] ? serializeOrder(result.rows[0]) : null;
}

function asBody(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Authorization');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const auth = await authorizeAdmin(req);
  if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });

  try {
    if (req.method === 'GET') {
      const orderId = typeof req.query.id === 'string' ? req.query.id : null;
      if (orderId !== null) {
        if (!uuidPattern.test(orderId)) return res.status(400).json({ error: 'Invalid order id' });
        const client = await pool.connect();
        try {
          const order = await findOrder(client, orderId);
          return order ? res.status(200).json({ order }) : res.status(404).json({ error: 'Order not found' });
        } finally {
          client.release();
        }
      }
      const page = req.query.page === undefined ? 1 : Number(req.query.page);
      const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);
      if (!Number.isSafeInteger(page) || page < 1 || page > 1000 ||
          !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ error: 'Invalid order page or limit' });
      }
      const [rows, countResult] = await Promise.all([
        pool.query(
          `SELECT o.*, COALESCE((
             SELECT json_agg(oi ORDER BY oi.created_at, oi.id)
             FROM public.order_items oi WHERE oi.order_id = o.id
           ), '[]'::json) AS items
           FROM public.orders o ORDER BY o.created_at DESC, o.id DESC LIMIT $1 OFFSET $2`,
          [limit, (page - 1) * limit],
        ),
        pool.query<{ count: string }>('SELECT count(*)::text AS count FROM public.orders'),
      ]);
      return res.status(200).json({
        orders: rows.rows.map(serializeOrder),
        count: Number(countResult.rows[0].count),
        page,
        limit,
      });
    }

    const body = asBody(req.body);
    if (!body || !uuidPattern.test(String(body.orderId ?? ''))) {
      return res.status(400).json({ error: 'A valid order id is required' });
    }
    const orderId = body.orderId as string;
    if (body.action === 'update-order') {
      if (Object.keys(body).some((key) => !['action', 'orderId', 'status', 'tracking_number', 'estimated_delivery'].includes(key)) ||
          !fulfillmentStatuses.has(String(body.status ?? '')) ||
          !(body.tracking_number === null || typeof body.tracking_number === 'string' && body.tracking_number.trim().length <= 100) ||
          !(body.estimated_delivery === null || typeof body.estimated_delivery === 'string' && datePattern.test(body.estimated_delivery))) {
        return res.status(400).json({ error: 'Invalid order update' });
      }
      const result = await pool.query(
        `UPDATE public.orders SET status = $2, tracking_number = $3,
           estimated_delivery = $4, updated_at = now()
         WHERE id = $1 AND status <> 'refunded' RETURNING id`,
        [orderId, body.status, body.tracking_number, body.estimated_delivery],
      );
      if (!result.rowCount) return res.status(409).json({ error: 'Order not found or already refunded' });
      const client = await pool.connect();
      try {
        return res.status(200).json({ order: await findOrder(client, orderId) });
      } finally {
        client.release();
      }
    }
    if (body.action !== 'refund' || Object.keys(body).some((key) => !['action', 'orderId'].includes(key))) {
      return res.status(400).json({ error: 'Invalid order action' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const selected = await client.query(
        `SELECT id, order_number, user_id, payment_method, payment_status,
                payment_transaction_id, total, currency
         FROM public.orders WHERE id = $1 FOR UPDATE`,
        [orderId],
      );
      const order = selected.rows[0];
      if (!order) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Order not found' });
      }
      if (order.payment_status === 'refunded') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Order is already refunded' });
      }
      if (order.payment_method !== 'credit-card' || order.payment_status !== 'completed' ||
          typeof order.payment_transaction_id !== 'string' || !order.payment_transaction_id.startsWith('pi_')) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Only completed Stripe card orders can be refunded here' });
      }

      const stripe = getStripeClient();
      const intent = await stripe.paymentIntents.retrieve(order.payment_transaction_id);
      const expectedAmount = Math.round(Number(order.total) * (order.currency === 'JMD' ? 1 : 100));
      if (intent.status !== 'succeeded' || intent.metadata.profile_id !== order.user_id ||
          intent.currency.toUpperCase() !== order.currency || intent.amount_received !== expectedAmount) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Stripe payment does not match this order. Contact support.' });
      }
      const refunds = await stripe.refunds.list({ payment_intent: intent.id, limit: 100 });
      const refundedAmount = refunds.data
        .filter((refund) => refund.status === 'succeeded')
        .reduce((sum, refund) => sum + refund.amount, 0);
      if (refunds.has_more || refunds.data.some((refund) => refund.status === 'pending' || refund.status === 'requires_action') ||
          refundedAmount > 0 && refundedAmount < expectedAmount) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Stripe refund needs review. Contact support before retrying.' });
      }
      if (refundedAmount === 0) {
        const refund = await stripe.refunds.create({
          payment_intent: intent.id,
          amount: expectedAmount,
          reason: 'requested_by_customer',
          metadata: { order_id: order.id, order_number: order.order_number },
        }, { idempotencyKey: `source7-admin-refund-${order.id}` });
        if (refund.status !== 'succeeded') {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Stripe refund is pending. Refresh before retrying.' });
        }
      }
      await client.query(
        `UPDATE public.orders SET status = 'refunded', payment_status = 'refunded',
         updated_at = now() WHERE id = $1`,
        [orderId],
      );
      const updated = await findOrder(client, orderId);
      await client.query('COMMIT');
      return res.status(200).json({ order: updated });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Admin orders API failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(503).json({ error: 'Unable to manage orders. Check Stripe and Neon before retrying.' });
  }
}
