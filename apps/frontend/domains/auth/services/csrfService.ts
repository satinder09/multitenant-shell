export class CsrfService {
  private static instance: CsrfService;
  private currentToken: string | null = null;
  private tokenExpiry: number = 0;

  private constructor() {}

  static getInstance(): CsrfService {
    if (!CsrfService.instance) {
      CsrfService.instance = new CsrfService();
    }
    return CsrfService.instance;
  }

  async getToken(): Promise<string> {
    // Check if we have a valid token
    if (this.currentToken && Date.now() < this.tokenExpiry) {
      console.log('[CsrfService] Using cached token');
      return this.currentToken;
    }

    console.log('[CsrfService] Token expired or missing, refreshing...');
    // Fetch new token from server
    return this.refreshToken();
  }

  async refreshToken(): Promise<string> {
    try {
      console.log('[CsrfService] Fetching new CSRF token from /api/auth/csrf-token');
      const response = await fetch('/api/auth/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[CsrfService] CSRF token response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
      }

      const token = response.headers.get('X-CSRF-Token');
      if (!token) {
        const responseBody = await response.text();
        console.error('[CsrfService] No CSRF token in response. Response body:', responseBody);
        throw new Error('No CSRF token in response');
      }

      this.currentToken = token;
      // Token expires in 30 minutes
      this.tokenExpiry = Date.now() + (30 * 60 * 1000);

      console.log('[CsrfService] Successfully obtained CSRF token:', token.substring(0, 10) + '...');
      return token;
    } catch (error) {
      console.error('[CsrfService] Error fetching CSRF token:', error);
      throw error;
    }
  }

  async addTokenToHeaders(headers: HeadersInit = {}): Promise<HeadersInit> {
    try {
      const token = await this.getToken();
      return {
        ...headers,
        'X-CSRF-Token': token,
      };
    } catch (error) {
      console.warn('[CsrfService] Failed to add CSRF token to headers:', error);
      return headers;
    }
  }

  async addTokenToFormData(formData: FormData): Promise<void> {
    try {
      const token = await this.getToken();
      formData.append('_csrf', token);
    } catch (error) {
      console.warn('[CsrfService] Failed to add CSRF token to form data:', error);
    }
  }

  // Clear cached token (useful when switching domains)
  clearToken(): void {
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_CSRF) {
      console.log('[CsrfService] Clearing cached CSRF token');
    }
    this.currentToken = null;
    this.tokenExpiry = 0;
  }

  // Extract token from meta tag (if set by server-side rendering)
  extractTokenFromMeta(): string | null {
    if (typeof document === 'undefined') return null;
    
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      const token = metaTag.getAttribute('content');
      if (token) {
        console.log('[CsrfService] Extracted CSRF token from meta tag');
        this.currentToken = token;
        this.tokenExpiry = Date.now() + (30 * 60 * 1000);
        return token;
      }
    }
    return null;
  }

  // Debug method to check token status
  getTokenStatus(): { hasToken: boolean; isExpired: boolean; token?: string } {
    return {
      hasToken: !!this.currentToken,
      isExpired: Date.now() >= this.tokenExpiry,
      token: this.currentToken ? this.currentToken.substring(0, 10) + '...' : undefined
    };
  }
}

// Enhanced fetch wrapper with automatic CSRF protection
export async function securityFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const csrfService = CsrfService.getInstance();
  
  // Only add CSRF token for state-changing requests
  const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
    (options.method || 'GET').toUpperCase()
  );

  console.log('[securityFetch] Making request:', {
    url,
    method: options.method || 'GET',
    needsCSRF,
    domain: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
  });

  if (needsCSRF) {
    options.headers = await csrfService.addTokenToHeaders(options.headers);
  }

  // Ensure credentials are included for CSRF validation
  options.credentials = options.credentials || 'include';

  try {
    const response = await fetch(url, options);

    console.log('[securityFetch] Response received:', {
      url,
      status: response.status,
      statusText: response.statusText
    });

    // If we get a 403 (CSRF failure), try to refresh token and retry once
    if (response.status === 403 && needsCSRF) {
      console.warn('[securityFetch] CSRF token may be invalid, clearing cache and retrying...');
      
      try {
        // Clear cached token and get fresh one
        csrfService.clearToken();
        await csrfService.refreshToken();
        options.headers = await csrfService.addTokenToHeaders(options.headers);
        
        console.log('[securityFetch] Retrying request with fresh CSRF token');
        return fetch(url, options);
      } catch (error) {
        console.error('[securityFetch] Failed to refresh CSRF token:', error);
        throw error;
      }
    }

    return response;
  } catch (error) {
    console.error('[securityFetch] Request failed:', error);
    throw error;
  }
}

// Initialize CSRF service
export function initializeCsrfProtection(): void {
  const csrfService = CsrfService.getInstance();
  
  // Clear any cached tokens on initialization (handles domain switches)
  csrfService.clearToken();
  
  // Try to get initial token from meta tag
  csrfService.extractTokenFromMeta();
  
  // Set up automatic token refresh before expiry
  setInterval(() => {
    csrfService.refreshToken().catch((error) => {
      console.warn('[CsrfService] Failed to refresh CSRF token automatically:', error);
    });
  }, 25 * 60 * 1000); // Refresh every 25 minutes

  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_CSRF) {
    console.log('[CsrfService] CSRF protection initialized');
  }
}

// Debug utility function
export function debugCsrf(): void {
  const csrfService = CsrfService.getInstance();
  const status = csrfService.getTokenStatus();
  
  console.log('=== CSRF Debug Information ===');
  console.log('Domain:', window.location.hostname);
  console.log('Origin:', window.location.origin);
  console.log('Token Status:', status);
  console.log('Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
  console.log('Base Domain:', process.env.NEXT_PUBLIC_BASE_DOMAIN);
  console.log('==============================');
}

// Make debug function available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugCsrf = debugCsrf;
}

export default CsrfService; 