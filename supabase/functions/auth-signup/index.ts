/**
 * Supabase Edge Function for User Signup
 * This bypasses CORS issues by handling authentication server-side
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  if (!isAllowedOrigin(req)) return new Response('Forbidden origin', { status: 403 });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, firstName, lastName } = await req.json();

    // Validate input
    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and password are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Supabase service role client (bypasses RLS)
    // Use built-in Supabase env vars (automatically available in Edge Functions)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!serviceRoleKey,
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error: Missing Supabase credentials' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create user using Supabase Auth Admin API
    console.log('Attempting to create user with email:', email);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email to avoid verification step
      user_metadata: {
        first_name: firstName || '',
        last_name: lastName || '',
        is_admin: false,
      },
    });
    
    console.log('Create user response:', { 
      hasData: !!authData, 
      hasUser: !!authData?.user,
      hasError: !!authError,
      errorMessage: authError?.message 
    });

    if (authError) {
      console.error('Auth error:', authError);
      console.error('Auth error code:', authError.status);
      console.error('Auth error message:', authError.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authError.message || 'Failed to create user in auth system',
          code: authError.status 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!authData || !authData.user) {
      console.error('No user data returned from auth.admin.createUser');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create user - no user data returned' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: email, // Store email in user_profiles for easier querying
        first_name: firstName || '',
        last_name: lastName || '',
        is_admin: false,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      console.error('Profile error code:', profileError.code);
      console.error('Profile error message:', profileError.message);
      console.error('Profile error details:', profileError.details);
      console.error('Profile error hint:', profileError.hint);
      
      // 23505 is duplicate key - profile might already exist, which is OK
      if (profileError.code !== '23505') {
        // If profile creation fails but user was created, we should still return success
        // but log the error. The user can still sign in.
        console.warn('⚠️ Profile creation failed but user was created in auth.users');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Signup error (catch block):', error);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Database error creating new user',
        errorName: error?.name,
        details: error?.stack ? error.stack.substring(0, 500) : 'No stack trace'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

