// apps/frontend/app/login/page.tsx

'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/shared/utils/utils';
import { useAuth } from '@/context/AuthContext';
import { TwoFactorVerification } from '@/components/auth/TwoFactorVerification';
import { ProtectedRoute } from '@/domains/auth/components/ProtectedRoute';
import { sanitizeInput, isValidEmail } from '@/shared/utils/security';
import { RateLimiter } from '@/shared/utils/security';

// Create rate limiter instance for login attempts
const loginRateLimiter = new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5 }); // 5 attempts per 15 minutes

// Error state management using sessionStorage to persist across remounts
const ERROR_STORAGE_KEY = 'login-error-state';

function getStoredError(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(ERROR_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredError(error: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (error) {
      sessionStorage.setItem(ERROR_STORAGE_KEY, error);
    } else {
      sessionStorage.removeItem(ERROR_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { user, login, verify2FA, isLoading: authLoading, twoFactorRequired, twoFactorSession } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const loginInProgress = useRef(false);
  
  // Error state management using sessionStorage
  const [error, setError] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Load error from storage on mount
  useEffect(() => {
    const storedError = getStoredError();
    if (storedError) {
      setError(storedError);
    }
  }, []);
  
  // Robust error setter that persists across remounts
  const setErrorRobust = useCallback((newError: string | null) => {
    setError(newError);
    setStoredError(newError);
    // Force re-render to ensure UI updates
    setForceUpdate(prev => prev + 1);
  }, []);
  
  // Current error combines component state and storage
  const currentError = error || getStoredError();
  
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null);

  // Extract domain info for display
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isPlatform = hostname === 'lvh.me' || hostname.includes('localhost');
  const tenantSubdomain = isPlatform ? null : hostname.split('.')[0];

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

  // Clear error when component unmounts to prevent stale errors
  useEffect(() => {
    return () => {
      // Clear error on unmount only if it's not during a login process
      if (!loginInProgress.current) {
        setStoredError(null);
      }
    };
  }, []);

  // Handle form submission with complete prevention of default behavior
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent any form submission if locked or already in progress
    if (isLocked || loginInProgress.current) {
      return false;
    }
    
    loginInProgress.current = true;
    setErrorRobust(null);

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = sanitizeInput(password);

    // Client-side validation
    if (!isValidEmail(sanitizedEmail)) {
      setErrorRobust('Please enter a valid email address');
      setPassword(''); // Clear only password on error
      loginInProgress.current = false;
      return false;
    }

    if (sanitizedPassword.length < 6) {
      setErrorRobust('Password must be at least 6 characters long');
      setPassword(''); // Clear only password on error
      loginInProgress.current = false;
      return false;
    }

    // Rate limiting check
    const rateLimitResult = loginRateLimiter.checkLimit('login');
    if (!rateLimitResult.allowed) {
      const lockoutEnd = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      setIsLocked(true);
      setLockoutTime(lockoutEnd);
      localStorage.setItem('loginLockout', lockoutEnd.toISOString());
      setErrorRobust('Too many failed attempts. Please try again in 15 minutes.');
      setPassword(''); // Clear only password on error
      loginInProgress.current = false;
      return false;
    }

    setIsLoading(true);
    
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
      
      // Clear any stored error on successful login
      setStoredError(null);
      
      // The login function now handles the redirect, so we don't need router.push here
    } catch (err: unknown) {
      // Handle the error display without page refresh
      const errorMessage = err instanceof Error ? err.message : 'Invalid email or password';
      setErrorRobust(errorMessage);
      setPassword(''); // Clear only password on error, keep email
    } finally {
      setIsLoading(false);
      loginInProgress.current = false;
    }
    
    return false; // Prevent any form submission
  };

  // Handle button click as alternative to form submission
  const handleLoginClick = async () => {
    const syntheticEvent = {
      preventDefault: () => {},
      stopPropagation: () => {}
    } as FormEvent;
    
    await handleSubmit(syntheticEvent);
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

  // Handle 2FA verification with proper error handling
  const handle2FAVerification = async (code: string, type?: 'totp' | 'backup') => {
    setErrorRobust(null);
    try {
      await verify2FA(code, type);
      // Clear any stored error on successful verification
      setStoredError(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid verification code';
      setErrorRobust(errorMessage);
      throw err; // Re-throw to let TwoFactorVerification handle UI state
    }
  };

  // If 2FA is required, render the 2FA verification component
  if (twoFactorRequired && twoFactorSession) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <TwoFactorVerification
          availableMethods={twoFactorSession.availableMethods}
          onVerify={handle2FAVerification}
          isLoading={authLoading}
          error={currentError}
          onErrorClear={() => {
            setErrorRobust(null);
          }}
        />
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              // Reset to login form (this will clear the 2FA state)
              window.location.reload();
            }}
            className="inline-flex items-center justify-center gap-2 text-sm font-medium underline-offset-4 hover:underline text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          {/* Prevent form submission completely */}
          <div className="p-6 md:p-8">
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLoginClick();
                    }
                  }}
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLoginClick();
                      }
                    }}
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
                type="button"
                onClick={handleLoginClick}
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
              
              {currentError && (
                <div className="flex items-center justify-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{currentError}</span>
                </div>
              )}

              {isLocked && lockoutTime && (
                <div className="text-sm text-amber-600 text-center">
                  Account temporarily locked. Try again in: {formatTimeRemaining()}
                </div>
              )}
            </div>
          </div>
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
