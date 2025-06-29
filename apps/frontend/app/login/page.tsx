// apps/frontend/app/login/page.tsx

'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { RateLimiter, isValidEmail, sanitizeInput } from '@/shared/utils/security';

// Create rate limiter instance for login attempts
const loginRateLimiter = new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5 }); // 5 attempts per 15 minutes

function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { isPlatform, tenantSubdomain } = usePlatform();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null);

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
    if (isLocked) return;
    setError(null);

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = sanitizeInput(password);

    // Client-side validation
    if (!isValidEmail(sanitizedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (sanitizedPassword.length < 6) {
      setError('Password must be at least 6 characters long');
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
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: sanitizedEmail, password: sanitizedPassword });
      loginRateLimiter.reset('login');
      
      // Redirect to root - middleware will handle the appropriate routing
      router.push('/');
    } catch (err: unknown) {
      const rateLimitCheck = loginRateLimiter.checkLimit('login');
      const remainingAttempts = rateLimitCheck.remaining || 0;
      
      if (remainingAttempts <= 0) {
        setError('Too many failed attempts. Please try again in 15 minutes.');
      } else {
        setError(err instanceof Error ? err.message : 'Invalid email or password');
      }
    } finally {
      setIsLoading(false);
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="pl-10 pr-4"
                    placeholder="Enter your email"
                    disabled={isLoading || isLocked}
                    required
                    autoComplete="email"
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
                    className="pl-10 pr-10"
                    placeholder="Enter your password"
                    disabled={isLoading || isLocked}
                    required
                    autoComplete="current-password"
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
                type="submit"
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
            </form>

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
