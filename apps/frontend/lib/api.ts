// apps/frontend/lib/api.ts

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

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

export async function login(dto: LoginDto): Promise<LoginResponse> {
  const res = await fetchWithTimeout('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Login failed');
  }

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
