import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { authService } from '../utils/authService';
import { config } from '../utils/config';
const logoImage = '/source-7-icon.png';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Neon Auth reset links carry a token in the query string.
    const checkSession = () => {
      if (!config.useNeonAuth) return;
      const resetToken = new URLSearchParams(window.location.search).get('token');
      if (!resetToken) {
        toast.error('Invalid or expired reset link. Please request a new password reset.');
        window.location.href = '/';
      }
    };

    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast.error('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      if (config.useNeonAuth) {
        const resetToken = new URLSearchParams(window.location.search).get('token');
        const result = await authService.updatePassword(password, resetToken);
        
        if (result.success) {
          toast.success('Password updated successfully! You can now sign in with your new password.');
          // Redirect to home after a short delay
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          toast.error(result.error || 'Failed to update password');
        }
      } else {
        toast.error('Password updates are temporarily unavailable.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('An error occurred while updating your password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoImage} alt="Source Sevens" className="h-20 w-auto" />
          </div>
          <CardTitle className="text-[#003366]">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#DC143C] hover:bg-[#B01030] text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="link"
              className="text-sm text-[#003366] hover:text-[#002244] p-0"
              onClick={() => window.location.href = '/'}
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
