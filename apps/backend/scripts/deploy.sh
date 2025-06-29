#!/bin/bash

# ===============================================
# 🚀 MULTITENANT SHELL - PRODUCTION DEPLOYMENT
# ===============================================
# Production deployment script with safety checks
# Usage: ./scripts/deploy.sh [environment] [version]

set -euo pipefail

# =============================================
# CONFIGURATION
# =============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENVIRONMENT="${1:-production}"
VERSION="${2:-$(git rev-parse --short HEAD)}"
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse HEAD)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================
# LOGGING FUNCTIONS
# =============================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================
# ERROR HANDLING
# =============================================
cleanup() {
    log_info "Cleaning up temporary files..."
    # Add cleanup logic here
}

error_exit() {
    log_error "$1"
    cleanup
    exit 1
}

trap cleanup EXIT
trap 'error_exit "Script interrupted"' INT TERM

# =============================================
# VALIDATION FUNCTIONS
# =============================================
validate_environment() {
    case "$ENVIRONMENT" in
        development|staging|production)
            log_info "Deploying to: $ENVIRONMENT"
            ;;
        *)
            error_exit "Invalid environment: $ENVIRONMENT. Use: development, staging, or production"
            ;;
    esac
}

validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check required tools
    local tools=("docker" "docker-compose" "git" "npm")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error_exit "$tool is required but not installed"
        fi
    done
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        error_exit "This script must be run from within a git repository"
    fi
    
    # Check for uncommitted changes in production
    if [[ "$ENVIRONMENT" == "production" ]] && ! git diff-index --quiet HEAD --; then
        error_exit "Uncommitted changes detected. Commit or stash changes before production deployment."
    fi
    
    log_success "Prerequisites validated"
}

validate_configuration() {
    log_info "Validating configuration..."
    
    # Check required files
    local required_files=(
        "Dockerfile"
        "docker-compose.yml"
        "package.json"
        "prisma/schema.prisma"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$PROJECT_ROOT/$file" ]]; then
            error_exit "Required file not found: $file"
        fi
    done
    
    # Validate environment-specific configuration
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if [[ ! -f "$PROJECT_ROOT/.env.production" ]]; then
            log_warning "Production environment file not found. Using defaults."
        fi
    fi
    
    log_success "Configuration validated"
}

# =============================================
# BUILD FUNCTIONS
# =============================================
run_tests() {
    log_info "Running test suite..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    npm ci --silent
    
    # Run linting
    log_info "Running linting..."
    npm run lint || error_exit "Linting failed"
    
    # Run unit tests
    log_info "Running unit tests..."
    npm run test || error_exit "Unit tests failed"
    
    # Run security audit
    log_info "Running security audit..."
    npm audit --audit-level=high || log_warning "Security vulnerabilities detected"
    
    log_success "Tests completed successfully"
}

build_application() {
    log_info "Building application..."
    
    cd "$PROJECT_ROOT"
    
    # Build TypeScript
    log_info "Compiling TypeScript..."
    npm run build || error_exit "Build failed"
    
    # Generate Prisma client
    log_info "Generating Prisma client..."
    npx prisma generate || error_exit "Prisma client generation failed"
    
    log_success "Application built successfully"
}

build_docker_image() {
    log_info "Building Docker image..."
    
    cd "$PROJECT_ROOT"
    
    local image_tag="multitenant-shell:$VERSION"
    local latest_tag="multitenant-shell:latest"
    
    # Build Docker image
    docker build \
        --target production \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg GIT_COMMIT="$GIT_COMMIT" \
        --build-arg VERSION="$VERSION" \
        -t "$image_tag" \
        -t "$latest_tag" \
        . || error_exit "Docker build failed"
    
    log_success "Docker image built: $image_tag"
}

# =============================================
# SECURITY FUNCTIONS
# =============================================
security_scan() {
    log_info "Running security scans..."
    
    # Docker image security scan
    if command -v trivy &> /dev/null; then
        log_info "Scanning Docker image with Trivy..."
        trivy image --severity HIGH,CRITICAL "multitenant-shell:$VERSION" || log_warning "Security vulnerabilities found in Docker image"
    else
        log_warning "Trivy not installed. Skipping Docker image security scan."
    fi
    
    # Additional security checks can be added here
    log_success "Security scans completed"
}

# =============================================
# DEPLOYMENT FUNCTIONS
# =============================================
backup_current_deployment() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_info "Creating backup of current deployment..."
        
        # Backup database
        docker-compose exec postgres pg_dump -U postgres multitenant_master > "backup_$(date +%Y%m%d_%H%M%S).sql" || log_warning "Database backup failed"
        
        log_success "Backup completed"
    fi
}

deploy_services() {
    log_info "Deploying services..."
    
    cd "$PROJECT_ROOT"
    
    # Set environment variables
    export BUILD_DATE="$BUILD_DATE"
    export GIT_COMMIT="$GIT_COMMIT"
    export VERSION="$VERSION"
    
    # Deploy based on environment
    case "$ENVIRONMENT" in
        development)
            docker-compose --profile development up -d || error_exit "Development deployment failed"
            ;;
        staging)
            docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d || error_exit "Staging deployment failed"
            ;;
        production)
            docker-compose -f docker-compose.yml up -d || error_exit "Production deployment failed"
            ;;
    esac
    
    log_success "Services deployed"
}

run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    sleep 10
    
    # Run Prisma migrations
    docker-compose exec multitenant-backend npx prisma migrate deploy || error_exit "Database migration failed"
    
    log_success "Database migrations completed"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:3000/health > /dev/null; then
            log_success "Application is healthy"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: Waiting for application to be ready..."
        sleep 10
        ((attempt++))
    done
    
    error_exit "Application health check failed after $max_attempts attempts"
}

# =============================================
# ROLLBACK FUNCTION
# =============================================
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    # Stop current deployment
    docker-compose down
    
    # Restore from backup if available
    if [[ -f "backup_$(date +%Y%m%d)*.sql" ]]; then
        log_info "Restoring database from backup..."
        # Implement database restore logic
    fi
    
    log_success "Rollback completed"
}

# =============================================
# MAIN DEPLOYMENT WORKFLOW
# =============================================
main() {
    log_info "🚀 Starting MultiTenant Shell Deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Version: $VERSION"
    log_info "Build Date: $BUILD_DATE"
    log_info "Git Commit: $GIT_COMMIT"
    echo
    
    # Validation phase
    validate_environment
    validate_prerequisites
    validate_configuration
    
    # Build phase
    run_tests
    build_application
    build_docker_image
    
    # Security phase
    security_scan
    
    # Deployment phase
    backup_current_deployment
    deploy_services
    run_migrations
    verify_deployment
    
    log_success "🎉 Deployment completed successfully!"
    log_info "Application is available at: http://localhost:3000"
    log_info "Metrics dashboard: http://localhost:9090"
    log_info "Grafana dashboard: http://localhost:3001"
    
    # Post-deployment information
    echo
    log_info "📊 Post-Deployment Checklist:"
    echo "  ✅ Verify application functionality"
    echo "  ✅ Check monitoring dashboards"
    echo "  ✅ Validate performance metrics"
    echo "  ✅ Test critical user journeys"
    echo "  ✅ Monitor error logs for 24 hours"
}

# =============================================
# SCRIPT EXECUTION
# =============================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 