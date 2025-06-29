// apps/frontend/lib/api.ts

import { NextRequest } from 'next/server';
import { securityFetch } from '@/domains/auth/services/csrfService';

// Input sanitization functions (from core utilities)
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/\x00/g, '') // Remove null bytes
    .trim();
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

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
  // Input validation and sanitization
  if (!dto.email || !dto.password) {
    throw new Error('Email and password are required');
  }
  
  const sanitizedEmail = sanitizeInput(dto.email.toLowerCase());
  if (!isValidEmail(sanitizedEmail)) {
    throw new Error('Invalid email format');
  }
  
  if (dto.password.length < 1 || dto.password.length > 128) {
    throw new Error('Invalid password length');
  }

  const sanitizedDto = {
    email: sanitizedEmail,
    password: dto.password, // Don't sanitize passwords as they may contain special chars
  };

  const res = await securityFetch('/api/auth/login', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // CSRF protection
    },
    body: JSON.stringify(sanitizedDto),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(sanitizeInput(error.message || 'Login failed'));
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
  const res = await securityFetch('/api/tenants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to create tenant');
  return res.json();
}

async function deleteTenant(id: string): Promise<void> {
  const res = await securityFetch(`/api/tenants/${id}`, {
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

export function getBackendUrl(req: Request | NextRequest) {
  // Use the configured backend URL from environment variables
  const configuredBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  if (configuredBackendUrl) {
    console.log('[api] Using configured backend URL:', configuredBackendUrl);
    return configuredBackendUrl;
  }
  
  // Fallback to dynamic construction if no environment variable is set
  const host = req.headers.get('host');
  const frontendPort = process.env.NEXT_PUBLIC_FRONTEND_PORT || '3000';
  const backendPort = process.env.BACKEND_PORT || '3001'; // Changed from PORT to BACKEND_PORT
  
  let backendHost = host;
  if (host && frontendPort !== backendPort) {
    backendHost = host.replace(`:${frontendPort}`, `:${backendPort}`);
  }
  
  const backendUrl = `http://${backendHost}`;
  console.log('[api] Constructed backend URL:', backendUrl);
  return backendUrl;
}
