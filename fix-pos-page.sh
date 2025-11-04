#!/bin/bash

# Script để fix lỗi trang POS không load được JavaScript

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Get project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

print_status "🔧 Fix POS Page Build Issue"
print_status "================================"

# Step 1: Navigate to frontend
cd apps/frontend

# Step 2: Clean build cache
print_status "🧹 BƯỚC 1: Xóa build cache..."
rm -rf .next
rm -rf .next/cache
rm -rf tsconfig.tsbuildinfo
print_success "✅ Đã xóa build cache"

# Step 3: Check if POS page file exists
print_status "🔍 BƯỚC 2: Kiểm tra file POS page..."
if [ -f "src/app/pos/page.tsx" ]; then
    print_success "✅ File POS page tồn tại"
    print_status "   Kích thước: $(du -h src/app/pos/page.tsx | cut -f1)"
    print_status "   Số dòng: $(wc -l < src/app/pos/page.tsx)"
else
    print_error "❌ File POS page không tồn tại!"
    exit 1
fi

# Step 4: Rebuild frontend
print_status "🔨 BƯỚC 3: Rebuild frontend..."
if npm run build; then
    print_success "✅ Frontend build thành công"
else
    print_error "❌ Frontend build thất bại"
    print_error "   Kiểm tra logs ở trên để xem lỗi chi tiết"
    exit 1
fi

# Step 5: Verify POS page build output
print_status "🔍 BƯỚC 4: Kiểm tra build output của POS page..."
if [ -d ".next" ]; then
    print_success "✅ Folder .next đã được tạo"
    
    # Tìm file POS page trong build output
    POS_FILES=$(find .next -name "*pos*" -type f 2>/dev/null | head -5)
    if [ -n "$POS_FILES" ]; then
        print_success "✅ Tìm thấy file POS trong build:"
        echo "$POS_FILES" | while read -r file; do
            print_status "   - $file"
        done
    else
        print_warning "⚠️  Không tìm thấy file POS trong build output"
    fi
    
    # Kiểm tra static chunks
    STATIC_CHUNKS=$(find .next/static/chunks/app/pos -type f 2>/dev/null | wc -l)
    if [ "$STATIC_CHUNKS" -gt 0 ]; then
        print_success "✅ Tìm thấy $STATIC_CHUNKS file chunks cho POS"
    else
        print_warning "⚠️  Không tìm thấy static chunks cho POS"
    fi
else
    print_error "❌ Folder .next không tồn tại"
    exit 1
fi

# Step 6: Restart frontend service
print_status "🔄 BƯỚC 5: Restart frontend service..."
cd "$PROJECT_DIR"

# Stop frontend
pm2 stop laumam-frontend 2>/dev/null || true
pm2 delete laumam-frontend 2>/dev/null || true

# Kill any process on port 3002
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
sleep 2

# Start frontend
pm2 start ecosystem.config.js --only laumam-frontend || {
    print_error "❌ Khởi động frontend service thất bại"
    exit 1
}

pm2 save
sleep 5

# Step 7: Health check
print_status "🧪 BƯỚC 6: Kiểm tra health..."
if curl -s http://localhost:3002 > /dev/null; then
    print_success "✅ Frontend đang hoạt động"
else
    print_warning "⚠️  Frontend health check thất bại"
fi

# Test POS page specifically
print_status "   Đang kiểm tra trang POS..."
POS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/pos)
if [ "$POS_RESPONSE" = "200" ]; then
    print_success "✅ Trang POS trả về status 200"
else
    print_warning "⚠️  Trang POS trả về status $POS_RESPONSE"
fi

# Step 8: Reload nginx (if exists)
print_status "🔄 BƯỚC 7: Reload nginx (nếu có)..."
if command -v nginx >/dev/null 2>&1; then
    if sudo nginx -t 2>/dev/null; then
        sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload 2>/dev/null || true
        print_success "✅ Nginx đã được reload"
    else
        print_warning "⚠️  Nginx config có lỗi, bỏ qua reload"
    fi
else
    print_status "   Nginx không được cài đặt, bỏ qua"
fi

print_success "🎉 Fix POS page hoàn tất!"
print_status "📚 Kiểm tra:"
print_status "   - Truy cập: http://36.50.27.82:3002/pos"
print_status "   - Xem logs: pm2 logs laumam-frontend"
print_status "   - Kiểm tra file JS: curl -I http://localhost:3002/_next/static/chunks/app/pos/page-*.js"
print_status "   - Kiểm tra browser console để xem lỗi chi tiết"
print_status ""
print_status "💡 Nếu vẫn lỗi, thử:"
print_status "   1. Xóa cache browser (hard refresh: Ctrl+Shift+R)"
print_status "   2. Kiểm tra nginx config: sudo nginx -t"
print_status "   3. Reload nginx: sudo systemctl reload nginx"

