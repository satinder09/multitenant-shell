# ===============================================
# 🚀 MULTITENANT SHELL - PRODUCTION DOCKERFILE
# ===============================================
# Multi-stage build for optimal production deployment
# Security-hardened, performance-optimized container

# =============================================
# Stage 1: Dependencies (Base Layer)
# =============================================
FROM node:20-alpine AS dependencies

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/

# Install dependencies with optimizations
RUN npm ci --only=production --silent && \
    npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# =============================================
# Stage 2: Build (Development Dependencies)
# =============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm ci --silent

# Copy source code and configuration
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules

# Build the application
RUN npm run build

# =============================================
# Stage 3: Production Runtime
# =============================================
FROM node:20-alpine AS production

# Security labels
LABEL maintainer="MultiTenant Shell Team"
LABEL version="1.0.0"
LABEL description="Enterprise NestJS Backend for MultiTenant Shell"

# Security: Install security updates
RUN apk upgrade --no-cache && \
    apk add --no-cache dumb-init tini

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated

# Copy essential configuration files
COPY tsconfig.json ./
COPY nest-cli.json ./

# Create necessary directories and set permissions
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R nestjs:nodejs /app && \
    chmod -R 755 /app

# Security: Remove package manager and unnecessary tools
RUN npm uninstall -g npm

# Switch to non-root user
USER nestjs

# Environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Expose port
EXPOSE 4000

# Use tini as init system for proper signal handling
ENTRYPOINT ["tini", "--"]

# Start the application
CMD ["node", "dist/main"]

# =============================================
# Stage 4: Development (Optional)
# =============================================
FROM node:20-alpine AS development

WORKDIR /app

# Install all dependencies including dev dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Create development directories
RUN mkdir -p /app/logs /app/uploads /app/temp

# Development environment
ENV NODE_ENV=development
ENV PORT=4000

# Expose port and debugging port
EXPOSE 4000 9229

# Development start command with hot reload and debugging
CMD ["npm", "run", "start:dev"]

# =============================================
# Build Arguments and Metadata
# =============================================
ARG BUILD_DATE
ARG GIT_COMMIT
ARG VERSION

LABEL build-date=$BUILD_DATE
LABEL git-commit=$GIT_COMMIT
LABEL version=$VERSION
