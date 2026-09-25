import { getAuthAccessToken, getNeonAuthSessionId, neonAuthClient } from './neonAuthClient';

/** Authentication through Neon Auth. */
export interface User {
  id: string;
  email: string;
  user_metadata?: { first_name?: string; last_name?: string; is_admin?: boolean };
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
  async signUp(email: string, password: string, metadata?: { firstName?: string; lastName?: string }): Promise<AuthResponse> {
    if (!neonAuthClient) return { success: false, error: 'Account creation is not configured. Please try again later.' };
    try {
      const name = [metadata?.firstName, metadata?.lastName].filter(Boolean).join(' ').trim() || email;
      const { data, error } = await neonAuthClient.getBetterAuthInstance().signUp.email({
        email, password, name, callbackURL: window.location.origin,
      });
      if (error) throw error;
      const user = normalizeAuthUser(data?.user);
      if (!user) throw new Error('Neon Auth created the account but returned no user record');
      const { data: sessionData } = await neonAuthClient.getSession();
      return { success: true, user, requiresEmailVerification: !sessionData.session };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message || 'Failed to sign up' };
    }
  },

  async verifySignupEmail(email: string, token: string): Promise<AuthResponse> {
    if (!neonAuthClient) return { success: false, error: 'Email verification is not configured.' };
    const { data, error } = await neonAuthClient.verifyOtp({ email, token, type: 'signup' });
    if (error) return { success: false, error: error.message || 'Email verification failed' };
    return { success: true, user: normalizeAuthUser(data.user) ?? undefined };
  },

  async resendSignupVerification(email: string): Promise<AuthResponse> {
    if (!neonAuthClient) return { success: false, error: 'Email verification is not configured.' };
    const { error } = await neonAuthClient.resend({
      type: 'signup', email, options: { emailRedirectTo: window.location.origin },
    });
    return error
      ? { success: false, error: error.message || 'Could not resend verification email' }
      : { success: true };
  },

  async signIn(email: string, password: string): Promise<AuthResponse> {
    if (!neonAuthClient) return { success: false, error: 'Sign-in is not configured. Please try again later.' };
    try {
      const { data, error } = await neonAuthClient.signInWithPassword({ email, password });
      if (error) throw error;
      const user = normalizeAuthUser(data.user);
      return user ? { success: true, user } : { success: false, error: 'Sign-in returned no user record' };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message || 'Failed to sign in' };
    }
  },

  async signOut(): Promise<AuthResponse> {
    if (!neonAuthClient) return { success: false, error: 'Authentication is not configured' };
    try {
      const { error } = await neonAuthClient.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message || 'Failed to sign out' };
    }
  },

  async getSession() {
    if (!neonAuthClient) return null;
    try {
      const { data, error } = await neonAuthClient.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Get Neon Auth session error:', error);
      return null;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    if (!neonAuthClient) return null;
    try {
      const { data, error } = await neonAuthClient.getUser();
      if (error) throw error;
      return normalizeAuthUser(data.user);
    } catch (error) {
      console.error('Get Neon Auth user error:', error);
      return null;
    }
  },

  async isAdmin(): Promise<boolean> {
    const token = await getAuthAccessToken();
    if (!token) return false;
    const sessionId = await getNeonAuthSessionId();
    try {
      const response = await fetch('/api/auth/admin-status', {
        headers: { Authorization: `Bearer ${token}`, ...(sessionId ? { 'X-Neon-Session-Id': sessionId } : {}) },
        cache: 'no-store',
      });
      if (!response.ok) return false;
      const result = await response.json();
      return result.is_admin === true;
    } catch (error) {
      console.error('Check Neon Auth admin status error:', error);
      return false;
    }
  },

  async resetPassword(email: string): Promise<AuthResponse> {
    if (!neonAuthClient) return { success: false, error: 'Password recovery is not configured' };
    try {
      const { error } = await neonAuthClient.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Reset password error:', error);
      return { success: false, error: error.message || 'Failed to send reset email' };
    }
  },

  async updatePassword(newPassword: string, resetToken?: string | null): Promise<AuthResponse> {
    if (!neonAuthClient) return { success: false, error: 'Password updates are not configured' };
    try {
      if (!resetToken) return { success: false, error: 'The password reset link is invalid or expired' };
      const { error } = await (neonAuthClient.getBetterAuthInstance() as any).resetPassword({ newPassword, token: resetToken });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Update password error:', error);
      return { success: false, error: error.message || 'Failed to update password' };
    }
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    if (!neonAuthClient) return { unsubscribe: () => {} };
    const { data: { subscription } } = neonAuthClient.onAuthStateChange((_event, session) => {
      callback(normalizeAuthUser(session?.user));
    });
    return subscription;
  },
};
