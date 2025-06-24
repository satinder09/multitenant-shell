// apps/frontend/lib/security.ts

// Rate limiting utility for client-side protection
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }
    
    // This check is implicitly handled by the recordFailure call, but we leave it
    // for cases where isAllowed is used without explicit failure recording.
    return true; 
  }

  recordFailure(key: string, windowMs: number = 15 * 60 * 1000) {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      record.count++;
    }
  }

  getRemainingAttempts(key: string): number {
    const record = this.attempts.get(key);
    if (!record || Date.now() > record.resetTime) {
      return 5; // Default max attempts
    }
    return Math.max(0, 5 - record.count);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

// CSRF token utility
export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

// Password strength validation
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include at least one lowercase letter');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include at least one uppercase letter');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Include at least one number');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Include at least one special character');

  return {
    isValid: score >= 3 && password.length >= 8,
    score,
    feedback: feedback.length > 0 ? feedback : ['Password is strong']
  };
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Session timeout utility
export function setupSessionTimeout(timeoutMs: number = 30 * 60 * 1000): () => void {
  let timeoutId: NodeJS.Timeout;

  const resetTimeout = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      // Clear any stored auth data
      localStorage.removeItem('loginLockout');
      // Redirect to login
      window.location.href = '/login';
    }, timeoutMs);
  };

  // Reset timeout on user activity
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  events.forEach(event => {
    document.addEventListener(event, resetTimeout, true);
  });

  // Initial timeout
  resetTimeout();

  // Return cleanup function
  return () => {
    clearTimeout(timeoutId);
    events.forEach(event => {
      document.removeEventListener(event, resetTimeout, true);
    });
  };
} 