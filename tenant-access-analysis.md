# Two Tenant Access Cases: Analysis & Implementation

## Overview

There are **two distinct use cases** for accessing tenant instances:

1. **Case 1: Master User Access** - Master user logs into tenant with own identity (no tenant user record)
2. **Case 2: User Impersonation** - Admin impersonates specific tenant user for debugging

Both cases require **permission-based access control** and **expiration mechanisms**.

## Case 1: Master User Access (Currently Implemented)

### Current Implementation Analysis

```typescript
// Current auth.service.ts - Case 1 is partially implemented
async login(dto: Omit<LoginDto, 'tenantId'>, tenantId?: string) {
  const user = await this.validateMasterUser(dto.email, dto.password);
  
  const payload = {
    sub: user.id,
    isSuperAdmin: user.isSuperAdmin,
    email: user.email,
    name: user.name,
  };

  // Case 1: Master user accessing tenant
  if (tenantId) {
    if (!user.isSuperAdmin) {
      // Check TenantUserPermission
      const permission = await this.masterPrisma.tenantUserPermission.findUnique({
        where: { userId_tenantId: { userId: user.id, tenantId: tenantId } }
      });
      
      if (!permission) {
        throw new ForbiddenException('You do not have permission to access this tenant.');
      }
    }
    // Add tenant context to JWT
    payload.tenantContext = tenantId;
  }
  
  return { accessToken: this.jwt.sign(payload) };
}
```

### Current Shortcomings

#### 1. **No Expiration Mechanism**
```typescript
// Current: No expiration for tenant access
payload.tenantContext = tenantId; // ← No expiration time
```

#### 2. **Limited Permission Granularity**
```typescript
// Current: Only binary permission (can access or cannot)
// Missing: Role-based permissions within tenant
```

#### 3. **No Audit Trail**
```typescript
// Current: No logging of tenant access
// Missing: Who accessed what tenant when
```

## Case 2: User Impersonation (Not Implemented)

### Required Implementation

#### 1. **Database Schema for Impersonation**

```sql
-- Master database: Impersonation sessions
CREATE TABLE impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id UUID NOT NULL REFERENCES master_users(id),
  original_tenant_id UUID REFERENCES tenants(id),
  impersonated_user_id UUID NOT NULL,
  impersonated_tenant_id UUID NOT NULL REFERENCES tenants(id),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  reason TEXT NOT NULL,
  session_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Master database: Impersonation permissions
CREATE TABLE impersonation_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES master_users(id),
  tenant_id UUID REFERENCES tenants(id), -- NULL = all tenants
  can_impersonate BOOLEAN DEFAULT false,
  max_duration_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Master database: Impersonation audit logs
CREATE TABLE impersonation_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  impersonation_session_id UUID NOT NULL REFERENCES impersonation_sessions(id),
  action TEXT NOT NULL, -- 'started', 'ended', 'action_performed'
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. **Enhanced AuthService**

```typescript
// Enhanced auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private readonly masterPrisma: MasterPrismaService,
    private readonly jwt: JwtService,
  ) {}

  // Case 1: Master user access with expiration
  async loginWithTenantAccess(
    dto: LoginDto,
    tenantId: string,
    accessDurationMinutes: number = 60
  ): Promise<LoginResponse> {
    const user = await this.validateMasterUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check tenant access permission
    const hasAccess = await this.checkTenantAccessPermission(user.id, tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have permission to access this tenant.');
    }

    const expiresAt = new Date(Date.now() + accessDurationMinutes * 60 * 1000);
    
    const payload = {
      sub: user.id,
      isSuperAdmin: user.isSuperAdmin,
      email: user.email,
      name: user.name,
      tenantContext: tenantId,
      accessType: 'master_user',
      expiresAt: expiresAt.toISOString(),
      originalUserId: user.id,
      impersonatedUserId: null
    };

    // Log the access
    await this.logTenantAccess(user.id, tenantId, 'master_user', expiresAt);

    return { accessToken: this.jwt.sign(payload) };
  }

  // Case 2: User impersonation
  async startImpersonation(
    adminUser: any,
    targetTenantId: string,
    targetUserId: string,
    reason: string,
    durationMinutes: number = 30
  ): Promise<LoginResponse> {
    // Validate admin can impersonate
    const canImpersonate = await this.validateImpersonationPermission(
      adminUser.id, 
      targetTenantId
    );
    
    if (!canImpersonate) {
      throw new ForbiddenException('You do not have permission to impersonate users in this tenant.');
    }

    // Get target user from tenant database
    const targetUser = await this.getTenantUser(targetTenantId, targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Target user not found in tenant.');
    }

    const startedAt = new Date();
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    // Create impersonation session
    const impersonationSession = await this.masterPrisma.impersonationSession.create({
      data: {
        originalUserId: adminUser.id,
        originalTenantId: adminUser.tenantId,
        impersonatedUserId: targetUserId,
        impersonatedTenantId: targetTenantId,
        startedAt,
        expiresAt,
        reason,
        sessionId: crypto.randomUUID()
      }
    });

    const payload = {
      sub: adminUser.id, // Original admin user ID
      isSuperAdmin: adminUser.isSuperAdmin,
      email: adminUser.email,
      name: adminUser.name,
      tenantContext: targetTenantId,
      accessType: 'impersonation',
      expiresAt: expiresAt.toISOString(),
      originalUserId: adminUser.id,
      impersonatedUserId: targetUserId,
      impersonationSessionId: impersonationSession.id
    };

    // Log impersonation start
    await this.logImpersonationAction(impersonationSession.id, 'started', {
      reason,
      targetUser: { id: targetUserId, email: targetUser.email }
    });

    return { accessToken: this.jwt.sign(payload) };
  }

  // End impersonation
  async endImpersonation(impersonationSessionId: string): Promise<void> {
    const session = await this.masterPrisma.impersonationSession.findUnique({
      where: { id: impersonationSessionId }
    });

    if (!session || session.endedAt) {
      throw new NotFoundException('Impersonation session not found or already ended.');
    }

    await this.masterPrisma.impersonationSession.update({
      where: { id: impersonationSessionId },
      data: { endedAt: new Date() }
    });

    await this.logImpersonationAction(impersonationSessionId, 'ended', {});
  }

  // Validate impersonation permission
  private async validateImpersonationPermission(
    userId: string, 
    tenantId: string
  ): Promise<boolean> {
    const permission = await this.masterPrisma.impersonationPermission.findFirst({
      where: {
        userId,
        OR: [
          { tenantId: tenantId },
          { tenantId: null } // Global permission
        ],
        canImpersonate: true
      }
    });

    return !!permission;
  }

  // Check tenant access permission
  private async checkTenantAccessPermission(
    userId: string, 
    tenantId: string
  ): Promise<boolean> {
    const user = await this.masterPrisma.user.findUnique({
      where: { id: userId }
    });

    if (user?.isSuperAdmin) {
      return true;
    }

    const permission = await this.masterPrisma.tenantUserPermission.findUnique({
      where: { userId_tenantId: { userId, tenantId } }
    });

    return !!permission;
  }

  // Log tenant access
  private async logTenantAccess(
    userId: string,
    tenantId: string,
    accessType: string,
    expiresAt: Date
  ): Promise<void> {
    // Implementation for audit logging
  }

  // Log impersonation action
  private async logImpersonationAction(
    sessionId: string,
    action: string,
    details: any
  ): Promise<void> {
    await this.masterPrisma.impersonationAuditLog.create({
      data: {
        impersonationSessionId: sessionId,
        action,
        details
      }
    });
  }
}
```

## Permission Management

### 1. **Tenant Access Permissions**
```sql
-- Master database: Granular tenant access permissions
CREATE TABLE tenant_access_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES master_users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  access_level TEXT NOT NULL, -- 'read', 'write', 'admin'
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES master_users(id)
);
```

### 2. **Impersonation Permissions**
```sql
-- Master database: Impersonation permissions
CREATE TABLE impersonation_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES master_users(id),
  tenant_id UUID, -- NULL = all tenants
  can_impersonate BOOLEAN DEFAULT false,
  max_duration_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Security Features

### 1. **Automatic Expiration**
- All access tokens have expiration times
- Impersonation sessions auto-expire
- Regular cleanup of expired sessions

### 2. **Audit Logging**
- Log all tenant access attempts
- Log all impersonation actions
- Track user journey across contexts

### 3. **Rate Limiting**
- Limit impersonation attempts per admin
- Prevent abuse of tenant access

### 4. **Notification System**
- Notify target user when impersonated (optional)
- Alert admins of suspicious activity

This comprehensive system handles both use cases with proper security, audit trails, and expiration mechanisms. 