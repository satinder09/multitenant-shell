// Platform user management types
export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  tenantAccess: UserTenantAccess[];
}

export interface CreatePlatformUserRequest {
  email: string;
  name: string;
  isSuperAdmin?: boolean;
  tenantAccess?: {
    tenantId: string;
    role: string;
  }[];
}

export interface UpdatePlatformUserRequest {
  name?: string;
  email?: string;
  isActive?: boolean;
  isSuperAdmin?: boolean;
}

export interface UserTenantAccess {
  id: string;
  tenantId: string;
  tenantName: string;
  role: string;
  grantedAt: string;
  grantedBy: string;
  isActive: boolean;
}

export interface PlatformUserInvitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  acceptedAt?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
} 