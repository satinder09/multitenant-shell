// Auth cache utility to reduce unnecessary API calls
interface CachedAuthData {
  user: any;
  timestamp: number;
}

const AUTH_CACHE_KEY = 'auth_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class AuthCache {
  static set(user: any): void {
    const data: CachedAuthData = {
      user,
      timestamp: Date.now()
    };
    
    try {
      sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      // Silently fail if sessionStorage is not available
      console.warn('Failed to cache auth data:', error);
    }
  }

  static get(): any | null {
    try {
      const cached = sessionStorage.getItem(AUTH_CACHE_KEY);
      if (!cached) return null;

      const data: CachedAuthData = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now - data.timestamp < CACHE_DURATION) {
        return data.user;
      }

      // Cache expired, remove it
      this.clear();
      return null;
    } catch (error) {
      console.warn('Failed to read auth cache:', error);
      this.clear();
      return null;
    }
  }

  static clear(): void {
    try {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
    } catch (error) {
      // Silently fail
    }
  }

  static isValid(): boolean {
    const cached = this.get();
    return cached !== null;
  }
} 