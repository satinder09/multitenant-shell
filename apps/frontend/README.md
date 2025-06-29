# Multi-Tenant SaaS Application - Frontend

A sophisticated multi-tenant SaaS application built with Next.js and NestJS, featuring advanced authentication, role-based access control, and seamless tenant management.

## νΊ Overview

This application provides a comprehensive multi-tenant platform where:
- **Platform Domain** (`platform.example.com`) - Master dashboard for super admins to manage tenants
- **Tenant Subdomains** (`tenant1.example.com`) - Individual tenant applications with isolated data
- **Advanced Security** - Cross-domain authentication, impersonation, and secure tenant access
- **RBAC** - Comprehensive role and permission management at both platform and tenant levels

## νΏοΈ Architecture

### Multi-Tenant Architecture
```
βββββββββββββββββββββββββββββββββββββββββββββββββββββββββββββββ
β                    Platform Domain                           β
β              (platform.example.com)                        β
β  βββββββββββββββββββββββββββββββββββββββββββββββββββββββ    β
β  β  Master Dashboard - Super Admin Interface          β    β
β  β  β’ Tenant Management                               β    β
β  β  β’ User Management                                 β    β
β  β  β’ Platform-wide RBAC                             β    β
β  β  β’ Secure Login to Tenants                        β    β
β  β  β’ User Impersonation                             β    β
β  βββββββββββββββββββββββββββββββββββββββββββββββββββββββ    β
βββββββββββββββββββββββββββββββββββββββββββββββββββββββββββββββ
                              β
                              βΌ
βββββββββββββββββββββββββββββββββββββββββββββββββββββββββββββββ
β                  Tenant Subdomains                         β
β         (tenant1.example.com, tenant2.example.com)         β
β  βββββββββββββββββββββββββββββββββββββββββββββββββββββββ    β
β  β  Tenant-Specific Applications                      β    β
β  β  β’ Isolated Data & Users                          β    β
β  β  β’ Tenant-specific RBAC                           β    β
β  β  β’ Custom Branding                                β    β
β  β  β’ Tenant Administration                          β    β
β  βββββββββββββββββββββββββββββββββββββββββββββββββββββββ    β
βββββββββββββββββββββββββββββββββββββββββββββββββββββββββββββββ
```

### Authentication Flow
```
Platform Login β JWT with Platform Context
    β
    βββ Direct Platform Access (Super Admin)
    β
    βββ Secure Login to Tenant β New JWT with Tenant Context
            β
            βββ Regular Tenant Access
            β
            βββ User Impersonation β Enhanced JWT with Impersonation Data
```

## νΎ― Key Features

### ν΄ Advanced Authentication
- **JWT-based Authentication** with context-aware tokens
- **Cross-domain Cookie Management** for seamless tenant switching
- **Rate Limited Login** with lockout protection
- **Session Management** with automatic token refresh

### νΏ’ Multi-Tenant Management
- **Tenant Isolation** - Complete data separation between tenants
- **Dynamic Subdomain Routing** - Automatic tenant resolution
- **Tenant-specific Branding** - Custom themes and configurations
- **Resource Quotas** - Per-tenant limits and billing

### ν±₯ User Management
- **Platform Users** - Super admins and tenant managers
- **Tenant Users** - Isolated per tenant with tenant-specific roles
- **User Impersonation** - Secure admin access to user accounts
- **Audit Logging** - Complete access and action tracking

### ν»‘οΈ Role-Based Access Control (RBAC)
- **Dual-Level RBAC** - Platform-wide and tenant-specific permissions
- **Dynamic Permission Checking** - Runtime permission validation
- **Role Inheritance** - Hierarchical permission structures
- **Permission Guards** - Automatic route protection

### ν΄ Secure Cross-Tenant Access
- **Secure Login** - Time-limited tenant access for platform admins
- **User Impersonation** - Debug and support user accounts
- **Access Logging** - Full audit trail of cross-tenant access
- **Automatic Session Cleanup** - Secure session termination

## ν³ Project Structure

```
apps/frontend/
βββ app/                          # Next.js App Router
β   βββ (tenant)/                 # Tenant-specific routes
β   β   βββ page.tsx              # Tenant dashboard
β   β   βββ page1/                # Tenant feature pages
β   β   βββ admin/                # Tenant administration
β   βββ platform/                 # Platform administration
β   β   βββ admin/                # Platform admin features
β   β   β   βββ users/            # Platform user management
β   β   β   βββ roles/            # Platform role management
β   β   β   βββ permissions/      # Platform permission management
β   β   βββ tenants/              # Tenant management
β   β   βββ users/                # User management
β   βββ login/                    # Authentication
β   βββ api/                      # API routes
β       βββ auth/                 # Authentication endpoints
β       βββ platform/             # Platform API routes
β       βββ tenant-access/        # Cross-tenant access
β       βββ rbac/                 # Role-based access control
β       βββ tenants/              # Tenant management
β
βββ components/                   # UI Components
β   βββ ui/                       # Primitive UI components (shadcn/ui)
β   βββ composite/                # Complex reusable components
β   βββ layouts/                  # Layout & navigation components
β   βββ features/                 # Business-specific components
β   βββ common/                   # Shared application components
β
βββ domains/                      # Business Logic Domains
β   βββ auth/                     # Authentication domain
β   β   βββ components/           # Auth-specific components
β   β   βββ hooks/                # Authentication hooks
β   β   βββ services/             # Auth API clients
β   β   βββ types/                # Auth type definitions
β   βββ platform/                 # Platform management domain
β   βββ tenant/                   # Tenant-specific domain
β
βββ shared/                       # Shared Utilities
β   βββ services/                 # API clients and utilities
β   βββ hooks/                    # Custom React hooks
β   βββ utils/                    # Utility functions
β   βββ types/                    # Type definitions
β   βββ modules/                  # Generic module system
β
βββ context/                      # React Contexts
β   βββ AuthContext.tsx           # Authentication state
β   βββ PlatformContext.tsx       # Platform/tenant detection
β   βββ theme-provider.tsx        # Theme management
β
βββ docs/                         # Documentation
βββ public/                       # Static assets
```

## ν» οΈ Technologies

### Frontend Stack
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality UI components
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **Jose** - JWT handling

### Backend Integration
- **NestJS** - Node.js backend framework
- **Prisma** - Database ORM with multi-tenant support
- **PostgreSQL** - Database per tenant
- **Redis** - Caching and session management
- **JWT** - Authentication tokens

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **TypeScript** - Static type checking

## νΊ¦ Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Redis server
- Backend application running

### Environment Setup
```bash
# Copy environment template
cp .env.local.example .env.local

# Configure environment variables
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_BASE_DOMAIN=lvh.me
NEXT_PUBLIC_FRONTEND_PORT=3000
```

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Development URLs
- **Platform**: `http://platform.lvh.me:3000`
- **Tenant Example**: `http://tenant1.lvh.me:3000`
- **Local Development**: `http://localhost:3000` (auto-redirects)

## ν΄ Authentication System

### JWT Token Structure
```typescript
interface JwtPayload {
  sub: string;                    // User ID
  email: string;                  // User email
  name: string;                   // User name
  isSuperAdmin?: boolean;         // Platform super admin flag
  tenantContext?: string;         // Tenant ID for tenant sessions
  accessType?: string;            // 'platform' | 'secure_login' | 'impersonation'
  impersonatedUserId?: string;    // When impersonating a user
  impersonationSessionId?: string; // Impersonation session tracking
  expiresAt?: string;             // Token expiration
  reason?: string;                // Access reason for auditing
}
```

### Authentication Flow

1. **Platform Login**
   ```typescript
   // Login to platform domain
   POST /api/auth/login
   β JWT with platform context
   β Access to platform features
   ```

2. **Secure Tenant Access**
   ```typescript
   // Platform admin accessing tenant
   POST /api/tenant-access/secure-login
   β New JWT with tenant context
   β Time-limited tenant access
   ```

3. **User Impersonation**
   ```typescript
   // Impersonate tenant user
   POST /api/tenant-access/impersonate
   β Enhanced JWT with impersonation data
   β Full user account access
   ```

## ν΄ Multi-Tenant Routing

### Middleware Logic
The application uses sophisticated middleware to handle multi-tenant routing:

```typescript
// apps/frontend/middleware.ts
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')!;
  const isPlatform = isPlatformHost(hostname);
  const tenantSubdomain = getTenantSubdomain(hostname);
  
  // Route based on domain and authentication context
  if (tenantId && isPlatform) {
    // Tenant user trying to access platform - deny
    return redirectToLogin();
  }
  
  if (!tenantId && !isPlatform && !isSuperAdmin) {
    // Platform user trying to access tenant without permission - deny
    return redirectToLogin();
  }
}
```

### Domain Resolution
- **Platform Domain**: `platform.example.com` β Platform interface
- **Tenant Subdomain**: `{tenant}.example.com` β Tenant interface
- **Development**: `*.lvh.me` β Local development domains

## ν³‘ API Architecture

### Route Organization
```
/api/
βββ auth/                    # Authentication
β   βββ login               # User login
β   βββ logout              # User logout
β   βββ me                  # Current user info
β   βββ csrf-token          # CSRF protection
β
βββ platform/               # Platform management
β   βββ admin/users         # Platform user management
β   βββ tenants             # Tenant CRUD operations
β
βββ tenant-access/          # Cross-tenant access
β   βββ secure-login        # Secure tenant access
β   βββ impersonate         # User impersonation
β   βββ tenants/{id}/users  # Tenant user lists
β
βββ rbac/                   # Role-based access control
β   βββ roles               # Role management
β   βββ permissions         # Permission management
β
βββ modules/                # Dynamic module system
    βββ [module]            # Module-specific endpoints
```

## νΎ¨ UI Component System

### Component Hierarchy
```
UI Components (shadcn/ui)
    β compose into
Composite Components (DataTable, etc.)
    β compose into
Feature Components (UserManagement, etc.)
    β compose into
Page Components (Platform Dashboard, etc.)
```

### Design System
- **Consistent Theming** - Dark/light mode support
- **Responsive Design** - Mobile-first approach
- **Accessibility** - WCAG compliant components
- **Type Safety** - Full TypeScript integration
