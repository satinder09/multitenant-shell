// Tenant user types
export interface CreateTenantUserRequest {
  email: string;
  name: string;
  role: string;
  sendInvite?: boolean;
}

export interface UpdateTenantUserRequest {
  name?: string;
  role?: string;
  isActive?: boolean;
}

export interface TenantUserInvitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

export interface TenantRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
} 