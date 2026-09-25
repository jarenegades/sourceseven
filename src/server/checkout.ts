import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import type Stripe from 'stripe';
import { pool } from './db.js';
import { recoverPaidCheckout } from './checkoutRecovery.js';

export type CheckoutCurrency = 'USD' | 'JMD' | 'CAD';
export type CheckoutPaymentMethod = 'card' | 'cash-on-delivery' | 'bank-transfer';

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutError';
  }
}

type CartRow = {
  product_id: string;
  quantity: number;
  name: string;
  image_url: string;
  price: string;
  stock_count: number;
};

export type CheckoutQuote = {
  currency: CheckoutCurrency;
  shippingMethod: string;
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
};

const fallbackRates: Record<CheckoutCurrency, number> = { USD: 1, JMD: 155.75, CAD: 1.35 };

function roundMoney(amount: number, currency: CheckoutCurrency): number {
  return currency === 'JMD' ? Math.round(amount) : Math.round(amount * 100) / 100;
}

export function toStripeMinorUnits(amount: number, currency: CheckoutCurrency): number {
  return currency === 'JMD' ? Math.round(amount) : Math.round(amount * 100);
}

export function cartFingerprint(profileId: string, rows: CartRow[], currency: CheckoutCurrency, shippingMethod: string): string {
  const canonical = JSON.stringify({
    profileId,
    currency,
    shippingMethod,
    items: [...rows].sort((a, b) => a.product_id.localeCompare(b.product_id)).map((row) => ({
      productId: row.product_id,
      quantity: row.quantity,
      price: Number(row.price),
    })),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

async function getRate(client: PoolClient, currency: CheckoutCurrency): Promise<number> {
  if (currency === 'USD') return 1;
  const result = await client.query<{ rate: string }>(
    'SELECT rate FROM public.currency_rates WHERE currency = $1 LIMIT 1', [currency],
  );
  const rate = Number(result.rows[0]?.rate);
  return Number.isFinite(rate) && rate > 0 ? rate : fallbackRates[currency];
}

async function getCartRows(client: PoolClient, profileId: string, lock: boolean, allowEmpty = false): Promise<CartRow[]> {
  const result = await client.query<CartRow>(
    `SELECT ci.product_id, ci.quantity, p.name, p.image_url, p.price, p.stock_count
     FROM public.cart_items ci JOIN public.products p ON p.id = ci.product_id
     WHERE ci.user_id = $1 AND p.is_active = true
     ORDER BY ci.product_id ${lock ? 'FOR UPDATE OF ci, p' : ''}`,
    [profileId],
  );
  if (!result.rows.length && !allowEmpty) throw new CheckoutError('Your cart is empty');
  for (const row of result.rows) {
    if (row.quantity <= 0 || row.quantity > row.stock_count) {
      throw new CheckoutError(`Insufficient stock for ${row.name}. Update your cart and try again.`);
    }
  }
  return result.rows;
}

export async function createCheckoutQuote(profileId: string, currency: CheckoutCurrency, shippingMethod: string) {
  const client = await pool.connect();
  try {
    const rows = await getCartRows(client, profileId, false);
    const methodResult = await client.query<{ price: string; free_shipping_threshold: string | null }>(
      `SELECT price, free_shipping_threshold FROM public.shipping_methods
       WHERE code = $1 AND is_active = true LIMIT 1`, [shippingMethod],
    );
    const method = methodResult.rows[0];
    if (!method) throw new CheckoutError('Selected shipping method is unavailable');
    const rate = await getRate(client, currency);
    const subtotal = roundMoney(rows.reduce((sum, row) => sum + Number(row.price) * row.quantity * rate, 0), currency);
    const threshold = method.free_shipping_threshold == null
      ? null : Number(method.free_shipping_threshold) * rate;
    const shippingCost = threshold !== null && subtotal >= threshold
      ? 0 : roundMoney(Number(method.price) * rate, currency);
    const tax = roundMoney(subtotal * 0.08, currency);
    const quote: CheckoutQuote = { currency, shippingMethod, subtotal, tax, shippingCost, total: roundMoney(subtotal + tax + shippingCost, currency) };
    return { quote, rows, fingerprint: cartFingerprint(profileId, rows, currency, shippingMethod) };
  } finally {
    client.release();
  }
}

export async function placeNeonOrder(input: {
  profileId: string;
  checkoutAttemptId: string;
  currency: CheckoutCurrency;
  shippingMethod: string;
  paymentMethod: CheckoutPaymentMethod;
  paymentIntentId?: string;
  shipping: {
    fullName: string; email: string; phone?: string; address: string;
    city: string; state: string; zipCode: string; country?: string;
  };
  stripe?: Stripe;
}) {
  const client = await pool.connect();
  let verifiedPaymentIntentId: string | null = null;
  let refundAlreadyAttempted = false;
  try {
    await client.query('BEGIN');

    if (input.paymentIntentId) {
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM public.orders WHERE payment_transaction_id = $1 AND user_id = $2 LIMIT 1',
        [input.paymentIntentId, input.profileId],
      );
      if (existing.rows[0]) {
        const order = await fetchOrder(client, existing.rows[0].id);
        await client.query('COMMIT');
        return order;
      }
    }

    // Lock the current cart first so concurrent retries serialize. An earlier
    // successful request may already have cleared it, so check the attempt key
    // before reporting an empty cart.
    const rows = await getCartRows(client, input.profileId, true, true);
    const existingAttempt = await client.query<{ id: string }>(
      'SELECT id FROM public.orders WHERE user_id = $1 AND checkout_attempt_id = $2 LIMIT 1',
      [input.profileId, input.checkoutAttemptId],
    );
    if (existingAttempt.rows[0]) {
      const order = await fetchOrder(client, existingAttempt.rows[0].id);
      await client.query('COMMIT');
      return order;
    }
    if (!rows.length) throw new CheckoutError('Your cart is empty');

    const methodResult = await client.query<{ price: string; free_shipping_threshold: string | null }>(
      `SELECT price, free_shipping_threshold FROM public.shipping_methods
       WHERE code = $1 AND is_active = true LIMIT 1`, [input.shippingMethod],
    );
    const method = methodResult.rows[0];
    if (!method) throw new CheckoutError('Selected shipping method is unavailable');
    const rate = await getRate(client, input.currency);
    const subtotal = roundMoney(rows.reduce((sum, row) => sum + Number(row.price) * row.quantity * rate, 0), input.currency);
    const threshold = method.free_shipping_threshold == null ? null : Number(method.free_shipping_threshold) * rate;
    const shippingCost = threshold !== null && subtotal >= threshold ? 0 : roundMoney(Number(method.price) * rate, input.currency);
    const tax = roundMoney(subtotal * 0.08, input.currency);
    const total = roundMoney(subtotal + tax + shippingCost, input.currency);
    const fingerprint = cartFingerprint(input.profileId, rows, input.currency, input.shippingMethod);

    if (input.paymentMethod === 'card') {
      if (!input.paymentIntentId || !input.stripe) throw new CheckoutError('Payment confirmation is missing');
      const intent = await input.stripe.paymentIntents.retrieve(input.paymentIntentId);
      const belongsToCustomer = intent.metadata.profile_id === input.profileId;
      if (intent.status === 'succeeded' && belongsToCustomer) {
        const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id;
        if (!chargeId) throw new CheckoutError('The payment charge could not be verified. Contact support before retrying.');
        const charge = await input.stripe.charges.retrieve(chargeId);
        if (charge.amount_refunded > 0) {
          throw new CheckoutError('This payment was already refunded. Start a new checkout to try again.');
        }
        verifiedPaymentIntentId = intent.id;
      }
      const matchesCurrentCart = intent.metadata.cart_fingerprint === fingerprint &&
        intent.metadata.currency === input.currency && intent.metadata.shipping_method === input.shippingMethod &&
        intent.amount_received === toStripeMinorUnits(total, input.currency) && intent.currency === input.currency.toLowerCase();
      if (intent.status !== 'succeeded' || !belongsToCustomer || !matchesCurrentCart) {
        if (intent.status === 'succeeded' && belongsToCustomer && !matchesCurrentCart) {
          refundAlreadyAttempted = true;
          try {
            await input.stripe.refunds.create({
              payment_intent: intent.id,
              metadata: { source7_reason: 'checkout_cart_changed_before_order_creation' },
            }, { idempotencyKey: `source7-cart-mismatch-refund-${intent.id}` });
            throw new CheckoutError('Your cart changed during payment, so the charge was automatically refunded. Please review your cart and try again.');
          } catch (refundError) {
            if (refundError instanceof CheckoutError) throw refundError;
            console.error('Could not refund a checkout with changed cart:', refundError instanceof Error ? refundError.message : 'unknown error');
            throw new CheckoutError('Your cart changed during payment and could not be automatically refunded. Contact support before trying again.');
          }
        }
        throw new CheckoutError('Payment or cart details no longer match. Contact support if your card was charged.');
      }
    } else {
      const paymentMethodResult = await client.query(
        `SELECT 1 FROM public.payment_methods WHERE code = $1 AND is_active = true LIMIT 1`, [input.paymentMethod],
      );
      if (!paymentMethodResult.rowCount) throw new CheckoutError('Selected payment method is unavailable');
    }

    const status = input.paymentMethod === 'card' ? 'processing' : 'processing';
    const paymentStatus = input.paymentMethod === 'card' ? 'completed' : 'pending';
    const paymentCode = input.paymentMethod === 'card' ? 'credit-card' : input.paymentMethod;
    const created = await client.query<{ id: string }>(
      `INSERT INTO public.orders (
         user_id, status, subtotal, tax, shipping_cost, total, currency, shipping_method,
         shipping_full_name, shipping_email, shipping_phone, shipping_address,
         shipping_city, shipping_state, shipping_zip_code, shipping_country,
         payment_method, payment_status, payment_transaction_id, checkout_attempt_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING id`,
      [input.profileId, status, subtotal, tax, shippingCost, total, input.currency, input.shippingMethod,
        input.shipping.fullName, input.shipping.email, input.shipping.phone || null,
        input.shipping.address, input.shipping.city, input.shipping.state, input.shipping.zipCode,
        input.shipping.country || 'United States', paymentCode, paymentStatus, input.paymentIntentId || null,
        input.checkoutAttemptId],
    );
    const orderId = created.rows[0].id;
    for (const row of rows) {
      const unitPrice = roundMoney(Number(row.price) * rate, input.currency);
      await client.query(
        `INSERT INTO public.order_items (order_id, product_id, product_name, product_image_url, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, row.product_id, row.name, row.image_url, row.quantity, unitPrice, roundMoney(unitPrice * row.quantity, input.currency)],
      );
    }
    if (input.paymentMethod === 'card') {
      await client.query(`UPDATE public.orders SET status = 'confirmed' WHERE id = $1`, [orderId]);
    }
    await client.query('DELETE FROM public.cart_items WHERE user_id = $1', [input.profileId]);
    const order = await fetchOrder(client, orderId);
    await client.query('COMMIT');
    return order;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (verifiedPaymentIntentId && input.stripe && !refundAlreadyAttempted) {
      // COMMIT can fail after the database accepted it. Check for the order
      // before refunding so a committed order is not paired with a refund.
      try {
        const recovery = await recoverPaidCheckout({
          findOrder: async () => {
            const recoveryClient = await pool.connect();
            try {
              const existing = await recoveryClient.query<{ id: string }>(
                'SELECT id FROM public.orders WHERE payment_transaction_id = $1 AND user_id = $2 LIMIT 1',
                [verifiedPaymentIntentId, input.profileId],
              );
              return existing.rows[0] ? await fetchOrder(recoveryClient, existing.rows[0].id) : null;
            } finally {
              recoveryClient.release();
            }
          },
          refund: async () => {
            await input.stripe!.refunds.create({
              payment_intent: verifiedPaymentIntentId!,
              metadata: { source7_reason: 'order_persistence_failed' },
            }, { idempotencyKey: `source7-order-failure-refund-${verifiedPaymentIntentId}` });
          },
        });
        if (recovery.outcome === 'order-exists') return recovery.order;
        throw new CheckoutError('We could not save the order and requested a refund. Please contact support before trying checkout again.');
      } catch (reconciliationError) {
        if (reconciliationError instanceof CheckoutError) throw reconciliationError;
        console.error('Could not reconcile the order after a database error:', reconciliationError instanceof Error ? reconciliationError.message : 'unknown error');
        throw new CheckoutError('Payment completed, but the order could not be confirmed or refunded. Contact support before retrying.');
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

async function fetchOrder(client: PoolClient, orderId: string) {
  const result = await client.query(
    `SELECT o.*, COALESCE(json_agg(oi ORDER BY oi.created_at) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
     FROM public.orders o LEFT JOIN public.order_items oi ON oi.order_id = o.id
     WHERE o.id = $1 GROUP BY o.id`, [orderId],
  );
  const order = result.rows[0];
  if (!order) throw new Error('Order could not be loaded');
  return order;
}
