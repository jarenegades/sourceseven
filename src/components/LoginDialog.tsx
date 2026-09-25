import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { authService } from '../utils/authService';
import { config } from '../utils/config';
const logoImage = '/source-7-icon.png';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: (email: string, isAdmin: boolean) => void;
}

export function LoginDialog({ open, onOpenChange, onLogin }: LoginDialogProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  
  // Sign in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  // Sign up state
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Email verification state
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  // Reset password state
  const [resetEmail, setResetEmail] = useState('');

  const resetForms = () => {
    setSignInEmail('');
    setSignInPassword('');
    setSignUpEmail('');
    setSignUpPassword('');
    setSignUpConfirmPassword('');
    setFirstName('');
    setLastName('');
    setVerificationEmail('');
    setVerificationCode('');
    setResetEmail('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signInEmail || !signInPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      if (config.useNeonAuth) {
        const result = await authService.signIn(signInEmail, signInPassword);
        
        if (result.success && result.user) {
          // Check admin status from database
          const isAdmin = await authService.isAdmin();
          
          onLogin(result.user.email, isAdmin);
          toast.success(`Welcome back${isAdmin ? ', Admin' : ''}!`);
          onOpenChange(false);
          resetForms();
        } else {
          toast.error(result.error || 'Invalid email or password');
        }
      } else {
        toast.error(import.meta.env.DEV
          ? 'Configure Neon Auth to sign in.'
          : 'Sign-in is temporarily unavailable. Please try again later.');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔵 Sign up form submitted');
    
    if (!signUpEmail || !signUpPassword || !signUpConfirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (signUpPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    console.log('🔵 Starting sign up process for:', signUpEmail);

    try {
      if (config.useNeonAuth) {
        const result = await authService.signUp(signUpEmail, signUpPassword, {
          firstName,
          lastName,
        });
        
        console.log('🔵 Sign up result:', result);
        
        if (result.success && result.user) {
          if (result.requiresEmailVerification) {
            setVerificationEmail(result.user.email);
            setVerificationCode('');
            toast.success('Account created. Check your email for a verification code or link.', { duration: 5000 });
          } else {
            onLogin(result.user.email, false);
            toast.success('Account created successfully!');
            onOpenChange(false);
            resetForms();
          }
        } else {
          console.error('❌ Sign up failed:', result.error);
          toast.error(result.error || 'Failed to create account');
        }
      } else {
        toast.error('Account creation is temporarily unavailable.');
      }
    } catch (error) {
      console.error('❌ Sign up error:', error);
      toast.error('An error occurred during sign up');
    } finally {
      setIsLoading(false);
      console.log('🔵 Sign up process completed');
    }
  };

  const handleVerifySignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationEmail || !verificationCode.trim()) {
      toast.error('Enter the verification code from your email.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.verifySignupEmail(verificationEmail, verificationCode.trim());
      if (!result.success) {
        toast.error(result.error || 'Email verification failed.');
        return;
      }

      if (result.user) {
        const isAdmin = await authService.isAdmin();
        onLogin(result.user.email, isAdmin);
        toast.success('Email verified. Your account is ready.');
        onOpenChange(false);
        resetForms();
      } else {
        setResetEmail(verificationEmail);
        setVerificationEmail('');
        setVerificationCode('');
        setActiveTab('reset');
        toast.success('Email verified. You can now request a password reset.');
      }
    } catch (error) {
      console.error('Signup email verification error:', error);
      toast.error(error instanceof Error ? error.message : 'Email verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (requestedEmail = verificationEmail) => {
    const email = requestedEmail.trim();
    if (!email) {
      toast.error('Enter your email address first.');
      return;
    }
    setVerificationEmail(email);
    setIsLoading(true);
    try {
      const result = await authService.resendSignupVerification(email);
      if (result.success) {
        toast.success('If this account needs verification, a new message has been sent. Check your inbox and Spam folder.');
      } else {
        toast.error(result.error || 'Could not resend verification message.');
      }
    } catch (error) {
      console.error('Resend signup verification error:', error);
      toast.error(error instanceof Error ? error.message : 'Could not resend verification message.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      if (config.useNeonAuth) {
        console.log('🔵 Sending password reset email');
        const result = await authService.resetPassword(resetEmail);
        
        if (result.success) {
          toast.success('Password reset email sent! Please check your inbox.', {
            duration: 5000,
          });
          setResetEmail('');
          setActiveTab('signin');
        } else {
          toast.error(result.error || 'Failed to send reset email');
        }
      } else {
        toast.error('Password recovery is temporarily unavailable.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('An error occurred while sending reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <img src={logoImage} alt="Source Sevens" className="h-20 w-auto" />
          </div>
          <DialogTitle className="text-center text-[#003366]">Welcome to Source Sevens</DialogTitle>
          <DialogDescription className="text-center">
            Sign in or create an account to start shopping
          </DialogDescription>
        </DialogHeader>
        
        {verificationEmail ? (
          <form onSubmit={handleVerifySignup} className="space-y-4">
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold text-[#003366]">Verify your email</h3>
              <p className="text-sm text-gray-600">
                Check <span className="font-medium">{verificationEmail}</span>. If the message contains a code, enter it below; if it contains a link, click the link instead.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-verification-code">Verification code</Label>
              <Input
                id="signup-verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter the code from your email"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.trimStart())}
                disabled={isLoading}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-[#003366] hover:bg-[#002244] text-white" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <Button type="button" variant="link" className="p-0 h-auto" onClick={handleResendVerification} disabled={isLoading}>
                Resend code or link
              </Button>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => {
                  setSignInEmail(verificationEmail);
                  setVerificationEmail('');
                  setVerificationCode('');
                  setActiveTab('signin');
                }}
                disabled={isLoading}
              >
                Back to sign in
              </Button>
            </div>
          </form>
        ) : <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup' | 'reset')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="reset">Reset Password</TabsTrigger>
          </TabsList>
          
          {/* Sign In Tab */}
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#DC143C] hover:bg-[#B01030] text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-[#003366] hover:text-[#002244] p-0 h-auto"
                  onClick={() => setActiveTab('reset')}
                >
                  Forgot your password?
                </Button>
              </div>

              {config.useNeonAuth && (
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-[#003366] hover:text-[#002244] p-0 h-auto"
                    disabled={isLoading}
                    onClick={() => void handleResendVerification(signInEmail)}
                  >
                    Didn’t receive a verification code or link?
                  </Button>
                </div>
              )}
              
            </form>
          </TabsContent>
          
          {/* Sign Up Tab */}
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-confirm">Confirm Password</Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  placeholder="Re-enter password"
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#003366] hover:bg-[#002244] text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
              
              {config.useNeonAuth && (
                <p className="text-xs text-center text-gray-600">
                  By creating an account, you'll receive a verification email
                </p>
              )}
            </form>
          </TabsContent>
          
          {/* Reset Password Tab */}
          <TabsContent value="reset">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#003366] hover:bg-[#002244] text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Email'}
              </Button>
              
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-[#003366] hover:text-[#002244] p-0 h-auto"
                  onClick={() => setActiveTab('signin')}
                >
                  Back to Sign In
                </Button>
              </div>
              
              {config.useNeonAuth && (
                <p className="text-xs text-center text-gray-600">
                  We'll send you a link to reset your password
                </p>
              )}
            </form>
          </TabsContent>
        </Tabs>}
      </DialogContent>
    </Dialog>
  );
}
