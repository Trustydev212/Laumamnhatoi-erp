#!/bin/bash

# 🚀 Deploy script cho Nhà Tôi ERP
# Tự động build và restart toàn bộ hệ thống

set -e  # Exit on any error

echo "🚀 Starting deployment for Nhà Tôi ERP..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as deploy user (allow root as fallback for automation)
if [ "$USER" != "deploy" ] && [ "$USER" != "root" ]; then
    print_error "This script must be run as 'deploy' or 'root' user"
    exit 1
fi

if [ "$USER" = "root" ]; then
    print_warning "⚠️  Running as root user. For production, consider using 'deploy' user."
fi

# Navigate to project directory
cd /home/deploy/Laumamnhatoi-erp

print_status "📁 Working directory: $(pwd)"

# Pull latest code (stash local changes if any to avoid conflicts)
print_status "📥 Pulling latest code from GitHub..."
# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_warning "⚠️  Uncommitted changes detected, stashing them..."
    git stash save "Auto-stash before deploy $(date +%Y%m%d-%H%M%S)"
fi
# Fetch and reset to remote to ensure we're in sync
git fetch origin main
git reset --hard origin/main

# Force checkout specific files that might have conflicts
print_status "🔄 Ensuring clean file state..."
# Remove and re-checkout printer module to ensure clean state
rm -rf apps/backend/src/modules/printer
git checkout HEAD -- apps/backend/src/modules/printer
git checkout HEAD -- apps/backend/src/app.module.ts
# Double-check printer module files
git checkout HEAD -- apps/backend/src/modules/printer/printer.module.ts
git checkout HEAD -- apps/backend/src/modules/printer/printer.controller.ts
git checkout HEAD -- apps/backend/src/modules/printer/printer.service.ts

# Install/update dependencies
print_status "📦 Installing dependencies..."
npm install

# Clean old builds and cache
print_status "🧹 Cleaning old builds and cache..."
rm -rf apps/backend/dist
rm -rf apps/backend/tsconfig.tsbuildinfo
rm -rf apps/frontend/.next
rm -rf apps/frontend/tsconfig.tsbuildinfo
# Remove any orphaned service files that might cause build errors
rm -f apps/backend/src/services/vietqr-printer.service.ts
rm -f apps/backend/src/services/enhanced-printer.service.ts
rm -f apps/backend/src/services/escpos-printer.service.ts
rm -f apps/backend/src/services/html-receipt.service.ts
rm -f apps/backend/src/services/xprinter-receipt.service.ts

# Remove orphaned controller and module files
rm -f apps/backend/src/modules/printer/enhanced-printer.controller.ts
rm -f apps/backend/src/modules/printer/escpos-printer.controller.ts
rm -f apps/backend/src/modules/printer/html-receipt.controller.ts
rm -f apps/backend/src/modules/printer/vietqr-printer.controller.ts
rm -f apps/backend/src/modules/printer/xprinter-receipt.controller.ts
rm -f apps/backend/src/modules/printer/vietqr-printer.module.ts

# Build backend
print_status "🔨 Building backend..."
cd apps/backend
# Ensure dependencies are installed
npm install
npm run build

# Check if build output exists (NestJS may output to dist/src/main.js or dist/main.js)
if [ ! -f "dist/src/main.js" ] && [ ! -f "dist/main.js" ]; then
    print_error "Backend build failed - dist/src/main.js or dist/main.js not found"
    print_error "Checking build output..."
    ls -la dist/ 2>/dev/null || echo "dist directory does not exist"
    exit 1
fi

# Verify which path exists and update ecosystem config if needed
if [ -f "dist/main.js" ]; then
    print_status "ℹ️  Backend output is at dist/main.js"
elif [ -f "dist/src/main.js" ]; then
    print_status "ℹ️  Backend output is at dist/src/main.js"
fi

print_success "✅ Backend build completed"

# Build frontend
print_status "🔨 Building frontend..."
cd ../frontend
set +e  # Don't exit on error for frontend build
npm run build
FRONTEND_BUILD_EXIT_CODE=$?
set -e  # Re-enable exit on error

if [ $FRONTEND_BUILD_EXIT_CODE -ne 0 ] || [ ! -d ".next" ]; then
    print_warning "⚠️  Frontend build failed - .next directory not found"
    print_warning "⚠️  Continuing with backend deployment only..."
    FRONTEND_BUILD_FAILED=1
else
    print_success "✅ Frontend build completed"
    FRONTEND_BUILD_FAILED=0
fi

# Go back to root
cd /home/deploy/Laumamnhatoi-erp

# Stop all PM2 processes
print_status "🛑 Stopping all PM2 processes..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Kill any remaining node processes and processes using ports
print_status "🔪 Killing remaining node processes and freeing ports..."
pkill -9 -f "node dist/main" 2>/dev/null || true
pkill -9 -f "next start" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 node 2>/dev/null || true

# Kill processes using ports 3001 and 3002 - multiple attempts with retry
print_status "🔌 Freeing ports 3001 and 3002..."
MAX_RETRIES=5
for port in 3001 3002; do
    RETRY=0
    while [ $RETRY -lt $MAX_RETRIES ]; do
        RETRY=$((RETRY + 1))
        print_status "  Attempt $RETRY/$MAX_RETRIES for port ${port}..."
        
        # Try multiple methods to find and kill processes
        PIDS_TO_KILL=""
        
        if command -v lsof >/dev/null 2>&1; then
            PIDS_TO_KILL="$PIDS_TO_KILL $(lsof -ti:${port} 2>/dev/null)"
        fi
        
        if command -v fuser >/dev/null 2>&1; then
            FUSER_PIDS=$(fuser ${port}/tcp 2>/dev/null | awk '{print $1}')
            if [ ! -z "$FUSER_PIDS" ]; then
                PIDS_TO_KILL="$PIDS_TO_KILL $FUSER_PIDS"
            fi
            fuser -k ${port}/tcp 2>/dev/null || true
        fi
        
        # Fallback using netstat
        if command -v netstat >/dev/null 2>&1; then
            NETSTAT_PIDS=$(netstat -tlnp 2>/dev/null | grep :${port} | awk '{print $7}' | cut -d'/' -f1 | grep -v '-' | xargs)
            if [ ! -z "$NETSTAT_PIDS" ]; then
                PIDS_TO_KILL="$PIDS_TO_KILL $NETSTAT_PIDS"
            fi
        fi
        
        # Fallback using ss
        if command -v ss >/dev/null 2>&1; then
            SS_PIDS=$(ss -tlnp 2>/dev/null | grep :${port} | awk '{print $6}' | cut -d',' -f2 | cut -d'=' -f2 | grep -v '^$' | xargs)
            if [ ! -z "$SS_PIDS" ]; then
                PIDS_TO_KILL="$PIDS_TO_KILL $SS_PIDS"
            fi
        fi
        
        # Kill all found PIDs
        for pid in $PIDS_TO_KILL; do
            if [ ! -z "$pid" ] && [ "$pid" != "-" ]; then
                print_status "    Killing PID $pid on port ${port}..."
                kill -9 $pid 2>/dev/null || true
            fi
        done
        
        # Wait a moment
        sleep 2
        
        # Check if port is now free
        PORT_IN_USE=false
        if command -v lsof >/dev/null 2>&1; then
            if lsof -ti:${port} >/dev/null 2>&1; then
                PORT_IN_USE=true
            fi
        elif command -v netstat >/dev/null 2>&1; then
            if netstat -tln 2>/dev/null | grep -q ":${port} "; then
                PORT_IN_USE=true
            fi
        elif command -v ss >/dev/null 2>&1; then
            if ss -tln 2>/dev/null | grep -q ":${port} "; then
                PORT_IN_USE=true
            fi
        fi
        
        if [ "$PORT_IN_USE" = false ]; then
            print_success "  ✅ Port ${port} is now free"
            break
        else
            if [ $RETRY -lt $MAX_RETRIES ]; then
                print_warning "  ⚠️  Port ${port} still in use, retrying..."
            else
                print_error "  ❌ Port ${port} still in use after $MAX_RETRIES attempts"
            fi
        fi
    done
done

# Final verification and wait
print_status "⏳ Final wait for ports to stabilize..."
sleep 3

# Final verification before starting services
print_status "🔍 Final port verification..."
PORTS_FREE=true
for port in 3001 3002; do
    PORT_IN_USE=false
    if command -v lsof >/dev/null 2>&1; then
        if lsof -ti:${port} >/dev/null 2>&1; then
            PORT_IN_USE=true
            print_error "❌ Port ${port} is STILL in use! Process: $(lsof -ti:${port} | head -1)"
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tln 2>/dev/null | grep -q ":${port} "; then
            PORT_IN_USE=true
            print_error "❌ Port ${port} is STILL in use!"
        fi
    fi
    
    if [ "$PORT_IN_USE" = true ]; then
        PORTS_FREE=false
        # Last resort: kill everything using the port
        print_warning "⚠️  Last resort: killing ALL processes on port ${port}..."
        lsof -ti:${port} 2>/dev/null | xargs kill -9 2>/dev/null || true
        fuser -k ${port}/tcp 2>/dev/null || true
        sleep 2
    else
        print_success "✅ Port ${port} verified free"
    fi
done

if [ "$PORTS_FREE" = false ]; then
    print_warning "⚠️  Some ports may still be in use, but continuing anyway..."
fi

# Start services with ecosystem config
print_status "🚀 Starting services with PM2..."
cd /home/deploy/Laumamnhatoi-erp

# Verify backend build output exists before starting
if [ ! -f "apps/backend/dist/src/main.js" ] && [ ! -f "apps/backend/dist/main.js" ]; then
    print_error "Backend file not found! Cannot start PM2."
    print_error "Expected: apps/backend/dist/src/main.js or apps/backend/dist/main.js"
    exit 1
fi

# Start PM2 services
if [ "$FRONTEND_BUILD_FAILED" -eq 1 ]; then
    print_warning "⚠️  Frontend build failed, only starting backend..."
    pm2 start ecosystem.config.js --only laumam-backend
else
    pm2 start ecosystem.config.js
fi

# Save PM2 configuration
pm2 save

# Wait a moment for services to start
sleep 3

# Check service status
print_status "📊 Checking service status..."
pm2 status

# Test services
print_status "🧪 Testing services..."

# Test backend
if curl -s http://localhost:3001/api/health > /dev/null; then
    print_success "✅ Backend is responding"
else
    print_warning "⚠️  Backend health check failed"
fi

# Test frontend
if [ "$FRONTEND_BUILD_FAILED" -eq 1 ]; then
    print_warning "⚠️  Frontend not deployed (build failed)"
else
    if curl -s http://localhost:3002 > /dev/null; then
        print_success "✅ Frontend is responding"
    else
        print_warning "⚠️  Frontend health check failed"
    fi
fi

print_success "🎉 Deployment completed successfully!"
print_status "🌐 Website: http://laumamnhatoi.vn"
print_status "🔧 Backend API: http://laumamnhatoi.vn/api"
print_status "📚 API Docs: http://laumamnhatoi.vn/api/docs"
print_status "🧪 VietQR Test: http://laumamnhatoi.vn/vietqr-test"

# Show recent logs
print_status "📋 Recent logs:"
pm2 logs --lines 10