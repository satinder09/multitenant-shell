# Tenant Isolation Test Guide

## Setup for lvh.me Testing

### 1. Environment Configuration

Make sure your environment variables are set correctly:

```bash
# Backend (.env)
FRONTEND_URL=http://lvh.me:3000
DATABASE_URL=postgresql://username:password@localhost:5432/master_db
TENANT_DB_ENCRYPTION_KEY=your-secret-key

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://lvh.me:4000
```

### 2. DNS Configuration

Add these entries to your `/etc/hosts` file (Windows: `C:\Windows\System32\drivers\etc\hosts`):

```
127.0.0.1 lvh.me
127.0.0.1 tenant1.lvh.me
127.0.0.1 tenant2.lvh.me
127.0.0.1 acme.lvh.me
```

### 3. Testing Scenarios

#### Scenario 1: Master Instance Access
- **URL**: `http://lvh.me:3000`
- **Expected**: Master dashboard with tenant management
- **Database**: Master database
- **Users**: Super admin users only

#### Scenario 2: Tenant Instance Access
- **URL**: `http://tenant1.lvh.me:3000`
- **Expected**: Tenant-specific dashboard
- **Database**: Isolated tenant database
- **Users**: Tenant users with specific permissions

#### Scenario 3: Cross-Tenant Isolation
1. Create a tenant called "acme"
2. Access `http://acme.lvh.me:3000`
3. Create some data in the tenant
4. Access `http://tenant1.lvh.me:3000`
5. Verify data is completely isolated

### 4. Verification Steps

#### Backend Logs
Check the backend logs for proper tenant resolution:

```bash
# Should show: "Root domain detected, skipping tenant resolution."
curl http://lvh.me:4000/api/auth/me

# Should show: "Detected subdomain: tenant1" and "Tenant found: id=..."
curl http://tenant1.lvh.me:4000/api/auth/me
```

#### Database Isolation
Verify each tenant has its own database:

```sql
-- Connect to master database
\c master_db
SELECT * FROM "Tenant";

-- Connect to tenant database
\c db_xl_acme_xxxxx
SELECT * FROM "User";
```

### 5. Expected Behavior

#### ✅ Working Correctly
- `lvh.me:3000` → Master instance (no tenant context)
- `tenant1.lvh.me:3000` → Tenant instance (tenant context)
- `tenant2.lvh.me:3000` → Different tenant instance
- Data isolation between tenants
- Proper authentication and authorization

#### ❌ Issues to Watch For
- Cross-tenant data leakage
- Authentication token confusion
- Database connection errors
- CORS issues with subdomains

### 6. Troubleshooting

#### Common Issues

1. **"Invalid tenant" error**
   - Check if tenant exists in master database
   - Verify subdomain matches tenant record

2. **CORS errors**
   - Ensure FRONTEND_URL includes lvh.me
   - Check that credentials are enabled

3. **Database connection errors**
   - Verify tenant database exists
   - Check encryption key is correct

4. **Authentication issues**
   - Clear browser cookies
   - Check JWT token contains correct tenant context

### 7. Security Verification

#### Test Cases
1. **Unauthorized Access**: Try accessing tenant1.lvh.me without proper permissions
2. **Cross-Tenant Access**: Try to access tenant2 data from tenant1 context
3. **Master Access**: Verify non-admin users can't access master features
4. **Token Validation**: Test with invalid/expired tokens

#### Expected Results
- All unauthorized access should be blocked
- Clear error messages for security violations
- Proper audit logging of access attempts 