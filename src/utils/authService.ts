import { supabase } from './supabaseClient';
import { config } from './config';
import { getAuthAccessToken, neonAuthClient } from './neonAuthClient';

/**
 * Authentication Service - Handles user authentication with Supabase
 */

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    is_admin?: boolean;
  };
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  requiresEmailVerification?: boolean;
}

function normalizeAuthUser(rawUser: any): User | null {
  if (!rawUser?.id || !rawUser?.email) return null;
  const metadata = rawUser.user_metadata || rawUser.userMetadata || {};
  const fullName = typeof rawUser.name === 'string' ? rawUser.name.trim() : '';
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  return {
    id: String(rawUser.id),
    email: String(rawUser.email),
    user_metadata: {
      ...metadata,
      first_name: metadata.first_name || nameParts[0] || '',
      last_name: metadata.last_name || nameParts.slice(1).join(' '),
    },
  };
}

export const authService = {
  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string, metadata?: { firstName?: string; lastName?: string }): Promise<AuthResponse> {
    if (!neonAuthClient && !config.useSupabase) {
      return {
        success: false,
        error: 'Account creation is not configured. Please try again later.'
      };
    }

    try {
      if (neonAuthClient) {
        const name = [metadata?.firstName, metadata?.lastName].filter(Boolean).join(' ').trim() || email;
        const { data: signUpData, error: signUpError } = await neonAuthClient.getBetterAuthInstance().signUp.email({
          email,
          password,
          name,
          callbackURL: window.location.origin,
        });
        if (signUpError) throw signUpError;

        const user = normalizeAuthUser(signUpData?.user);
        if (!user) throw new Error('Neon Auth created the account but returned no user record');
        const { data: sessionData } = await neonAuthClient.getSession();
        return { success: true, user, requiresEmailVerification: !sessionData.session };
      }
      console.log('🔵 Attempting Supabase sign up for:', email);
      
      // This project uses Supabase Auth directly. The legacy Edge Functions are not
      // deployed in the new Supabase project and must not determine sign-up success.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: metadata?.firstName || '',
            last_name: metadata?.lastName || '',
          },
        },
      });

      if (error) {
        // If CORS error, provide helpful message
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
          const origin = window.location.origin;
          return {
            success: false,
            error: `CORS error: Please configure Supabase to allow ${origin}. Go to Supabase Dashboard → Authentication → URL Configuration and add ${origin} to Redirect URLs.`,
          };
        }
        console.error('❌ Supabase auth.signUp error:', error);
        throw error;
      }

      if (data.user) {
        console.log('✅ User created in auth, now creating profile...');
        // The database trigger creates the customer profile securely on signup.

        if (config.debugMode) {
          console.log('✅ User signed up successfully:', data.user.email);
        }

        return {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email!,
            user_metadata: data.user.user_metadata,
          },
        };
      }

      return {
        success: false,
        error: 'Failed to create user',
      };
    } catch (error: any) {
      console.error('❌ Sign up error details:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      return {
        success: false,
        error: error.message || 'Failed to sign up',
      };
    }
  },

  /**
   * Sign in existing user
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    if (!neonAuthClient && !config.useSupabase) {
      return {
        success: false,
        error: 'Sign-in is not configured. Please try again later.'
      };
    }

    try {
      if (neonAuthClient) {
        const { data, error } = await neonAuthClient.signInWithPassword({ email, password });
        if (error) throw error;
        const user = normalizeAuthUser(data.user);
        return user ? { success: true, user } : { success: false, error: 'Sign-in returned no user record' };
      }
      // Sign in directly with Supabase Auth.
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // If CORS error, provide helpful message
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
          const origin = window.location.origin;
          return {
            success: false,
            error: `CORS error: Please configure Supabase to allow ${origin}. Go to Supabase Dashboard → Authentication → URL Configuration and add ${origin} to Redirect URLs.`,
          };
        }
        throw error;
      }

      if (data.user) {
        if (config.debugMode) {
          console.log('✅ User signed in successfully:', data.user.email);
        }

        return {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email!,
            user_metadata: data.user.user_metadata,
          },
        };
      }

      return {
        success: false,
        error: 'Failed to sign in',
      };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign in',
      };
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<AuthResponse> {
    if (!neonAuthClient && !config.useSupabase) {
      return {
        success: false,
        error: 'Authentication is not configured'
      };
    }

    try {
      if (neonAuthClient) {
        const { error } = await neonAuthClient.signOut();
        if (error) throw error;
        return { success: true };
      }
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      if (config.debugMode) {
        console.log('✅ User signed out successfully');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Sign out error:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign out',
      };
    }
  },

  /**
   * Get current session
   */
  async getSession() {
    if (neonAuthClient) {
      try {
        const { data, error } = await neonAuthClient.getSession();
        if (error) throw error;
        return data.session;
      } catch (error) {
        console.error('Get Neon Auth session error:', error);
        return null;
      }
    }

    if (!config.useSupabase || !supabase) {
      return null;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) throw error;

      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    if (neonAuthClient) {
      try {
        const { data, error } = await neonAuthClient.getUser();
        if (error) throw error;
        return normalizeAuthUser(data.user);
      } catch (error) {
        console.error('Get Neon Auth user error:', error);
        return null;
      }
    }

    if (!config.useSupabase || !supabase) {
      return null;
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) throw error;

      if (user) {
        return {
          id: user.id,
          email: user.email!,
          user_metadata: user.user_metadata,
        };
      }

      return null;
    } catch (error: any) {
      // Handle network errors gracefully
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('ERR_NAME_NOT_RESOLVED') ||
          error.name === 'AuthRetryableFetchError') {
        console.warn('⚠️ Network error: Cannot reach Supabase. Check your internet connection.');
        return null; // Return null instead of throwing
      }
      
      // Only log errors that aren't "session missing" (which is normal when not logged in)
      if (error.message !== 'Auth session missing!') {
        console.error('Get user error:', error);
      }
      return null;
    }
  },

  /**
   * Check if user is admin
   */
  async isAdmin(): Promise<boolean> {
    if (neonAuthClient) {
      const token = await getAuthAccessToken();
      if (!token) return false;
      try {
        const response = await fetch('/api/auth/admin-status', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!response.ok) return false;
        const result = await response.json();
        return result.is_admin === true;
      } catch (error) {
        console.error('Check Neon Auth admin status error:', error);
        return false;
      }
    }

    if (!config.useSupabase) {
      return false;
    }

    try {
      const user = await this.getCurrentUser();
      if (!user) return false;

      // Check user_profiles table for admin status
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Check admin error:', error);
        return false;
      }

      return data?.is_admin || false;
    } catch (error) {
      console.error('Check admin error:', error);
      return false;
    }
  },

  /**
   * Create user profile after signup
   */
  async createUserProfile(userId: string, _email: string, metadata?: { firstName?: string; lastName?: string }) {
    if (!config.useSupabase) {
      return;
    }

    try {
      console.log('🔵 Creating user profile for user ID:', userId);
      // @ts-ignore - JSR Supabase typing
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: _email, // Store email in user_profiles for easier querying
          first_name: metadata?.firstName || '',
          last_name: metadata?.lastName || '',
          is_admin: false,
        });

      if (error) {
        console.error('❌ Profile creation error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        
        // 23505 is duplicate key error - this is OK, profile already exists
        if (error.code !== '23505') {
          throw error;
        } else {
          console.log('⚠️ Profile already exists, continuing...');
        }
      } else {
        console.log('✅ User profile created successfully');
      }
    } catch (error: any) {
      console.error('❌ Create profile exception:', error);
      // Don't throw - allow signup to continue even if profile creation fails
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: { firstName?: string; lastName?: string; phone?: string }) {
    if (!config.useSupabase) {
      return { success: false, error: 'Supabase is disabled' };
    }

    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // @ts-ignore - JSR Supabase typing
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          phone: updates.phone,
        })
        .eq('id', user.id);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update profile',
      };
    }
  },

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<AuthResponse> {
    if (!neonAuthClient && !config.useSupabase) {
      return {
        success: false,
        error: 'Password recovery is not configured'
      };
    }

    try {
      if (neonAuthClient) {
        const { error } = await neonAuthClient.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        return { success: true };
      }
      console.log('🔵 Attempting password reset for email:', email);
      const redirectUrl = `${window.location.origin}/reset-password`;
      console.log('🔵 Redirect URL:', redirectUrl);
      
      // Send the reset email directly through Supabase Auth.
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        // If CORS error, provide helpful message
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
          const origin = window.location.origin;
          return {
            success: false,
            error: `CORS error: Please configure Supabase to allow ${origin}. Go to Supabase Dashboard → Authentication → URL Configuration and add ${origin} to Redirect URLs.`,
          };
        }
        console.error('❌ Password reset error:', error);
        throw error;
      }

      console.log('✅ Password reset email sent successfully:', data);
      
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('❌ Reset password error details:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      return {
        success: false,
        error: error.message || 'Failed to send reset email',
      };
    }
  },

  /**
   * Update password for current user
   */
  async updatePassword(newPassword: string, resetToken?: string | null): Promise<AuthResponse> {
    if (!neonAuthClient && !config.useSupabase) {
      return {
        success: false,
        error: 'Password updates are not configured'
      };
    }

    try {
      if (neonAuthClient) {
        if (!resetToken) return { success: false, error: 'The password reset link is invalid or expired' };
        const { error } = await (neonAuthClient.getBetterAuthInstance() as any).resetPassword({
          newPassword,
          token: resetToken,
        });
        if (error) throw error;
        return { success: true };
      }
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Update password error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update password',
      };
    }
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    if (neonAuthClient) {
      const { data: { subscription } } = neonAuthClient.onAuthStateChange((_event, session) => {
        callback(normalizeAuthUser(session?.user));
      });
      return subscription;
    }

    if (!config.useSupabase || !supabase) {
      return { unsubscribe: () => {} };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (config.debugMode) {
          console.log('Auth state changed:', event);
        }

        if (session?.user) {
          callback({
            id: session.user.id,
            email: session.user.email!,
            user_metadata: session.user.user_metadata,
          });
        } else {
          callback(null);
        }
      }
    );

    return subscription;
  },
};
