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

#### 3. **Enhanced JWT Strategy**

```typescript
// Enhanced jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => req?.cookies?.Authentication,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    name: string;
    isSuperAdmin?: boolean;
    tenantContext?: string;
    accessType?: string;
    expiresAt?: string;
    originalUserId?: string;
    impersonatedUserId?: string;
    impersonationSessionId?: string;
  }) {
    // Check if token is expired
    if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
      throw new UnauthorizedException('Access token has expired.');
    }

    // For impersonation, validate session is still active
    if (payload.accessType === 'impersonation' && payload.impersonationSessionId) {
      const session = await this.authService.validateImpersonationSession(
        payload.impersonationSessionId
      );
      
      if (!session || session.endedAt) {
        throw new UnauthorizedException('Impersonation session has ended.');
      }
    }

    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      isSuperAdmin: payload.isSuperAdmin,
      tenantId: payload.tenantContext,
      accessType: payload.accessType,
      originalUserId: payload.originalUserId,
      impersonatedUserId: payload.impersonatedUserId,
      impersonationSessionId: payload.impersonationSessionId
    };

    return user;
  }
}
```

#### 4. **API Endpoints**

```typescript
// auth.controller.ts - Enhanced endpoints
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Case 1: Master user login with tenant access
  @Post('login/tenant/:tenantId')
  @HttpCode(HttpStatus.OK)
  async loginWithTenantAccess(
    @Body() dto: LoginDto,
    @Param('tenantId') tenantId: string,
    @Query('duration') duration?: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const { accessToken } = await this.authService.loginWithTenantAccess(
      dto, 
      tenantId, 
      duration || 60
    );

    res.cookie('Authentication', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: (duration || 60) * 60 * 1000,
    });

    return { accessToken };
  }

  // Case 2: Start impersonation
  @Post('impersonate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async startImpersonation(
    @Body() dto: {
      tenantId: string;
      targetUserId: string;
      reason: string;
      duration?: number;
    },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const { accessToken } = await this.authService.startImpersonation(
      req.user,
      dto.tenantId,
      dto.targetUserId,
      dto.reason,
      dto.duration || 30
    );

    res.cookie('Authentication', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: (dto.duration || 30) * 60 * 1000,
    });

    return { accessToken };
  }

  // End impersonation
  @Post('impersonate/end')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async endImpersonation(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    const user = req.user as any;
    
    if (user.impersonationSessionId) {
      await this.authService.endImpersonation(user.impersonationSessionId);
    }

    // Clear cookie and redirect to original context
    res.clearCookie('Authentication');
    
    return { success: true };
  }

  // Get current impersonation status
  @Get('impersonate/status')
  @UseGuards(JwtAuthGuard)
  async getImpersonationStatus(@Req() req: Request) {
    const user = req.user as any;
    
    if (user.accessType === 'impersonation') {
      const session = await this.authService.getImpersonationSession(
        user.impersonationSessionId
      );
      
      return {
        isImpersonating: true,
        originalUser: { id: user.originalUserId, email: user.email },
        impersonatedUser: { id: user.impersonatedUserId },
        startedAt: session?.startedAt,
        expiresAt: session?.expiresAt,
        reason: session?.reason
      };
    }
    
    return { isImpersonating: false };
  }
}
```

#### 5. **Frontend Components**

```typescript
// ImpersonationBanner.tsx
export function ImpersonationBanner() {
  const { user } = useAuth();
  const [impersonationStatus, setImpersonationStatus] = useState(null);

  useEffect(() => {
    if (user?.accessType === 'impersonation') {
      fetch('/api/auth/impersonate/status')
        .then(r => r.json())
        .then(setImpersonationStatus);
    }
  }, [user]);

  if (!impersonationStatus?.isImpersonating) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
          <span className="text-sm text-yellow-800">
            You are impersonating {impersonationStatus.impersonatedUser.email}
          </span>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => fetch('/api/auth/impersonate/end', { method: 'POST' })}
        >
          End Impersonation
        </Button>
      </div>
    </div>
  );
}

// ImpersonationDialog.tsx
export function ImpersonationDialog() {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(30);

  const handleImpersonate = async () => {
    const response = await fetch('/api/auth/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: selectedTenant,
        targetUserId: selectedUser,
        reason,
        duration
      })
    });

    if (response.ok) {
      window.location.reload();
    }
  };

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Impersonate User</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Select value={selectedTenant} onValueChange={setSelectedTenant}>
            <SelectTrigger>
              <SelectValue placeholder="Select Tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map(tenant => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Select User" />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Reason for impersonation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <Input
            type="number"
            placeholder="Duration (minutes)"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
          />

          <Button onClick={handleImpersonate} disabled={!selectedTenant || !selectedUser || !reason}>
            Start Impersonation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
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