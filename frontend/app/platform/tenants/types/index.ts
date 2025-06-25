// Enhanced Tenant interface that combines both data structures
export interface EnhancedTenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
  // Access control properties
  canAccess: boolean;
  canImpersonate: boolean;
  accessLevel: 'read' | 'write' | 'admin';
  lastAccessed?: Date;
}

// Base tenant interface for API responses
export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
}

// Access information interface
export interface TenantAccessInfo {
  tenantId: string;
  canAccess: boolean;
  canImpersonate: boolean;
  accessLevel: 'read' | 'write' | 'admin';
  lastAccessed?: string;
}

// Tenant access option interface (for modals)
export interface TenantAccessOption {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  canAccess: boolean;
  canImpersonate: boolean;
  accessLevel: 'read' | 'write' | 'admin';
  lastAccessed?: Date;
}

// Tenant user interface for impersonation
export interface TenantUser {
  id: string;
  email: string;
  name: string;
}

// Props interfaces for components
export interface TenantListProps {
  tenants: EnhancedTenant[];
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onImpersonate: (tenant: EnhancedTenant) => void;
  onSecureLogin: (tenant: EnhancedTenant) => void;
}

export interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTenantCreated: () => void;
}

export interface SecureLoginModalProps {
  tenant: TenantAccessOption;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface ImpersonationModalProps {
  tenant: TenantAccessOption;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Hook return type
export interface UseFetchTenantsReturn {
  tenants: EnhancedTenant[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} 