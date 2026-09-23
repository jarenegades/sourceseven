// @ts-nocheck - Supabase Edge Function (Deno runtime)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount);

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  if (!isAllowedOrigin(req)) return new Response('Forbidden origin', { status: 403 });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const fromEmail = Deno.env.get('ORDER_NOTIFICATION_FROM_EMAIL') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase service credentials');
    }

    if (!resendApiKey || !fromEmail) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          message: 'Notification provider is not configured',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const payload = await req.json();
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('order_notification_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000002')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      throw settingsError;
    }

    if (!settings?.notifications_enabled) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, message: 'Notifications are disabled' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: routes, error: routesError } = await supabaseAdmin
      .from('supplier_notification_routes')
      .select('*')
      .eq('is_enabled', true);

    if (routesError) {
      throw routesError;
    }

    const orderItems = Array.isArray(payload.items) ? payload.items : [];
    const adminRecipients = Array.isArray(settings.admin_emails)
      ? settings.admin_emails.filter(Boolean)
      : [];
    const { data: customerPreferences } = payload.userId
      ? await supabaseAdmin
          .from('user_notification_preferences')
          .select('order_updates')
          .eq('user_id', payload.userId)
          .single()
      : { data: null };
    const shouldEmailCustomer = customerPreferences?.order_updates ?? true;

    const supplierMap = new Map<string, typeof orderItems>();
    for (const route of routes || []) {
      const matchedItems = orderItems.filter((item) => {
        if (!item.categoryId) return false;
        if (route.subcategory_id) {
          return item.categoryId === route.category_id && item.subcategoryId === route.subcategory_id;
        }
        return item.categoryId === route.category_id;
      });

      if (matchedItems.length === 0) continue;

      const existing = supplierMap.get(route.email) || [];
      supplierMap.set(route.email, [...existing, ...matchedItems]);
    }

    const buildHtml = (recipientType: 'admin' | 'supplier', items: typeof orderItems) => {
      const itemsMarkup = items
        .map(
          (item) => `
            <tr>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.productName)}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.quantity}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.categoryId || item.category || 'Uncategorized')}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${formatCurrency(item.totalPrice, payload.currency)}</td>
            </tr>
          `
        )
        .join('');

      return `
        <div style="font-family:Arial,sans-serif;color:#111827;">
          <h2>${recipientType === 'admin' ? 'New order completed' : 'Supplier order notification'}</h2>
          <p><strong>Order:</strong> ${escapeHtml(payload.orderNumber)}</p>
          <p><strong>Customer:</strong> ${escapeHtml(payload.customer.fullName)} (${escapeHtml(payload.customer.email)})</p>
          <p><strong>Phone:</strong> ${escapeHtml(payload.customer.phone)}</p>
          <p><strong>Total:</strong> ${formatCurrency(payload.total, payload.currency)}</p>
          <p><strong>Shipping:</strong> ${escapeHtml(
            `${payload.shipping.address}, ${payload.shipping.city}, ${payload.shipping.state} ${payload.shipping.zipCode}, ${payload.shipping.country}`
          )}</p>
          <p><strong>Method:</strong> ${escapeHtml(payload.shipping.method)}</p>
          <table style="border-collapse:collapse;width:100%;margin-top:16px;">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #d1d5db;">Item</th>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #d1d5db;">Qty</th>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #d1d5db;">Category</th>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #d1d5db;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsMarkup}</tbody>
          </table>
        </div>
      `;
    };

    const sendEmail = async (to: string[], subject: string, html: string) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to,
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API error: ${errorText}`);
      }
    };

    if (adminRecipients.length > 0) {
      await sendEmail(
        adminRecipients,
        `Order completed: ${payload.orderNumber}`,
        buildHtml('admin', orderItems)
      );
    }

    if (shouldEmailCustomer && payload.customer?.email) {
      await sendEmail(
        [payload.customer.email],
        `Your order receipt: ${payload.orderNumber}`,
        buildHtml('admin', orderItems)
      );
    }

    for (const [email, items] of supplierMap.entries()) {
      const uniqueItems = items.filter(
        (item, index, all) =>
          all.findIndex((candidate) => candidate.productId === item.productId) === index
      );

      await sendEmail(
        [email],
        `Supplier notification: ${payload.orderNumber}`,
        buildHtml('supplier', uniqueItems)
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        adminRecipientCount: adminRecipients.length,
        customerRecipientCount: shouldEmailCustomer && payload.customer?.email ? 1 : 0,
        supplierRecipientCount: supplierMap.size,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Order notification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Failed to send notifications' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
