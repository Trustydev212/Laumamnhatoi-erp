#!/bin/bash

# 🔍 Pre-Deploy Health Check Script
# Kiểm tra toàn bộ hệ thống trước khi deploy

set -e

echo "🔍 Starting Pre-Deploy Health Check..."

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

# Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node --version)
if [[ $NODE_VERSION == v18* ]] || [[ $NODE_VERSION == v20* ]] || [[ $NODE_VERSION == v22* ]]; then
    print_success "Node.js version: $NODE_VERSION ✅"
else
    print_warning "Node.js version: $NODE_VERSION (recommend v18+)"
fi

# Check npm version
print_status "Checking npm version..."
NPM_VERSION=$(npm --version)
print_success "npm version: $NPM_VERSION ✅"

# Check PM2
print_status "Checking PM2..."
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    print_success "PM2 version: $PM2_VERSION ✅"
else
    print_error "PM2 not installed!"
    exit 1
fi

# Check Nginx
print_status "Checking Nginx..."
if command -v nginx &> /dev/null; then
    NGINX_VERSION=$(nginx -v 2>&1)
    print_success "Nginx: $NGINX_VERSION ✅"
else
    print_error "Nginx not installed!"
    exit 1
fi

# Check PostgreSQL
print_status "Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version)
    print_success "PostgreSQL: $PSQL_VERSION ✅"
else
    print_error "PostgreSQL not installed!"
    exit 1
fi

# Check project structure
print_status "Checking project structure..."
cd /home/deploy/Laumamnhatoi-erp

if [ -f "package.json" ] && [ -d "apps/backend" ] && [ -d "apps/frontend" ]; then
    print_success "Project structure ✅"
else
    print_error "Project structure incomplete!"
    exit 1
fi

# Check environment files
print_status "Checking environment files..."
if [ -f "apps/backend/env.production" ] && [ -f "apps/frontend/env.production" ]; then
    print_success "Environment files ✅"
else
    print_error "Environment files missing!"
    exit 1
fi

# Check dependencies
print_status "Checking dependencies..."
if [ -d "node_modules" ] && [ -d "apps/backend/node_modules" ] && [ -d "apps/frontend/node_modules" ]; then
    print_success "Dependencies installed ✅"
else
    print_warning "Dependencies not installed, running npm install..."
    npm install
    cd apps/backend && npm install
    cd ../frontend && npm install
    cd ../..
fi

# Build backend
print_status "Building backend..."
cd apps/backend
npm run build
if [ -f "dist/main.js" ]; then
    print_success "Backend build ✅"
else
    print_error "Backend build failed!"
    exit 1
fi

# Build frontend
print_status "Building frontend..."
cd ../frontend
npm run build
if [ -d ".next" ]; then
    print_success "Frontend build ✅"
else
    print_error "Frontend build failed!"
    exit 1
fi

cd ../..

# Check database connection
print_status "Checking database connection..."
cd apps/backend
if npm run db:push > /dev/null 2>&1; then
    print_success "Database connection ✅"
else
    print_warning "Database connection failed - check DATABASE_URL"
fi
cd ../..

# Check Nginx configuration
print_status "Checking Nginx configuration..."
if nginx -t > /dev/null 2>&1; then
    print_success "Nginx configuration ✅"
else
    print_error "Nginx configuration invalid!"
    exit 1
fi

# Check ports availability
print_status "Checking port availability..."
if ! netstat -tuln | grep -q ":3001 "; then
    print_success "Port 3001 available ✅"
else
    print_warning "Port 3001 in use"
fi

if ! netstat -tuln | grep -q ":3002 "; then
    print_success "Port 3002 available ✅"
else
    print_warning "Port 3002 in use"
fi

# Check disk space
print_status "Checking disk space..."
DISK_USAGE=$(df -h /home/deploy | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    print_success "Disk space: ${DISK_USAGE}% used ✅"
else
    print_warning "Disk space: ${DISK_USAGE}% used (consider cleanup)"
fi

# Check memory
print_status "Checking memory..."
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -lt 80 ]; then
    print_success "Memory usage: ${MEMORY_USAGE}% ✅"
else
    print_warning "Memory usage: ${MEMORY_USAGE}% (consider optimization)"
fi

# Check VietQR API
print_status "Checking VietQR API..."
if curl -s --max-time 10 "https://img.vietqr.io/image/970436-0123456789-compact2.png" > /dev/null; then
    print_success "VietQR API accessible ✅"
else
    print_warning "VietQR API not accessible"
fi

# Check domain resolution
print_status "Checking domain resolution..."
if nslookup laumamnhatoi.vn > /dev/null 2>&1; then
    print_success "Domain resolution ✅"
else
    print_warning "Domain resolution failed"
fi

print_success "🎉 Pre-Deploy Health Check completed!"
print_status "System is ready for deployment"
print_status "Run: ./deploy.sh to deploy"
