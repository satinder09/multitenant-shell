// apps/frontend/app/login/page.tsx

'use client';

import { FormEvent, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ProtectedRoute } from '@/domains/auth/components/ProtectedRoute';
import { Eye, EyeOff } from 'lucide-react';
import { RateLimiter, isValidEmail, sanitizeInput } from '@/shared/utils/security';
import { cn } from '@/shared/utils/utils';

// Create rate limiter instance for login attempts
const loginRateLimiter = new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5 }); // 5 attempts per 15 minutes

function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const { login } = useAuth();
  const { isPlatform, tenantSubdomain } = usePlatform();
  const loginInProgress = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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

      await login({ email: sanitizedEmail, password: sanitizedPassword, rememberMe }, destination);
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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance">
                  {isPlatform ? 'Login to your platform account' : `Login to your ${tenantSubdomain || 'tenant'} account`}
                </p>
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="m@example.com"
                  disabled={isLoading || isLocked}
                  required
                />
              </div>
              
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                    disabled={isLoading || isLocked}
                  >
                    Forgot your password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    placeholder="Enter your password"
                    disabled={isLoading || isLocked}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading || isLocked}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(!!checked)}
                  disabled={isLoading || isLocked}
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isLocked}
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Please wait
                  </>
                ) : (
                  'Login'
                )}
              </Button>
              
              {error && (
                <div className="flex items-center justify-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {isLocked && lockoutTime && (
                <div className="text-sm text-amber-600 text-center">
                  Account temporarily locked. Try again in: {formatTimeRemaining()}
                </div>
              )}
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-indigo-600/15 to-purple-600/10 flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">Multitenant Shell</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                  Secure, scalable enterprise platform management solution
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground text-center text-xs text-balance">
        By clicking continue, you agree to our{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </a>
        .
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <ProtectedRoute requireAuth={false}>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm md:max-w-3xl">
          <LoginForm />
        </div>
      </div>
    </ProtectedRoute>
  );
}
