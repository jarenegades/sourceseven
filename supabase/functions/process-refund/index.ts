// @ts-nocheck - Supabase Edge Function (Deno runtime)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno';
import { createCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  if (!isAllowedOrigin(req)) return new Response('Forbidden origin', { status: 403 });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !token) {
      throw new Error('Missing credentials');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin')
      .eq('id', authData.user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { orderId } = await req.json();
    if (!orderId) throw new Error('Order ID is required');

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw new Error('Order not found');
    if (!order.payment_transaction_id) throw new Error('No Stripe payment transaction found for this order');
    if (order.payment_status === 'refunded') throw new Error('Order is already refunded');

    await stripe.refunds.create({
      payment_intent: order.payment_transaction_id,
      reason: 'requested_by_customer',
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
      },
    });

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'refunded',
        payment_status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select(`
        *,
        items:order_items(*)
      `)
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ order: updatedOrder }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Refund error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to process refund' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
