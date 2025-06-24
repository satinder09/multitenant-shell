# Tenant Impersonation Logic Explained

## Overview

Your system implements a sophisticated **tenant impersonation** mechanism that allows users to seamlessly switch between the master instance and tenant instances while maintaining proper security and data isolation. This is **NOT** traditional user impersonation, but rather **context-aware authentication** based on subdomain resolution.

## How It Works

### 1. **Subdomain-Based Tenant Resolution**

```
Master Instance:     lvh.me:3000
Tenant Instances:    tenant1.lvh.me:3000, tenant2.lvh.me:3000
```

The system uses the `TenantResolverMiddleware` to detect which tenant context you're accessing:

```typescript
// From tenant-resolver.middleware.ts
const [subdomain] = hostWithoutPort.split('.');
// tenant1.lvh.me → subdomain = "tenant1"
```

### 2. **Authentication Flow**

#### Step 1: Login Request
When you login at `tenant1.lvh.me:3000`:

```typescript
// auth.controller.ts
async login(
  @Body() dto: LoginDto,
  @TenantContext() tenant: { id: string; databaseUrl: string } | undefined,
  @Res({ passthrough: true }) res: Response,
) {
  // tenant.id = "tenant1's database ID"
  const { accessToken } = await this.authService.login(dto, tenant?.id);
  // ...
}
```

#### Step 2: Permission Validation
The `AuthService` checks if you have access to this tenant:

```typescript
// auth.service.ts
async login(dto: Omit<LoginDto, 'tenantId'>, tenantId?: string) {
  const user = await this.validateMasterUser(dto.email, dto.password);
  
  const payload = {
    sub: user.id,
    isSuperAdmin: user.isSuperAdmin,
    email: user.email,
    name: user.name,
  };

  // If logging in via a tenant subdomain, check permissions
  if (tenantId) {
    if (!user.isSuperAdmin) {
      // Check if user has explicit permission for this tenant
      const permission = await this.masterPrisma.tenantUserPermission.findUnique({
        where: { userId_tenantId: { userId: user.id, tenantId: tenantId } }
      });
      
      if (!permission) {
        throw new ForbiddenException('You do not have permission to access this tenant.');
      }
    }
    // Add tenant context to JWT payload
    payload.tenantContext = tenantId;
  }
  
  return { accessToken: this.jwt.sign(payload) };
}
```

#### Step 3: JWT Token Creation
The JWT token contains tenant context:

```typescript
// JWT Payload Structure
{
  "sub": "user-id",
  "isSuperAdmin": true,
  "email": "admin@example.com",
  "name": "Admin User",
  "tenantContext": "tenant1-id"  // ← This is the key!
}
```

### 3. **Database Context Switching**

#### Master Database (lvh.me:3000)
- Uses `MasterPrismaService`
- Contains: Users, Tenants, TenantUserPermissions
- No tenant context in JWT

#### Tenant Database (tenant1.lvh.me:3000)
- Uses `TenantPrismaService`
- Contains: Tenant-specific data (Users, Roles, Permissions, etc.)
- JWT contains `tenantContext`

### 4. **Dynamic Database Connection**

The system dynamically switches database connections based on the tenant context:

```typescript
// prisma-tenant.module.ts
{
  provide: 'TENANT_CLIENT',
  scope: Scope.REQUEST,
  useFactory: (req: any) => {
    if (!req.tenant) {
      return null; // Master context
    }
    return getTenantClient(req.tenant); // Tenant-specific database
  },
  inject: [REQUEST],
}
```

### 5. **Request Flow Example**

#### Request to `tenant1.lvh.me:3000/api/users`

1. **Middleware**: `TenantResolverMiddleware` detects subdomain "tenant1"
2. **Tenant Resolution**: Looks up tenant in master database
3. **Database URL**: Gets encrypted tenant database URL
4. **Request Context**: `req.tenant = { id: "tenant1-id", databaseUrl: "..." }`
5. **JWT Validation**: `JwtStrategy` extracts `tenantContext` from token
6. **Database Connection**: `TenantPrismaService` connects to tenant1's database
7. **Data Access**: All queries go to tenant1's isolated database

## Security Model

### 1. **Permission-Based Access**
- **Super Admins**: Can access any tenant
- **Regular Users**: Must have explicit `TenantUserPermission` record
- **No Cross-Tenant Access**: Impossible to access data from other tenants

### 2. **Token-Based Isolation**
- JWT tokens are domain-specific
- `tenantContext` in token determines database connection
- No way to "hack" into other tenants

### 3. **Database Isolation**
- Each tenant has completely separate database
- No shared tables between tenants
- Physical data separation

## Key Components

### 1. **TenantResolverMiddleware**
- Resolves tenant from subdomain
- Attaches tenant context to request
- Handles root domain bypass

### 2. **AuthService**
- Validates user credentials against master database
- Checks tenant permissions
- Creates context-aware JWT tokens

### 3. **JwtStrategy**
- Extracts tenant context from JWT
- Attaches user info to request
- Handles both master and tenant contexts

### 4. **TenantPrismaService**
- Dynamic database connection
- Request-scoped tenant isolation
- Automatic connection management

## Impersonation vs. Context Switching

This is **NOT** traditional impersonation where one user pretends to be another. Instead, it's:

- **Context-Aware Authentication**: Same user, different context
- **Subdomain-Based Routing**: Different URLs = different contexts
- **Database Isolation**: Each context has its own data
- **Permission Validation**: Ensures user can access the context

## Benefits

1. **Seamless Experience**: No need to "switch users"
2. **Security**: Proper permission validation
3. **Isolation**: Complete data separation
4. **Scalability**: Each tenant is independent
5. **Audit Trail**: Clear context in JWT tokens

## Example Scenarios

### Scenario 1: Super Admin Access
1. Login at `lvh.me:3000` → Master context
2. Create tenant "acme"
3. Login at `acme.lvh.me:3000` → Tenant context
4. Same user, different database, different UI

### Scenario 2: Regular User Access
1. User has permission for "tenant1" only
2. Login at `tenant1.lvh.me:3000` → Success
3. Try to access `tenant2.lvh.me:3000` → Permission denied
4. Try to access `lvh.me:3000` → Redirected to login

### Scenario 3: Cross-Tenant Isolation
1. User A in tenant1 creates data
2. User B in tenant2 cannot see User A's data
3. Even if they have the same email, they're different users
4. Complete data isolation maintained

## Debugging

### Check Current Context
```javascript
// In browser console
fetch('/api/auth/me')
  .then(r => r.json())
  .then(user => console.log(user));
// Shows: { id: "...", tenantId: "tenant1-id", ... }
```

### Check Database Connection
```typescript
// Backend logs show:
// "Tenant found: id=tenant1-id"
// "Using tenant database: db_xl_tenant1_xxxxx"
```

### Verify Isolation
```sql
-- Master database
SELECT * FROM "Tenant";

-- Tenant database (different data)
SELECT * FROM "User";
```

This architecture provides a robust, secure, and scalable multi-tenant system with proper data isolation and context-aware authentication. 