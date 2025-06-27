// Platform tenant management types
export interface PlatformTenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  dbName: string;
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  owner: {
    id: string;
    email: string;
    name: string;
  };
}

export interface CreateTenantRequest {
  name: string;
  ownerEmail?: string;
  plan?: string;
  features?: string[];
}

export interface UpdateTenantRequest {
  name?: string;
  isActive?: boolean;
  plan?: string;
  features?: string[];
}

export interface TenantAccessRequest {
  tenantId: string;
  userId: string;
  reason: string;
  duration: number; // in hours
  accessType: 'view_only' | 'full_access' | 'admin';
}

export interface TenantImpersonationSession {
  id: string;
  tenantId: string;
  tenantName: string;
  userId: string;
  userName: string;
  startedAt: string;
  expiresAt: string;
  reason: string;
  status: 'active' | 'ended' | 'expired';
} 