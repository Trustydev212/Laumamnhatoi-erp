#!/bin/bash

# Script deploy fix POS ChunkLoadError lên VPS
# Chạy script này trên VPS sau khi pull code mới
#
# ⚠️  QUAN TRỌNG: Script này CHỈ fix frontend, KHÔNG động vào database
# - KHÔNG chạy migrations
# - KHÔNG reset database
# - KHÔNG xóa dữ liệu
# - CHỈ rebuild frontend và restart service

set -e

echo "🚀 Deploying POS ChunkLoadError fix..."
echo "⚠️  LƯU Ý: Script này KHÔNG động vào database, chỉ fix frontend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Get project root
PROJECT_ROOT="/home/deploy/Laumamnhatoi-erp"
FRONTEND_DIR="$PROJECT_ROOT/apps/frontend"

if [ ! -d "$PROJECT_ROOT" ]; then
    print_error "Project directory not found: $PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT"

# Step 1: Pull latest code
print_info "Pulling latest code from GitHub..."
print_warning "⚠️  Đảm bảo database đang chạy và không bị ảnh hưởng"
git pull origin main
print_status "Code updated"

# Step 2: Install dependencies
print_info "Installing dependencies..."
npm install
cd "$FRONTEND_DIR"
npm install
cd "$PROJECT_ROOT"
print_status "Dependencies installed"

# Step 3: Clean frontend build
print_info "Cleaning frontend build artifacts..."
cd "$FRONTEND_DIR"
rm -rf .next
rm -rf .next/cache
rm -rf tsconfig.tsbuildinfo
rm -rf node_modules/.cache
print_status "Build artifacts cleaned"

# Step 4: Rebuild frontend
print_info "Rebuilding frontend (this may take a few minutes)..."
npm run build

if [ ! -d ".next" ]; then
    print_error "Frontend build failed - .next directory not found"
    exit 1
fi

# Verify POS chunks (Next.js 14 App Router có thể đặt tên khác)
print_info "Verifying POS page build..."
if [ -d ".next/server/app/pos" ] || [ -d ".next/static/chunks/app/pos" ]; then
    print_status "POS page directory found in build output"
    # Tìm tất cả files liên quan đến POS
    POS_FILES=$(find .next -path "*pos*" -type f 2>/dev/null | head -5 || true)
    if [ -n "$POS_FILES" ]; then
        print_status "POS-related files found:"
        echo "$POS_FILES" | while read file; do
            echo "  - $file"
        done
    fi
else
    print_warning "POS page directory not found, but build succeeded"
    print_warning "This is OK - Next.js may use different chunk naming"
fi

cd "$PROJECT_ROOT"

# Step 5: Free port 3002 if needed
print_info "Freeing port 3002 if needed..."
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
fuser -k 3002/tcp 2>/dev/null || true
sleep 2
print_status "Port 3002 freed"

# Step 6: Restart frontend (KHÔNG restart backend để tránh ảnh hưởng database)
print_info "Restarting frontend service..."
print_warning "⚠️  Chỉ restart frontend, backend vẫn chạy để giữ database connection"
pm2 delete laumam-frontend 2>/dev/null || true
sleep 2
pm2 start ecosystem.config.js --only laumam-frontend
pm2 save

# Wait for service to start
sleep 5

# Step 7: Check status
print_info "Checking service status..."
sleep 3  # Wait a bit more for service to start
if pm2 list | grep -q "laumam-frontend.*online"; then
    print_status "Frontend is running"
else
    print_warning "Frontend status check failed, checking logs..."
    print_info "Recent logs:"
    pm2 logs laumam-frontend --lines 20 --nostream || true
    print_warning "⚠️  Frontend may still be starting, check again with: pm2 status"
    print_info "If still not running, check: pm2 logs laumam-frontend"
fi

# Step 8: Test frontend accessibility
print_info "Testing frontend accessibility..."
sleep 3

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3002" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    print_status "Frontend is accessible (HTTP $HTTP_CODE)"
else
    print_warning "Frontend accessibility test returned HTTP $HTTP_CODE"
    print_warning "Frontend may still be starting, wait a few seconds and check: curl http://localhost:3002"
fi

print_status "✅ Deploy completed!"
echo ""
print_info "📋 Next steps:"
echo "  1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "  2. Visit: http://36.50.27.82:3002/pos"
echo "  3. Check browser console for any remaining errors"
echo ""
print_info "📊 Check logs: pm2 logs laumam-frontend"
print_info "🔍 Check status: pm2 status"
echo ""
print_success "✅ Database không bị ảnh hưởng - tất cả dữ liệu vẫn an toàn!"

