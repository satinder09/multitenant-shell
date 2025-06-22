// apps/frontend/lib/api.ts

export interface LoginDto {
  email: string;
  password: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Create a timeout promise
const timeout = (ms: number) => new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Request timeout')), ms)
);

// Enhanced fetch with timeout and better error handling
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

export async function login(dto: LoginDto): Promise<any> {
  const res = await fetchWithTimeout('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // CSRF protection
    },
    credentials: 'include',
    body: JSON.stringify(dto),
  }, 15000);

  // If the response is not OK, parse the error and throw it.
  if (!res.ok) {
    let errorData: ApiError = { message: 'An unknown error occurred.' };
    try {
      // Try to parse the specific error message from the API
      errorData = await res.json();
    } catch (e) {
      // If the body isn't JSON, use the status text as a fallback
      errorData.message = res.statusText;
    }
    // Throw an actual Error object with the message from the API
    const errorToThrow = new Error(errorData.message || 'Login failed');
    console.error('[api.ts] Throwing login error:', errorToThrow);
    throw errorToThrow;
  }

  // If the response is OK, return the JSON data.
  return res.json();
}

// Utility function to check if user is authenticated
export async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout('/api/auth/me', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
      },
    }, 5000);
    
    return res.ok;
  } catch {
    return false;
  }
}

// ============================
// Tenant API
// ============================

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateTenantDto {
  name: string;
  dbName: string;
}

async function fetchTenants(): Promise<Tenant[]> {
  const res = await fetchWithTimeout('/api/tenants', {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch tenants');
  return res.json();
}

async function createTenant(dto: CreateTenantDto): Promise<Tenant> {
  const res = await fetchWithTimeout('/api/tenants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to create tenant');
  return res.json();
}

async function deleteTenant(id: string): Promise<void> {
  const res = await fetchWithTimeout(`/api/tenants/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete tenant');
}

export const tenants = {
  query: fetchTenants,
  create: createTenant,
  delete: deleteTenant,
};
