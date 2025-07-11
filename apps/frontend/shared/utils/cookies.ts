/**
 * 🍪 COOKIE UTILITIES
 * 
 * Browser-side cookie management utilities for client-side operations
 */

/**
 * Get a cookie value by name
 * @param name - The name of the cookie
 * @returns The cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Set a cookie with optional parameters
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options (expires, path, domain, secure, sameSite)
 */
export function setCookie(
  name: string, 
  value: string, 
  options: {
    expires?: Date;
    maxAge?: number;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  } = {}
): void {
  if (typeof document === 'undefined') return;
  
  let cookieString = `${name}=${value}`;
  
  if (options.expires) {
    cookieString += `; expires=${options.expires.toUTCString()}`;
  }
  
  if (options.maxAge) {
    cookieString += `; max-age=${options.maxAge}`;
  }
  
  if (options.path) {
    cookieString += `; path=${options.path}`;
  }
  
  if (options.domain) {
    cookieString += `; domain=${options.domain}`;
  }
  
  if (options.secure) {
    cookieString += `; secure`;
  }
  
  if (options.sameSite) {
    cookieString += `; samesite=${options.sameSite}`;
  }
  
  document.cookie = cookieString;
}

/**
 * Delete a cookie by name
 * @param name - Cookie name
 * @param options - Cookie options (path, domain) - should match the original cookie
 */
export function deleteCookie(
  name: string, 
  options: {
    path?: string;
    domain?: string;
  } = {}
): void {
  setCookie(name, '', { 
    ...options, 
    expires: new Date(0) 
  });
}

/**
 * Get all cookies as an object
 * @returns Object with cookie names as keys and values as values
 */
export function getAllCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  
  const cookies: Record<string, string> = {};
  
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}

/**
 * Check if a cookie exists
 * @param name - Cookie name
 * @returns True if cookie exists, false otherwise
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
} 