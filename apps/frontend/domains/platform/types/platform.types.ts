// Platform administration types
export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  activeUsers: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  lastUpdated: string;
}

export interface PlatformActivity {
  id: string;
  type: 'tenant_created' | 'tenant_activated' | 'tenant_deactivated' | 'user_created' | 'system_event';
  description: string;
  entityId: string;
  entityType: 'tenant' | 'user' | 'system';
  performedBy: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  services: ServiceHealth[];
  lastCheck: string;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  responseTime?: number;
  lastCheck: string;
  message?: string;
}

export interface PlatformSettings {
  allowTenantRegistration: boolean;
  requireEmailVerification: boolean;
  defaultTenantFeatures: string[];
  maxTenantsPerUser: number;
  systemMaintenance: boolean;
  maintenanceMessage?: string;
}

// Platform tenant management types
export interface PlatformTenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  planType: string;
  features: string[];
}

export interface CreateTenantRequest {
  name: string;
  subdomain: string;
  planType?: string;
  features?: string[];
}

export interface UpdateTenantRequest {
  name?: string;
  isActive?: boolean;
  planType?: string;
  features?: string[];
}

export interface TenantAccessRequest {
  tenantId: string;
  reason: string;
  duration: number; // in minutes
}

export interface TenantImpersonationSession {
  id: string;
  tenantId: string;
  userId: string;
  adminUserId: string;
  reason: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
} 