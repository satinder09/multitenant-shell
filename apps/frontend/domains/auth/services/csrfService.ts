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
      return this.currentToken;
    }

    // Fetch new token from server
    return this.refreshToken();
  }

  async refreshToken(): Promise<string> {
    try {
      const response = await fetch('/api/auth/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const token = response.headers.get('X-CSRF-Token');
      if (!token) {
        throw new Error('No CSRF token in response');
      }

      this.currentToken = token;
      // Token expires in 30 minutes
      this.tokenExpiry = Date.now() + (30 * 60 * 1000);

      return token;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  }

  clearToken(): void {
    this.currentToken = null;
    this.tokenExpiry = 0;
  }

  async addTokenToHeaders(headers: HeadersInit = {}): Promise<HeadersInit> {
    try {
      const token = await this.getToken();
      return {
        ...headers,
        'X-CSRF-Token': token,
      };
    } catch (error) {
      console.warn('Failed to add CSRF token to headers:', error);
      return headers;
    }
  }

  async addTokenToFormData(formData: FormData): Promise<FormData> {
    try {
      const token = await this.getToken();
      formData.append('_csrf', token);
      return formData;
    } catch (error) {
      console.warn('Failed to add CSRF token to form data:', error);
      return formData;
    }
  }

  // Extract token from meta tag (if set by server-side rendering)
  extractTokenFromMeta(): string | null {
    if (typeof document === 'undefined') return null;
    
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      const token = metaTag.getAttribute('content');
      if (token) {
        this.currentToken = token;
        this.tokenExpiry = Date.now() + (30 * 60 * 1000);
        return token;
      }
    }
    return null;
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

  if (needsCSRF) {
    options.headers = await csrfService.addTokenToHeaders(options.headers);
  }

  // Ensure credentials are included for CSRF validation
  options.credentials = options.credentials || 'include';

  try {
    const response = await fetch(url, options);

    // If we get a 403 (CSRF failure), try to refresh token and retry once
    if (response.status === 403 && needsCSRF) {
      console.warn('CSRF token may be invalid, refreshing...');
      
      try {
        await csrfService.refreshToken();
        options.headers = await csrfService.addTokenToHeaders(options.headers);
        return fetch(url, options);
      } catch (error) {
        console.error('Failed to refresh CSRF token:', error);
        throw error;
      }
    }

    return response;
  } catch (error) {
    console.error('Security fetch error:', error);
    throw error;
  }
}

// Initialize CSRF service
export function initializeCsrfProtection(): void {
  const csrfService = CsrfService.getInstance();
  
  // Try to get initial token from meta tag
  csrfService.extractTokenFromMeta();
  
  // Set up automatic token refresh before expiry
  setInterval(() => {
    csrfService.refreshToken().catch((error) => {
      console.warn('Failed to refresh CSRF token automatically:', error);
    });
  }, 25 * 60 * 1000); // Refresh every 25 minutes
}

export default CsrfService; 