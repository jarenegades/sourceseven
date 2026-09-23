// @ts-nocheck - Supabase Edge Function (Deno runtime)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req, 'GET, POST, PATCH, OPTIONS');
  if (!isAllowedOrigin(req)) return new Response('Forbidden origin', { status: 403 });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!supabaseUrl || !serviceRoleKey || !token) {
      throw new Error('Missing credentials');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
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

    if (req.method === 'GET') {
      const { data: orders, error } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ orders: orders || [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PATCH' || req.method === 'POST') {
      const { action, orderId, status, tracking_number, estimated_delivery } = await req.json();
      if (req.method === 'POST' && action !== 'update-order') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!orderId) throw new Error('Order ID is required');

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (status) updateData.status = status;
      if (tracking_number !== undefined) updateData.tracking_number = tracking_number;
      if (estimated_delivery !== undefined) updateData.estimated_delivery = estimated_delivery;

      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select(`
          *,
          items:order_items(*)
        `)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ order }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Admin orders error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to manage orders' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
