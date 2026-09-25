import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../src/server/auth.js';
import { pool } from '../../src/server/db.js';
import { getStripeClient } from '../../src/server/stripe.js';

function getReturnUrl(req: VercelRequest): string {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) return new URL('/account?security=1', configured).toString();
  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost}/account?security=1`;
  const host = req.headers.host || '';
  if (host === 'localhost:5173' || host.endsWith('.vercel.app')) return `https://${host}/account?security=1`;
  throw new Error('Set APP_BASE_URL in Vercel before creating a Stripe customer portal session');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const auth = await authenticateRequest(req);
  if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });

  try {
    const profileResult = await pool.query<{
      id: string; email: string | null; first_name: string | null; last_name: string | null; stripe_customer_id: string | null;
    }>(
      `SELECT id, email, first_name, last_name, stripe_customer_id
       FROM public.user_profiles WHERE neon_auth_user_id = $1 LIMIT 1`, [auth.userId],
    );
    const profile = profileResult.rows[0];
    if (!profile) return res.status(409).json({ error: 'Account profile is still being created. Try again shortly.' });

    const stripe = getStripeClient();
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || undefined,
        name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined,
        metadata: { source7_profile_id: profile.id, neon_auth_user_id: auth.userId },
      }, { idempotencyKey: `source7-customer-${profile.id}` });
      const saved = await pool.query<{ stripe_customer_id: string }>(
        `UPDATE public.user_profiles SET stripe_customer_id = $2
         WHERE id = $1 AND stripe_customer_id IS NULL RETURNING stripe_customer_id`, [profile.id, customer.id],
      );
      customerId = saved.rows[0]?.stripe_customer_id;
      if (!customerId) {
        const latest = await pool.query<{ stripe_customer_id: string | null }>(
          'SELECT stripe_customer_id FROM public.user_profiles WHERE id = $1', [profile.id],
        );
        customerId = latest.rows[0]?.stripe_customer_id || customer.id;
      }
    }

    if (req.method === 'POST') {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: getReturnUrl(req),
      });
      return res.status(200).json({ url: session.url });
    }

    const methods = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
    return res.status(200).json({ paymentMethods: methods.data.map((method) => ({
      id: method.id,
      brand: method.card?.brand || 'card',
      last4: method.card?.last4 || '••••',
      expMonth: method.card?.exp_month ?? null,
      expYear: method.card?.exp_year ?? null,
      isDefault: false,
    })) });
  } catch (error) {
    console.error('Stripe payment-method management failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(503).json({ error: error instanceof Error ? error.message : 'Unable to load payment methods' });
  }
}
