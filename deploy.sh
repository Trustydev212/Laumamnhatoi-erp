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

# Check if running as deploy user
if [ "$USER" != "deploy" ]; then
    print_error "This script must be run as 'deploy' user"
    exit 1
fi

# Navigate to project directory
cd /home/deploy/Laumamnhatoi-erp

print_status "📁 Working directory: $(pwd)"

# Pull latest code
print_status "📥 Pulling latest code from GitHub..."
git pull origin main

# Clean old builds
print_status "🧹 Cleaning old builds..."
rm -rf apps/backend/dist
rm -rf apps/frontend/.next

# Build backend
print_status "🔨 Building backend..."
cd apps/backend
npm run build

if [ ! -f "dist/main.js" ]; then
    print_error "Backend build failed - dist/main.js not found"
    exit 1
fi

print_success "✅ Backend build completed"

# Build frontend
print_status "🔨 Building frontend..."
cd ../frontend
npm run build

if [ ! -d ".next" ]; then
    print_error "Frontend build failed - .next directory not found"
    exit 1
fi

print_success "✅ Frontend build completed"

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
pm2 start ecosystem.config.js

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
if curl -s http://localhost:3002 > /dev/null; then
    print_success "✅ Frontend is responding"
else
    print_warning "⚠️  Frontend health check failed"
fi

print_success "🎉 Deployment completed successfully!"
print_status "🌐 Website: http://laumamnhatoi.vn"
print_status "🔧 Backend API: http://laumamnhatoi.vn/api"
print_status "📚 API Docs: http://laumamnhatoi.vn/api/docs"
print_status "🧪 VietQR Test: http://laumamnhatoi.vn/vietqr-test"

# Show recent logs
print_status "📋 Recent logs:"
pm2 logs --lines 10