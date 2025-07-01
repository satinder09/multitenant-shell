// apps/frontend/app/login/page.tsx

'use client';

import { FormEvent, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ProtectedRoute } from '@/domains/auth/components/ProtectedRoute';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { RateLimiter, isValidEmail, sanitizeInput } from '@/shared/utils/security';

// Create rate limiter instance for login attempts
const loginRateLimiter = new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5 }); // 5 attempts per 15 minutes

function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { isPlatform, tenantSubdomain } = usePlatform();
  const loginInProgress = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null);

  // Debug logging for Fast Refresh issues
  useEffect(() => {
    console.log('🔄 LoginForm mounted/re-mounted');
    // Check if we're in the middle of a login attempt (component remounted during login)
    const loginAttemptData = sessionStorage.getItem('login-attempt-data');
    if (loginAttemptData) {
      try {
        const { email: savedEmail, error: savedError } = JSON.parse(loginAttemptData);
        if (savedEmail) setEmail(savedEmail);
        if (savedError) setError(savedError);
        console.log('🔄 Restored login attempt data after remount');
      } catch (e) {
        console.log('🔄 Failed to restore login attempt data');
      }
    } else {
      // Fresh page load - clear any stale data
      sessionStorage.removeItem('login-form-email');
      sessionStorage.removeItem('login-form-error');
    }
    return () => {
      console.log('🔄 LoginForm unmounting');
    };
  }, []);

  // Check for lockout
  useEffect(() => {
    const storedLockout = localStorage.getItem('loginLockout');
    if (storedLockout) {
      const lockoutTime = new Date(storedLockout);
      const now = new Date();
      if (now < lockoutTime) {
        setIsLocked(true);
        setLockoutTime(lockoutTime);
      } else {
        localStorage.removeItem('loginLockout');
        loginRateLimiter.reset('login');
      }
    }
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (!isLocked || !lockoutTime) return;

    const timer = setInterval(() => {
      const now = new Date();
      if (now >= lockoutTime) {
        setIsLocked(false);
        setLockoutTime(null);
        localStorage.removeItem('loginLockout');
        loginRateLimiter.reset('login');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked, lockoutTime]);

  const handleSubmit = async () => {
    console.log('🔔 handleSubmit called');
    if (isLocked || loginInProgress.current) return;
    
    loginInProgress.current = true;
    setError(null);
    
    // Save current form state temporarily during login attempt
    sessionStorage.setItem('login-attempt-data', JSON.stringify({
      email: email,
      error: null
    }));

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = sanitizeInput(password);

    // Client-side validation
    if (!isValidEmail(sanitizedEmail)) {
      setError('Please enter a valid email address');
      sessionStorage.setItem('login-attempt-data', JSON.stringify({
        email: email,
        error: 'Please enter a valid email address'
      }));
      loginInProgress.current = false;
      return;
    }

    if (sanitizedPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      sessionStorage.setItem('login-attempt-data', JSON.stringify({
        email: email,
        error: 'Password must be at least 6 characters long'
      }));
      loginInProgress.current = false;
      return;
    }

    // Rate limiting check
    const rateLimitResult = loginRateLimiter.checkLimit('login');
    if (!rateLimitResult.allowed) {
      const lockoutEnd = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      setIsLocked(true);
      setLockoutTime(lockoutEnd);
      localStorage.setItem('loginLockout', lockoutEnd.toISOString());
      setError('Too many failed attempts. Please try again in 15 minutes.');
      sessionStorage.setItem('login-attempt-data', JSON.stringify({
        email: email,
        error: 'Too many failed attempts. Please try again in 15 minutes.'
      }));
      loginInProgress.current = false;
      return;
    }

    setIsLoading(true);
    console.log('🔔 Starting login attempt...');
    try {
      // Smart redirect: remember where user was trying to go
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get('redirect');
      
      // Determine smart redirect based on domain context
      let destination = redirectTo;
      if (!destination) {
        const hostname = window.location.hostname;
        if (hostname === 'lvh.me' || hostname.includes('localhost')) {
          destination = '/platform';
        } else if (hostname.includes('.lvh.me')) {
          // Tenant domain - go to tenant home  
          destination = '/';
        } else {
          destination = '/platform'; // fallback
        }
      }

      await login({ email: sanitizedEmail, password: sanitizedPassword }, destination);
      loginRateLimiter.reset('login');
      // Clear login attempt data on successful login
      sessionStorage.removeItem('login-attempt-data');
      console.log('🔔 Login successful, redirecting...');
      
      // The login function now handles the redirect, so we don't need router.push here
    } catch (err: unknown) {
      // Don't call checkLimit again - it was already called above
      // Just handle the error display
      console.log('🔔 Login failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Invalid email or password';
      setError(errorMessage);
      // Update login attempt data with error
      sessionStorage.setItem('login-attempt-data', JSON.stringify({
        email: email,
        error: errorMessage
      }));
    } finally {
      setIsLoading(false);
      loginInProgress.current = false;
      console.log('🔔 Login attempt completed');
      // Clean up login attempt data after a delay (in case component remounts)
      setTimeout(() => {
        sessionStorage.removeItem('login-attempt-data');
        console.log('🔔 Cleaned up login attempt data');
      }, 2000);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && !isLocked) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTimeRemaining = (): string => {
    if (!lockoutTime) return '';
    
    const now = new Date();
    const diff = lockoutTime.getTime() - now.getTime();
    
    if (diff <= 0) return '';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 pr-4"
                    placeholder="Enter your email"
                    disabled={isLoading || isLocked}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 pr-10"
                    placeholder="Enter your password"
                    disabled={isLoading || isLocked}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isLoading || isLocked}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {isLocked && lockoutTime && (
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Account temporarily locked. Try again in: {formatTimeRemaining()}
                  </p>
                </div>
              )}

              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full"
                disabled={isLoading || isLocked}
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2" size="sm" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                By signing in, you agree to our terms of service and privacy policy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <ProtectedRoute requireAuth={false}>
      <LoginForm />
    </ProtectedRoute>
  );
}
