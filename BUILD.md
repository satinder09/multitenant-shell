# MultiTenant Shell - Build Guide

Complete guide for building and deploying the entire multitenant shell application.

## 🏗️ Architecture Overview

```
multitenant-shell/
├── apps/backend/     # NestJS API Server (Port 4000)
├── apps/frontend/    # Next.js Business Application (Port 3000)
├── apps/docs/        # Documentation Platform (Port 3001)
└── docker-compose.yml # Container orchestration
```

## 🚀 Quick Start (All Applications)

### Prerequisites
- Node.js 18+ 
- npm 8+
- Docker (optional)
- PostgreSQL (for backend)

### 1. Install Dependencies
```bash
# Install all dependencies for all applications
npm run install:all

# Or install individually
npm install --workspace=apps/backend
npm install --workspace=apps/frontend  
npm install --workspace=apps/docs
```

### 2. Environment Setup
```bash
# Copy environment files
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local
```

### 3. Database Setup
```bash
# Start PostgreSQL (if using Docker)
cd apps/backend
docker-compose up -d

# Run migrations
npm run prisma:migrate
npm run prisma:generate
```

### 4. Build All Applications
```bash
# Build everything in correct order
npm run build

# This runs:
# 1. Backend build
# 2. Frontend build  
# 3. Documentation build
```

### 5. Start All Applications
```bash
# Development mode
npm run dev

# Production mode
npm run start
```

## 🔧 Individual Application Builds

### Backend (NestJS)

**Development:**
```bash
cd apps/backend
npm run dev
# Server: http://localhost:4000
```

**Build:**
```bash
cd apps/backend
npm run build
# Output: apps/backend/dist/
```

**Production:**
```bash
cd apps/backend
npm run start:prod
```

**Docker:**
```bash
cd apps/backend
docker build -t multitenant-backend .
docker run -p 4000:4000 multitenant-backend
```

### Frontend (Next.js)

**Development:**
```bash
cd apps/frontend
npm run dev
# Server: http://localhost:3000
```

**Build:**
```bash
cd apps/frontend
npm run build
# Output: apps/frontend/.next/
```

**Production:**
```bash
cd apps/frontend
npm run start
```

**Docker:**
```bash
cd apps/frontend
docker build -t multitenant-frontend .
docker run -p 3000:3000 multitenant-frontend
```

### Documentation (Fumadocs)

**Development:**
```bash
cd apps/docs
npm run dev
# Server: http://localhost:3001
```

**Build:**
```bash
cd apps/docs
npm run build
# Output: apps/docs/.next/
```

**Generate Documentation:**
```bash
cd apps/docs
npm run docs:generate
# Generates content from configuration
```

**Production:**
```bash
cd apps/docs
npm run start
```

## 🐳 Docker Deployment

### Full Stack with Docker Compose
```bash
# Build all containers
npm run docker:build

# Start all services
npm run docker:up

# Stop all services
npm run docker:down
```

### Individual Container Builds
```bash
# Backend
docker build -t multitenant-backend ./apps/backend

# Frontend
docker build -t multitenant-frontend ./apps/frontend

# Documentation
docker build -t multitenant-docs ./apps/docs
```

## 📦 Build Outputs

### Backend (`apps/backend/dist/`)
- Compiled JavaScript files
- Type definitions
- Assets and static files

### Frontend (`apps/frontend/.next/`)
- Static HTML pages
- JavaScript bundles
- CSS files
- Image optimizations

### Documentation (`apps/docs/.next/`)
- Static documentation site
- Generated MDX content
- Search indices
- Navigation structure

## 🧪 Testing

### Run All Tests
```bash
npm run test
```

### Individual Test Suites
```bash
# Backend tests
npm run test:backend

# Frontend tests
npm run test:frontend

# E2E tests
cd apps/backend && npm run test:e2e
```

## 🔍 Linting & Quality

### Run All Linters
```bash
npm run lint
```

### Individual Linting
```bash
npm run lint:backend
npm run lint:frontend
npm run lint:docs
```

### Type Checking
```bash
# Backend
cd apps/backend && npm run typecheck

# Frontend  
cd apps/frontend && npm run typecheck

# Documentation
cd apps/docs && npm run typecheck
```

## 🚀 Production Deployment

### Environment Variables
```bash
# Backend
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://yourapp.com

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourapp.com
NEXT_PUBLIC_APP_URL=https://yourapp.com

# Documentation
DOCS_DOMAIN=base
DOCS_CONFIG_PATH=./src/config/domains/base.config.ts
```

### Build Order (Critical)
```bash
# 1. Backend first (APIs needed for frontend)
npm run build:backend

# 2. Frontend second (business application)
npm run build:frontend

# 3. Documentation last (references APIs)
npm run build:docs
```

### Health Checks
```bash
# Backend health
curl http://localhost:4000/health

# Frontend health
curl http://localhost:3000/api/health

# Documentation health
curl http://localhost:3001/
```

## 📊 Performance Optimization

### Backend
- Bundle analysis: `npm run build:analyze`
- Performance testing: `npm run test:performance`

### Frontend
- Bundle analysis: `npm run build:analyze`
- Lighthouse audit: `npm run audit`

### Documentation
- Static generation: `npm run build:static`
- Search optimization: `npm run docs:search-index`

## 🛠️ Development Workflow

### Full Development Environment
```bash
# Start all services in development mode
npm run dev

# Opens:
# - Backend: http://localhost:4000
# - Frontend: http://localhost:3000  
# - Documentation: http://localhost:3001
```

### Selective Development
```bash
# Only backend
npm run dev:backend

# Only frontend
npm run dev:frontend

# Only documentation
npm run dev:docs
```

## 🧹 Cleanup

### Clean All Build Artifacts
```bash
npm run clean
```

### Clean Individual Apps
```bash
# Backend
rm -rf apps/backend/dist apps/backend/node_modules

# Frontend
rm -rf apps/frontend/.next apps/frontend/node_modules

# Documentation
rm -rf apps/docs/.next apps/docs/node_modules
```

## 🔧 Troubleshooting

### Common Build Issues

1. **Port Conflicts**
   - Backend: Change port in `apps/backend/src/main.ts`
   - Frontend: Use `PORT=3010 npm run dev`
   - Documentation: Use `PORT=3011 npm run dev`

2. **Database Connection**
   - Check PostgreSQL is running
   - Verify `DATABASE_URL` in `.env`
   - Run `npm run prisma:generate`

3. **TypeScript Errors**
   - Run `npm run typecheck` in each app
   - Check `tsconfig.json` configurations

4. **Memory Issues**
   - Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`

### Performance Issues

1. **Slow Builds**
   - Use `npm run build:parallel` for concurrent builds
   - Enable caching: `npm run build:cache`

2. **Large Bundle Sizes**
   - Analyze bundles: `npm run build:analyze`
   - Enable tree shaking and code splitting

## 📋 Build Checklist

- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] All tests passing
- [ ] Linting checks passed
- [ ] TypeScript compilation successful
- [ ] Backend builds successfully
- [ ] Frontend builds successfully  
- [ ] Documentation builds successfully
- [ ] All services start correctly
- [ ] Health checks pass

## 🎯 Next Steps

1. **Set up CI/CD pipeline**
2. **Configure monitoring and logging**
3. **Set up automated testing**
4. **Configure production deployment**
5. **Set up backup and recovery** 