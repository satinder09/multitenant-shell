// apps/frontend/lib/api.ts

import { NextRequest } from 'next/server';
import { securityFetch } from '@/domains/auth/services/csrfService';
import { browserApi } from '@/shared/services/api-client';

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
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}



export async function login(dto: LoginDto): Promise<LoginResponse> {
  // Debug logging only when explicitly enabled
  if (process.env.DEBUG_AUTH) {
    console.log('API login function called with:', { email: dto.email, rememberMe: dto.rememberMe });
  }
  
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
    ...(dto.rememberMe !== undefined && { rememberMe: dto.rememberMe }),
  };

  if (process.env.DEBUG_AUTH) {
    console.log('Making login request to /api/auth/login...');
  }
  
  const res = await securityFetch('/api/auth/login', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // CSRF protection
    },
    body: JSON.stringify(sanitizedDto),
  });

  if (process.env.DEBUG_AUTH) {
    console.log('Login response status:', res.status, res.statusText);
  }
  
  if (!res.ok) {
    const error = await res.json();
    const errorMessage = sanitizeInput(error.message || 'Login failed');
    throw new Error(errorMessage);
  }
  return res.json();
}

// Utility function to check if user is authenticated
export async function checkAuth(): Promise<boolean> {
  try {
    // Use unified browserApi client instead of low-level fetch
    await browserApi.get('/api/auth/me', undefined, { timeout: 5000 });
    return true;
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

// Tenant API functions moved to domain-specific clients
// Use platformApiClient.tenants or tenantApiClient for tenant operations

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
  const backendPort = process.env.BACKEND_PORT || '4000'; // Fixed to match backend default port
  
  let backendHost = host;
  if (host && frontendPort !== backendPort) {
    backendHost = host.replace(`:${frontendPort}`, `:${backendPort}`);
  }
  
  const backendUrl = `http://${backendHost}`;
  console.log('[api] Constructed backend URL:', backendUrl);
  return backendUrl;
}
