import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../src/server/auth.js';
import { cartFingerprint, CheckoutError, createCheckoutQuote, toStripeMinorUnits, type CheckoutCurrency } from '../../src/server/checkout.js';
import { paymentIntentIdempotencyKey } from '../../src/server/checkoutIdempotency.js';
import { getStripeClient } from '../../src/server/stripe.js';
import { pool } from '../../src/server/db.js';

const currencies: CheckoutCurrency[] = ['USD', 'JMD', 'CAD'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticateRequest(req);
  if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });
  try {
    const neonUserId = auth.userId;
    const profileResult = await pool.query<{ id: string; email: string | null; first_name: string | null; last_name: string | null; stripe_customer_id: string | null }>(
      'SELECT id, email, first_name, last_name, stripe_customer_id FROM public.user_profiles WHERE neon_auth_user_id = $1 LIMIT 1', [neonUserId],
    );
    const profile = profileResult.rows[0];
    const profileId = profile?.id;
    if (!profile) return res.status(409).json({ error: 'Account profile is still being created. Try again shortly.' });

    const body = req.body ?? {};
    const currency = String(body.currency || '').toUpperCase() as CheckoutCurrency;
    const shippingMethod = typeof body.shippingMethod === 'string' ? body.shippingMethod : '';
    const attemptId = typeof body.checkoutAttemptId === 'string' ? body.checkoutAttemptId : '';
    const customerEmail = typeof body.customerEmail === 'string' ? body.customerEmail.trim().slice(0, 255) : '';
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim().slice(0, 200) : '';
    if (!currencies.includes(currency) || !shippingMethod || !/^[a-zA-Z0-9-]{20,64}$/.test(attemptId) || !customerEmail || !customerName) {
      return res.status(400).json({ error: 'Checkout details are incomplete or invalid' });
    }

    const { quote, rows, fingerprint } = await createCheckoutQuote(profileId, currency, shippingMethod);
    if (quote.total <= 0) return res.status(400).json({ error: 'Payment amount is invalid' });
    const stripe = getStripeClient();
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || customerEmail,
        name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || customerName,
        metadata: { source7_profile_id: profile.id, neon_auth_user_id: neonUserId },
      }, { idempotencyKey: `source7-customer-${profile.id}` });
      const updated = await pool.query<{ stripe_customer_id: string }>(
        `UPDATE public.user_profiles SET stripe_customer_id = $2
         WHERE id = $1 AND stripe_customer_id IS NULL RETURNING stripe_customer_id`, [profile.id, customer.id],
      );
      customerId = updated.rows[0]?.stripe_customer_id;
      if (!customerId) {
        const latest = await pool.query<{ stripe_customer_id: string | null }>(
          'SELECT stripe_customer_id FROM public.user_profiles WHERE id = $1', [profile.id],
        );
        customerId = latest.rows[0]?.stripe_customer_id || customer.id;
      }
    }
    const intent = await stripe.paymentIntents.create({
      amount: toStripeMinorUnits(quote.total, currency),
      currency: currency.toLowerCase(),
      customer: customerId,
      payment_method_types: ['card'],
      receipt_email: customerEmail,
      metadata: {
        profile_id: profileId,
        cart_fingerprint: cartFingerprint(profileId, rows, currency, shippingMethod),
        currency,
        shipping_method: shippingMethod,
        customer_name: customerName,
      },
    }, { idempotencyKey: paymentIntentIdempotencyKey({
      profileId,
      attemptId,
      cartFingerprint: fingerprint,
      email: customerEmail,
      name: customerName,
    }) });
    return res.status(200).json({ paymentIntentId: intent.id, clientSecret: intent.client_secret, quote });
  } catch (error) {
    console.error('Neon Stripe PaymentIntent creation failed:', error instanceof Error ? error.message : 'unknown error');
    if (error instanceof CheckoutError) return res.status(409).json({ error: error.message });
    return res.status(503).json({ error: 'Unable to prepare payment. Please try again shortly.' });
  }
}
