/**
 * Supabase Edge Function: create-payment-intent
 * 
 * ⚠️ NOTE: This file is meant to run on Supabase Edge Functions (Deno runtime).
 * The TypeScript errors you see in VS Code are expected and can be ignored.
 * This file will run correctly when deployed to Supabase.
 * 
 * This function creates a Stripe Payment Intent on the server-side
 * to securely process payments without exposing your secret key.
 * 
 * Setup Instructions:
 * 1. Install Supabase CLI: npm install -g supabase
 * 2. Deploy this function: supabase functions deploy create-payment-intent
 * 3. Set Stripe secret key: supabase secrets set STRIPE_SECRET_KEY=sk_test_...
 * 
 * Alternatively, you can use any backend (Node.js, Express, Next.js API routes, etc.)
 */

// @ts-nocheck - This runs on Deno, not Node.js
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno';
import { createCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  if (!isAllowedOrigin(req)) return new Response('Forbidden origin', { status: 403 });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, currency, customerEmail, customerName, metadata } = await req.json();

    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents
      currency: currency || 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: customerEmail,
      metadata: {
        customer_name: customerName,
        ...metadata,
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
