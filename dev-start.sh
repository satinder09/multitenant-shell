#!/bin/bash

# ===============================================
# 🚀 MULTITENANT SHELL - DEVELOPMENT STARTUP
# ===============================================
# Start all applications in development mode with proper dependency checking

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=4000
FRONTEND_PORT=3000
DOCS_PORT=3001
MAX_WAIT=30

print_header() {
    echo -e "${BLUE}"
    echo "=============================================="
    echo "🚀 MULTITENANT SHELL - DEVELOPMENT STARTUP"
    echo "=============================================="
    echo -e "${NC}"
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if port is in use
check_port() {
    local port=$1
    local app_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $port is already in use (required for $app_name)"
        return 1
    fi
    return 0
}

# Wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=$3
    local attempt=0
    
    print_status "Waiting for $service_name to be ready at $url..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_status "$service_name is ready!"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 1
    done
    
    print_error "$service_name failed to start within $max_attempts seconds"
    return 1
}

# Kill all development processes
cleanup() {
    print_status "Cleaning up development processes..."
    
    # Kill processes on our ports
    for port in $BACKEND_PORT $FRONTEND_PORT $DOCS_PORT; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_status "Killing process on port $port"
            lsof -Pi :$port -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
        fi
    done
    
    # Kill any node processes that might be hanging
    pkill -f "next dev\|nest start" 2>/dev/null || true
    
    print_status "Cleanup complete"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ ! -d "node_modules" ]; then
        print_status "Installing root dependencies..."
        npm install
    fi
    
    for app in backend frontend docs; do
        if [ ! -d "apps/$app/node_modules" ]; then
            print_status "Installing $app dependencies..."
            cd "apps/$app"
            npm install
            cd ../..
        fi
    done
    
    print_status "Dependencies installed"
}

# Start backend
start_backend() {
    print_status "Starting backend server on port $BACKEND_PORT..."
    
    cd apps/backend
    npm run dev > ../../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    cd ../..
    
    # Wait for backend to be ready
    if wait_for_service "http://localhost:$BACKEND_PORT/health" "Backend" $MAX_WAIT; then
        print_status "Backend started successfully (PID: $BACKEND_PID)"
        return 0
    else
        print_error "Backend failed to start"
        return 1
    fi
}

# Start frontend
start_frontend() {
    print_status "Starting frontend server on port $FRONTEND_PORT..."
    
    cd apps/frontend
    npm run dev > ../../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ../..
    
    # Wait for frontend to be ready
    if wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend" $MAX_WAIT; then
        print_status "Frontend started successfully (PID: $FRONTEND_PID)"
        return 0
    else
        print_error "Frontend failed to start"
        return 1
    fi
}

# Start documentation
start_docs() {
    print_status "Starting documentation server on port $DOCS_PORT..."
    
    cd apps/docs
    npm run dev > ../../logs/docs.log 2>&1 &
    DOCS_PID=$!
    cd ../..
    
    # Wait for docs to be ready
    if wait_for_service "http://localhost:$DOCS_PORT" "Documentation" $MAX_WAIT; then
        print_status "Documentation started successfully (PID: $DOCS_PID)"
        return 0
    else
        print_error "Documentation failed to start"
        return 1
    fi
}

# Display running services
show_services() {
    echo -e "${GREEN}"
    echo "=============================================="
    echo "🎉 ALL SERVICES RUNNING SUCCESSFULLY!"
    echo "=============================================="
    echo -e "${NC}"
    echo "Backend API:      http://localhost:$BACKEND_PORT"
    echo "Frontend:         http://localhost:$FRONTEND_PORT"
    echo "Documentation:    http://localhost:$DOCS_PORT"
    echo ""
    echo "Health Checks:"
    echo "Backend Health:   http://localhost:$BACKEND_PORT/health"
    echo "Backend Metrics:  http://localhost:$BACKEND_PORT/metrics"
    echo ""
    echo "Logs:"
    echo "Backend:          tail -f logs/backend.log"
    echo "Frontend:         tail -f logs/frontend.log"
    echo "Documentation:    tail -f logs/docs.log"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
}

# Main execution
main() {
    print_header
    
    # Create logs directory
    mkdir -p logs
    
    # Handle cleanup on exit
    trap cleanup EXIT
    
    # Check for required tools
    for cmd in node npm lsof curl; do
        if ! command -v $cmd &> /dev/null; then
            print_error "$cmd is required but not installed"
            exit 1
        fi
    done
    
    # Check ports availability
    for port in $BACKEND_PORT $FRONTEND_PORT $DOCS_PORT; do
        if ! check_port $port "app"; then
            cleanup
            sleep 2
        fi
    done
    
    # Install dependencies
    install_dependencies
    
    # Start services in order
    if start_backend && start_frontend && start_docs; then
        show_services
        
        # Keep script running
        while true; do
            sleep 1
        done
    else
        print_error "Failed to start all services"
        exit 1
    fi
}

# Run main function
main "$@" 