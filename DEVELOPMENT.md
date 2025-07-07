# 🛠️ Development Guide

This guide covers everything you need to know to develop the Multitenant Shell application efficiently.

## 🏗️ **Clean Architecture Overview**

The project has been completely restructured with a ground-up, production-ready architecture:

```
multitenant-shell/                  # Root monorepo
├── apps/
│   ├── backend/                   # NestJS API Server (Port 4000)
│   ├── frontend/                  # Next.js Application (Port 3000)
│   └── docs/                      # Fumadocs Documentation (Port 3001)
├── dev-start.sh                   # Development startup script
├── env.example                    # Environment variables template
├── package.json                   # Monorepo configuration
├── tsconfig.json                  # Shared TypeScript config
└── .npmrc                         # NPM configuration
```

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+
- npm 8+
- PostgreSQL (for backend)
- Redis (optional, for caching)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd multitenant-shell
cp env.example .env  # Copy and configure environment variables
npm run setup        # Install dependencies and build backend
```

### 2. Start Development Environment

**Option A: Single Script (Recommended)**
```bash
npm run dev:single
# or
./dev-start.sh
```

**Option B: Concurrent (Alternative)**
```bash
npm run dev
```

**Option C: Individual Services**
```bash
npm run dev:backend   # Start backend only
npm run dev:frontend  # Start frontend only
npm run dev:docs      # Start docs only
```

## 🔧 **Port Configuration**

| Service        | Port | URL                          |
|----------------|------|------------------------------|
| Backend API    | 4000 | http://localhost:4000        |
| Frontend       | 3000 | http://localhost:3000        |
| Documentation  | 3001 | http://localhost:3001        |
| Health Check   | 4000 | http://localhost:4000/health |
| API Metrics    | 4000 | http://localhost:4000/metrics|

**Docker Ports (when using docker-compose):**
- PostgreSQL: 5432
- Redis: 6379
- Grafana: 3002
- Prometheus: 9090
- Loki: 3100

## 📁 **Project Structure**

### Backend (`apps/backend/`)
```
backend/
├── src/
│   ├── domains/              # Domain-driven architecture
│   │   ├── auth/            # Authentication & authorization
│   │   ├── platform/        # Platform management
│   │   ├── tenant/          # Tenant management
│   │   └── database/        # Database management
│   ├── infrastructure/      # Cross-cutting concerns
│   │   ├── monitoring/      # Health checks & metrics
│   │   ├── performance/     # Performance optimization
│   │   └── cache/           # Caching layer
│   ├── shared/              # Shared utilities
│   └── main.ts              # Application entry point
├── prisma/                  # Database schema & migrations
├── test/                    # Test suites
└── docker-compose.yml       # Development services
```

### Frontend (`apps/frontend/`)
```
frontend/
├── app/                     # Next.js App Router
│   ├── (tenant)/           # Tenant-specific routes
│   ├── platform/           # Platform administration
│   └── api/                # API routes
├── components/              # Reusable UI components
├── domains/                 # Domain-specific logic
│   ├── auth/               # Authentication components
│   ├── platform/           # Platform components
│   └── tenant/             # Tenant components
├── shared/                  # Shared utilities
└── context/                 # React context providers
```

### Documentation (`apps/docs/`)
```
docs/
├── src/
│   ├── app/                # Next.js pages
│   ├── components/         # Documentation components
│   ├── lib/               # Fumadocs configuration
│   └── config/            # Domain configuration
├── content/               # MDX documentation files
└── scripts/               # Documentation generation
```

## 🔨 **Development Commands**

### Building
```bash
npm run build              # Build all applications
npm run build:backend      # Build backend only
npm run build:frontend     # Build frontend only
npm run build:docs         # Build documentation only
```

### Testing
```bash
npm run test               # Run all tests
npm run test:backend       # Backend tests
npm run test:frontend      # Frontend tests
```

### Code Quality
```bash
npm run lint               # Lint all projects
npm run format             # Format all code
npm run typecheck          # TypeScript checking
```

### Maintenance
```bash
npm run clean              # Clean all build artifacts
npm run clean:install      # Clean and reinstall dependencies
```

## 🌍 **Environment Configuration**

Copy `env.example` to `.env` and configure:

### Backend Configuration
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/multitenant_master

# Authentication
JWT_SECRET=your-super-secure-jwt-secret

# Server
PORT=4000
```

### Frontend Configuration
```env
# API Configuration
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# Domain Configuration
NEXT_PUBLIC_BASE_DOMAIN=lvh.me
NEXT_PUBLIC_FRONTEND_PORT=3000
```

### Documentation Configuration
```env
# Documentation Server
DOCS_PORT=3001
DOCS_DOMAIN=base
```

## 🏃‍♂️ **Development Workflow**

### 1. Daily Development
```bash
# Start all services
./dev-start.sh

# In separate terminals:
tail -f logs/backend.log    # Monitor backend
tail -f logs/frontend.log   # Monitor frontend
tail -f logs/docs.log       # Monitor documentation
```

### 2. Making Changes

**Backend Changes:**
- Modify files in `apps/backend/src/`
- NestJS hot reload will restart automatically
- Check `logs/backend.log` for errors

**Frontend Changes:**
- Modify files in `apps/frontend/`
- Next.js hot reload will update automatically
- Browser will refresh automatically

**Documentation Changes:**
- Modify MDX files in `apps/docs/content/`
- Fumadocs will update automatically

### 3. Database Changes
```bash
cd apps/backend

# Create migration
npx prisma migrate dev --name your-migration-name

# Generate client
npm run prisma:generate

# View database
npm run prisma:studio
```

## 🔍 **Debugging**

### Backend Debugging
```bash
# Start in debug mode
cd apps/backend
npm run start:debug

# Attach debugger to port 9229
```

### Frontend Debugging
- Use browser DevTools
- React DevTools extension
- Next.js debugging features

### Health Checks
- Backend: http://localhost:4000/health
- Frontend: http://localhost:3000 (should load)
- Documentation: http://localhost:3001 (should load)

## 🧪 **Testing Strategy**

### Unit Tests
```bash
# Backend unit tests
cd apps/backend
npm run test

# Frontend unit tests
cd apps/frontend
npm run test
```

### Integration Tests
```bash
# Backend integration tests
cd apps/backend
npm run test:integration
```

### End-to-End Tests
```bash
# Full E2E test suite
cd apps/backend
npm run test:e2e
```

## 📦 **Dependency Management**

### Adding Dependencies

**Backend:**
```bash
cd apps/backend
npm install package-name
```

**Frontend:**
```bash
cd apps/frontend
npm install package-name
```

**Documentation:**
```bash
cd apps/docs
npm install package-name
```

### Shared Dependencies
Add to root `package.json` for development tools:
```bash
npm install -D package-name
```

## 🐳 **Docker Development**

### Start with Docker
```bash
cd apps/backend
docker-compose up -d
```

### Services Available
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Grafana: localhost:3002

## 🚨 **Common Issues**

### Port Conflicts
```bash
# Kill processes on ports
./dev-start.sh  # Automatically handles this
```

### Dependency Issues
```bash
npm run clean:install  # Clean reinstall
```

### Database Connection
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432
```

### Build Issues
```bash
# Clean build
npm run clean
npm run build
```

## 📈 **Performance Monitoring**

### Development Metrics
- Backend metrics: http://localhost:4000/metrics
- Performance testing: `cd apps/backend && npm run test:performance`

### Production Readiness
```bash
cd apps/backend
npm run quality:check  # Comprehensive quality check
```

## 🔄 **Deployment**

### Production Build
```bash
npm run build         # Build all applications
```

### Docker Production
```bash
cd apps/backend
docker-compose -f docker-compose.yml up --build
```

## 📚 **Additional Resources**

- **Backend API Documentation**: http://localhost:4000/docs (when running)
- **Frontend Components**: Storybook (if configured)
- **Documentation**: http://localhost:3001

## 🤝 **Contributing**

1. Create feature branch from `main`
2. Make changes following the architecture
3. Run `npm run lint` and `npm run test`
4. Submit pull request

## 💡 **Tips**

- Use `./dev-start.sh` for the best development experience
- Monitor logs with `tail -f logs/*.log`
- Use `npm run typecheck` to catch TypeScript errors early
- Keep dependencies up to date with `npm audit`

---

For more detailed information, check the specific README files in each `apps/` directory. 