// Tenant domain types
export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  dbName?: string;
}

export interface TenantUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export interface TenantDashboardData {
  userCount: number;
  activeUsers: number;
  recentActivity: TenantActivity[];
  systemHealth: 'healthy' | 'warning' | 'error';
}

export interface TenantActivity {
  id: string;
  type: 'login' | 'logout' | 'create' | 'update' | 'delete';
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface TenantSettings {
  name: string;
  subdomain: string;
  features: TenantFeatures;
  branding: TenantBranding;
}

export interface TenantFeatures {
  multiUser: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  advancedReporting: boolean;
}

export interface TenantBranding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customCss?: string;
} 