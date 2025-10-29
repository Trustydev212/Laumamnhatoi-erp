#!/bin/bash

# 🚀 Quick Deploy Script for VPS
# Deploy Nhà Tôi ERP với VietQR Printer

set -e

echo "🚀 Quick Deploy - Nhà Tôi ERP with VietQR Printer"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as deploy user
if [ "$USER" != "deploy" ]; then
    print_error "This script must be run as 'deploy' user"
    exit 1
fi

# Navigate to project directory
cd /home/deploy/Laumamnhatoi-erp

print_status "📁 Working directory: $(pwd)"

# Pull latest code
print_status "📥 Pulling latest code..."
git pull origin main

# Install/update dependencies
print_status "📦 Installing dependencies..."
npm install
cd apps/backend && npm install
cd ../frontend && npm install
cd ../..

# Copy environment files
print_status "⚙️ Setting up environment..."
cp apps/backend/env.production apps/backend/.env
cp apps/frontend/env.production apps/frontend/.env

# Build applications
print_status "🔨 Building applications..."

# Build backend
cd apps/backend
npm run build
if [ ! -f "dist/main.js" ]; then
    print_error "Backend build failed"
    exit 1
fi
print_success "✅ Backend built successfully"

# Build frontend
cd ../frontend
npm run build
if [ ! -d ".next" ]; then
    print_error "Frontend build failed"
    exit 1
fi
print_success "✅ Frontend built successfully"

cd ../..

# Stop existing services
print_status "🛑 Stopping existing services..."
pm2 delete all 2>/dev/null || true
pkill -9 -f "node dist/main" 2>/dev/null || true

# Start services
print_status "🚀 Starting services..."
pm2 start ecosystem.config.js
pm2 save

# Wait for services to start
sleep 5

# Check service status
print_status "📊 Service status:"
pm2 status

# Test services
print_status "🧪 Testing services..."

# Test backend
if curl -s http://localhost:3001/api/health > /dev/null; then
    print_success "✅ Backend health check passed"
else
    print_warning "⚠️ Backend health check failed"
fi

# Test frontend
if curl -s http://localhost:3002 > /dev/null; then
    print_success "✅ Frontend health check passed"
else
    print_warning "⚠️ Frontend health check failed"
fi

# Test VietQR API
print_status "🧾 Testing VietQR API..."
if curl -s --max-time 10 "http://localhost:3001/api/printer/vietqr/test" > /dev/null; then
    print_success "✅ VietQR API test passed"
else
    print_warning "⚠️ VietQR API test failed"
fi

# Reload Nginx
print_status "🔄 Reloading Nginx..."
sudo systemctl reload nginx

print_success "🎉 Deployment completed successfully!"
echo ""
print_status "🌐 Website: http://laumamnhatoi.vn"
print_status "🔧 Backend API: http://laumamnhatoi.vn/api"
print_status "📚 API Docs: http://laumamnhatoi.vn/api/docs"
print_status "🧪 VietQR Test: http://laumamnhatoi.vn/vietqr-test"
print_status "🖨️ POS System: http://laumamnhatoi.vn/pos"
echo ""
print_status "📋 Recent logs:"
pm2 logs --lines 5

echo ""
print_success "🚀 Nhà Tôi ERP with VietQR Printer is now live!"
print_status "Check logs with: pm2 logs"
print_status "Monitor with: pm2 monit"