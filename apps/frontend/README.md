# Multi-Tenant SaaS Application - Frontend

A sophisticated multi-tenant SaaS application built with Next.js and NestJS, featuring advanced authentication, role-based access control, and seamless tenant management.

## ��� Overview

This application provides a comprehensive multi-tenant platform where:
- **Platform Domain** (`platform.example.com`) - Master dashboard for super admins to manage tenants
- **Tenant Subdomains** (`tenant1.example.com`) - Individual tenant applications with isolated data
- **Advanced Security** - Cross-domain authentication, impersonation, and secure tenant access
- **RBAC** - Comprehensive role and permission management at both platform and tenant levels

## ���️ Architecture

### Multi-Tenant Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Platform Domain                           │
│              (platform.example.com)                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Master Dashboard - Super Admin Interface          │    │
│  │  • Tenant Management                               │    │
│  │  • User Management                                 │    │
│  │  • Platform-wide RBAC                             │    │
│  │  • Secure Login to Tenants                        │    │
│  │  • User Impersonation                             │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Tenant Subdomains                         │
│         (tenant1.example.com, tenant2.example.com)         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Tenant-Specific Applications                      │    │
│  │  • Isolated Data & Users                          │    │
│  │  • Tenant-specific RBAC                           │    │
│  │  • Custom Branding                                │    │
│  │  • Tenant Administration                          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Authentication Flow
```
Platform Login → JWT with Platform Context
    │
    ├── Direct Platform Access (Super Admin)
    │
    └── Secure Login to Tenant → New JWT with Tenant Context
            │
            ├── Regular Tenant Access
            │
            └── User Impersonation → Enhanced JWT with Impersonation Data
```

## ��� Key Features

### ��� Advanced Authentication
- **JWT-based Authentication** with context-aware tokens
- **Cross-domain Cookie Management** for seamless tenant switching
- **Rate Limited Login** with lockout protection
- **Session Management** with automatic token refresh

### ��� Multi-Tenant Management
- **Tenant Isolation** - Complete data separation between tenants
- **Dynamic Subdomain Routing** - Automatic tenant resolution
- **Tenant-specific Branding** - Custom themes and configurations
- **Resource Quotas** - Per-tenant limits and billing

### ��� User Management
- **Platform Users** - Super admins and tenant managers
- **Tenant Users** - Isolated per tenant with tenant-specific roles
- **User Impersonation** - Secure admin access to user accounts
- **Audit Logging** - Complete access and action tracking

### ���️ Role-Based Access Control (RBAC)
- **Dual-Level RBAC** - Platform-wide and tenant-specific permissions
- **Dynamic Permission Checking** - Runtime permission validation
- **Role Inheritance** - Hierarchical permission structures
- **Permission Guards** - Automatic route protection

### ��� Secure Cross-Tenant Access
- **Secure Login** - Time-limited tenant access for platform admins
- **User Impersonation** - Debug and support user accounts
- **Access Logging** - Full audit trail of cross-tenant access
- **Automatic Session Cleanup** - Secure session termination

## ��� Project Structure

```
apps/frontend/
├── app/                          # Next.js App Router
│   ├── (tenant)/                 # Tenant-specific routes
│   │   ├── page.tsx              # Tenant dashboard
│   │   ├── page1/                # Tenant feature pages
│   │   └── admin/                # Tenant administration
│   ├── platform/                 # Platform administration
│   │   ├── admin/                # Platform admin features
│   │   │   ├── users/            # Platform user management
│   │   │   ├── roles/            # Platform role management
│   │   │   └── permissions/      # Platform permission management
│   │   ├── tenants/              # Tenant management
│   │   └── users/                # User management
│   ├── login/                    # Authentication
│   └── api/                      # API routes
│       ├── auth/                 # Authentication endpoints
│       ├── platform/             # Platform API routes
│       ├── tenant-access/        # Cross-tenant access
│       ├── rbac/                 # Role-based access control
│       └── tenants/              # Tenant management
│
├── components/                   # UI Components
│   ├── ui/                       # Primitive UI components (shadcn/ui)
│   ├── composite/                # Complex reusable components
│   ├── layouts/                  # Layout & navigation components
│   ├── features/                 # Business-specific components
│   └── common/                   # Shared application components
│
├── domains/                      # Business Logic Domains
│   ├── auth/                     # Authentication domain
│   │   ├── components/           # Auth-specific components
│   │   ├── hooks/                # Authentication hooks
│   │   ├── services/             # Auth API clients
│   │   └── types/                # Auth type definitions
│   ├── platform/                 # Platform management domain
│   └── tenant/                   # Tenant-specific domain
│
├── shared/                       # Shared Utilities
│   ├── services/                 # API clients and utilities
│   ├── hooks/                    # Custom React hooks
│   ├── utils/                    # Utility functions
│   ├── types/                    # Type definitions
│   └── modules/                  # Generic module system
│
├── context/                      # React Contexts
│   ├── AuthContext.tsx           # Authentication state
│   ├── PlatformContext.tsx       # Platform/tenant detection
│   └── theme-provider.tsx        # Theme management
│
├── docs/                         # Documentation
└── public/                       # Static assets
```

## ���️ Technologies

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

## ��� Getting Started

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

## ��� Authentication System

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
   → JWT with platform context
   → Access to platform features
   ```

2. **Secure Tenant Access**
   ```typescript
   // Platform admin accessing tenant
   POST /api/tenant-access/secure-login
   → New JWT with tenant context
   → Time-limited tenant access
   ```

3. **User Impersonation**
   ```typescript
   // Impersonate tenant user
   POST /api/tenant-access/impersonate
   → Enhanced JWT with impersonation data
   → Full user account access
   ```

## ��� Multi-Tenant Routing

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
- **Platform Domain**: `platform.example.com` → Platform interface
- **Tenant Subdomain**: `{tenant}.example.com` → Tenant interface
- **Development**: `*.lvh.me` → Local development domains

## ��� API Architecture

### Route Organization
```
/api/
├── auth/                    # Authentication
│   ├── login               # User login
│   ├── logout              # User logout
│   ├── me                  # Current user info
│   └── csrf-token          # CSRF protection
│
├── platform/               # Platform management
│   ├── admin/users         # Platform user management
│   └── tenants             # Tenant CRUD operations
│
├── tenant-access/          # Cross-tenant access
│   ├── secure-login        # Secure tenant access
│   ├── impersonate         # User impersonation
│   └── tenants/{id}/users  # Tenant user lists
│
├── rbac/                   # Role-based access control
│   ├── roles               # Role management
│   └── permissions         # Permission management
│
└── modules/                # Dynamic module system
    └── [module]            # Module-specific endpoints
```

## ��� UI Component System

### Component Hierarchy
```
UI Components (shadcn/ui)
    ↓ compose into
Composite Components (DataTable, etc.)
    ↓ compose into
Feature Components (UserManagement, etc.)
    ↓ compose into
Page Components (Platform Dashboard, etc.)
```

### Design System
- **Consistent Theming** - Dark/light mode support
- **Responsive Design** - Mobile-first approach
- **Accessibility** - WCAG compliant components
- **Type Safety** - Full TypeScript integration
