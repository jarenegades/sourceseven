import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../src/server/auth.js';
import { CheckoutError, placeNeonOrder, type CheckoutCurrency, type CheckoutPaymentMethod } from '../../src/server/checkout.js';
import { getStripeClient } from '../../src/server/stripe.js';
import { pool } from '../../src/server/db.js';

const currencies: CheckoutCurrency[] = ['USD', 'JMD', 'CAD'];
const paymentMethods: CheckoutPaymentMethod[] = ['card', 'cash-on-delivery', 'bank-transfer'];

function readText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const result = value.trim();
  return result && result.length <= max ? result : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const body = req.body ?? {};
    const shipping = body.shipping ?? {};
    const currency = String(body.currency || '').toUpperCase() as CheckoutCurrency;
    const paymentMethod = body.paymentMethod as CheckoutPaymentMethod;
    const shippingMethod = readText(body.shippingMethod, 50);
    const paymentIntentId = readText(body.paymentIntentId, 255) || undefined;
    const checkoutAttemptId = readText(body.checkoutAttemptId, 64);
    const normalizedShipping = {
      fullName: readText(shipping.fullName, 200),
      email: readText(shipping.email, 255),
      phone: typeof shipping.phone === 'string' ? shipping.phone.trim().slice(0, 20) : '',
      address: readText(shipping.address, 255),
      city: readText(shipping.city, 100),
      state: readText(shipping.state, 100),
      zipCode: readText(shipping.zipCode, 20),
      country: readText(shipping.country || 'United States', 100),
    };
    if (!checkoutAttemptId || !/^[a-zA-Z0-9-]{20,64}$/.test(checkoutAttemptId) ||
        !currencies.includes(currency) || !paymentMethods.includes(paymentMethod) || !shippingMethod ||
        Object.values(normalizedShipping).some((value) => value === null)) {
      return res.status(400).json({ error: 'Checkout details are incomplete or invalid' });
    }
    if (paymentMethod === 'card' && !paymentIntentId) {
      return res.status(400).json({ error: 'Payment confirmation is missing' });
    }

    const order = await placeNeonOrder({
      profileId,
      checkoutAttemptId,
      currency,
      shippingMethod,
      paymentMethod,
      paymentIntentId,
      shipping: normalizedShipping as {
        fullName: string; email: string; phone: string; address: string;
        city: string; state: string; zipCode: string; country: string;
      },
      ...(paymentMethod === 'card' ? { stripe: getStripeClient() } : {}),
    });
    return res.status(201).json({ order });
  } catch (error) {
    console.error('Neon order placement failed:', error instanceof Error ? error.message : 'unknown error');
    if (error instanceof CheckoutError) return res.status(409).json({ error: error.message });
    return res.status(503).json({ error: 'Unable to place order. If your card may have been charged, contact support before retrying.' });
  }
}
