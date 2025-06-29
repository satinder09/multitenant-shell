# Multi-Tenant SaaS Shell

A modern, scalable multi-tenant SaaS application shell built with NestJS and Next.js. This application provides a complete foundation for building multi-tenant software-as-a-service applications with database-per-tenant architecture, centralized user management, and a modern UI built with ShadCN components.

## ✨ Key Features

- **🏢 Multi-Tenancy**: Separate database per tenant with complete data isolation
- **🔐 Centralized Authentication**: Master database manages all users and tenant access
- **🚀 Automated Provisioning**: New tenant databases created and migrated automatically
- **👥 Role-Based Access Control**: Granular permissions system for platform and tenant levels
- **🎨 Modern UI**: Built with ShadCN/UI components and Tailwind CSS
- **🔍 Advanced Filtering**: Dynamic filter system with presets and custom filter builder
- **📱 Responsive Design**: Mobile-first design with collapsible navigation
- **🏗️ Domain-Driven Architecture**: Clean separation of concerns and modular structure

## 🛠️ Technology Stack

### Backend
- **[NestJS](https://nestjs.com/)** - Progressive Node.js framework
- **[Prisma](https://www.prisma.io/)** - Next-generation ORM with database-per-tenant support
- **[PostgreSQL](https://www.postgresql.org/)** - Robust relational database
- **[JWT](https://jwt.io/)** - Secure authentication tokens
- **[Docker](https://www.docker.com/)** - Containerized development environment

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[ShadCN/UI](https://ui.shadcn.com/)** - Modern, accessible UI components
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[React Hook Form](https://react-hook-form.com/)** - Performant form handling
- **[Date-fns](https://date-fns.org/)** - Modern date utility library

## 🏗️ Architecture

### Project Structure
```
multitenant-shell/
├── apps/
│   ├── backend/                 # NestJS API server
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules
│   │   │   │   ├── common/         # Shared utilities
│   │   │   │   └── middleware/     # Security middleware
│   │   │   └── prisma/             # Database schemas & migrations
│   │   └── frontend/               # Next.js application
│   │       ├── app/                # App Router pages
│   │       │   ├── platform/       # Platform admin pages
│   │       │   └── (tenant)/       # Tenant-specific pages
│   │       ├── components/         # Reusable UI components
│   │       │   ├── common/         # Generic components
│   │       │   ├── composite/      # Business logic components
│   │       │   ├── features/       # Feature-specific components
│   │       │   ├── layouts/        # Layout components
│   │       │   └── ui/            # ShadCN components
│   │       ├── domains/           # Domain-driven modules
│   │       │   ├── auth/          # Authentication
│   │       │   ├── platform/      # Platform management
│   │       │   └── tenant/        # Tenant functionality
│   │       └── shared/            # Shared utilities
│   └── docker-compose.yml         # Database setup
```

### Multi-Tenant Architecture
- **Master Database**: User management, tenant registry, platform administration
- **Tenant Databases**: Isolated data storage per tenant with automatic provisioning
- **Dynamic Connection Management**: Runtime database connection switching with caching
- **Security Layer**: Tenant isolation, CSRF protection, security headers

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later)
- [Docker & Docker Compose](https://www.docker.com/)
- Package manager: `npm`, `yarn`, or `pnpm`

### 1. Clone Repository
```bash
git clone <repository-url>
cd multitenant-shell
```

### 2. Environment Setup

**Backend (apps/backend/.env)**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/multitenant_master?schema=public"
JWT_SECRET="your-super-secret-jwt-key-here"
TENANT_DB_ENCRYPTION_KEY="your-32-character-encryption-key"
```

**Frontend (apps/frontend/.env.local)**:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### 3. Install Dependencies
```bash
# Backend
cd apps/backend
npm install

# Frontend  
cd ../frontend
npm install
cd ../..
```

### 4. Database Setup
```bash
# Start PostgreSQL
docker-compose up -d

# Run migrations
cd apps/backend
npx prisma migrate dev --name init

# Seed initial data
npx prisma db seed
```

### 5. Start Development Servers

**Terminal 1 - Backend**:
```bash
cd apps/backend
npm run start:dev
# Runs on http://localhost:3001
```

**Terminal 2 - Frontend**:
```bash
cd apps/frontend
npm run dev
# Runs on http://localhost:3000
```

### 6. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Login**: Use the super-admin credentials from the seed script

## 🎯 Key Features & Usage

### Platform Administration
- **User Management**: Create and manage platform users
- **Tenant Management**: Create tenants, manage access, impersonation
- **Role & Permission System**: Granular access control
- **Tenant Impersonation**: Secure tenant access for support

### Advanced Filter System
- **Filter Presets**: Pre-configured filters for common queries
- **Custom Filter Builder**: Complex filter creation with multiple operators
- **Dynamic Inputs**: Context-aware input types (text, dropdown, date range)
- **Saved Searches**: Persistent filter combinations
- **Real-time Filtering**: Instant results with debounced search

### UI/UX Features
- **ShadCN Dashboard**: Professional dashboard layout with sidebar navigation
- **Responsive Design**: Mobile-optimized with collapsible navigation
- **Modern Filter Interface**: Three-column dropdown with filters, grouping, and saved searches
- **Data Tables**: Sortable, filterable tables with pagination
- **Toast Notifications**: User feedback system

## 🔧 Development Guidelines

### Naming Conventions
- **Components**: PascalCase matching filename (`UserTable.tsx` → `UserTable`)
- **Properties**: Use `filterPreset` (not `popularFilter` or `popular`)
- **Files**: Descriptive names, avoid generic terms like "Advanced" or "Enhanced"

### Code Standards
- **TypeScript**: Strict typing, avoid `any` type
- **ShadCN First**: Use ShadCN components over custom implementations
- **Domain Organization**: Group related functionality by domain
- **Responsive Design**: Mobile-first approach with proper breakpoints

### Architecture Principles
- **Single Responsibility**: Components have focused, clear purposes
- **Domain-Driven Design**: Business logic organized by domain
- **Clean Separation**: Clear boundaries between UI, business logic, and data
- **Performance**: Optimized bundle size and render performance

## 🧪 Testing

```bash
# Backend tests
cd apps/backend
npm run test

# Frontend tests  
cd apps/frontend
npm run test

# Build verification
npm run build
```

## 📦 Deployment

### Production Build
```bash
# Backend
cd apps/backend
npm run build

# Frontend
cd apps/frontend  
npm run build
```

### Docker Deployment
```bash
# Build containers
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Follow the established folder structure and naming conventions
2. Use ShadCN components for UI consistency
3. Maintain TypeScript strict typing
4. Test thoroughly before submitting changes
5. Document any new features or architectural changes

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Documentation

- [Component Architecture](./apps/frontend/docs/COMPONENT_REFACTORING_PLAN.md)
- [Filter System Guide](./apps/frontend/shared/services/core/FILTER_SOURCE_GUIDE.md)
- [API Documentation](./apps/backend/src/modules/README.md)

---

**Built with ❤️ using modern web technologies for scalable multi-tenant applications.**
