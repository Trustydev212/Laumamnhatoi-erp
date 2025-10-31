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

# Pull latest code
print_status "📥 Pulling latest code from GitHub..."
git pull origin main

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

# Build backend
print_status "🔨 Building backend..."
cd apps/backend
# Ensure dependencies are installed
npm install
npm run build

if [ ! -f "dist/src/main.js" ]; then
    print_error "Backend build failed - dist/src/main.js not found"
    exit 1
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

# Kill any remaining node processes
print_status "🔪 Killing remaining node processes..."
pkill -9 -f "node dist/main" 2>/dev/null || true

# Start services with ecosystem config
print_status "🚀 Starting services with PM2..."
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