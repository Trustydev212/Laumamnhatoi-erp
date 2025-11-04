#!/bin/bash

# Script để fix và rebuild frontend
# Chạy trên server khi frontend build thất bại

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

print_status "🔧 Fix Frontend Build Script"
print_status "================================"

# Step 1: Navigate to frontend
print_status "📦 BƯỚC 1: Cài đặt dependencies..."
cd apps/frontend

# Step 2: Install dependencies
print_status "   Đang cài đặt dependencies (bao gồm devDependencies)..."
NODE_ENV=development npm install || {
    print_error "❌ Cài đặt dependencies thất bại"
    exit 1
}

# Step 3: Check if @tailwindcss/forms is installed
print_status "   Đang kiểm tra @tailwindcss/forms..."
if ! npm list @tailwindcss/forms >/dev/null 2>&1; then
    print_warning "⚠️  @tailwindcss/forms chưa được cài, đang cài đặt..."
    npm install @tailwindcss/forms @tailwindcss/typography --save-dev || {
        print_error "❌ Không thể cài @tailwindcss/forms"
        exit 1
    }
    print_success "✅ Đã cài đặt @tailwindcss/forms"
else
    print_success "✅ @tailwindcss/forms đã được cài đặt"
fi

# Step 4: Clean old build
print_status "🧹 BƯỚC 2: Xóa build cũ..."
rm -rf .next
rm -rf tsconfig.tsbuildinfo
print_success "✅ Đã xóa build cũ"

# Step 5: Build frontend
print_status "🔨 BƯỚC 3: Build frontend..."
if npm run build; then
    print_success "✅ Frontend build thành công"
else
    print_error "❌ Frontend build thất bại"
    print_error "   Kiểm tra logs ở trên để xem lỗi chi tiết"
    exit 1
fi

# Step 6: Verify build
print_status "🔍 BƯỚC 4: Kiểm tra build output..."
if [ -d ".next" ]; then
    print_success "✅ Folder .next đã được tạo"
    print_status "   Số lượng files: $(find .next -type f | wc -l)"
else
    print_error "❌ Folder .next không tồn tại"
    exit 1
fi

# Step 7: Restart frontend service
print_status "🔄 BƯỚC 5: Restart frontend service..."
cd "$PROJECT_DIR"

# Stop frontend
pm2 stop laumam-frontend 2>/dev/null || true
sleep 2

# Start frontend
pm2 start ecosystem.config.js --only laumam-frontend || {
    print_error "❌ Khởi động frontend service thất bại"
    exit 1
}

pm2 save

# Wait for service to start
sleep 5

# Step 8: Health check
print_status "🧪 BƯỚC 6: Kiểm tra health..."
if curl -s http://localhost:3002 > /dev/null; then
    print_success "✅ Frontend đang hoạt động"
else
    print_warning "⚠️  Frontend health check thất bại"
    print_warning "   Kiểm tra logs: pm2 logs laumam-frontend --lines 50"
fi

# Check backend status
print_status "   Đang kiểm tra backend..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    print_success "✅ Backend đang hoạt động"
else
    print_warning "⚠️  Backend health check thất bại"
    print_warning "   Kiểm tra logs: pm2 logs laumam-backend --lines 50"
    print_warning "   Kiểm tra status: pm2 status"
fi

print_success "🎉 Fix frontend build hoàn tất!"
print_status "📚 Lệnh hữu ích:"
print_status "   - Xem logs: pm2 logs"
print_status "   - Xem status: pm2 status"
print_status "   - Restart all: pm2 restart all"
print_status "   - Xem logs frontend: pm2 logs laumam-frontend"
print_status "   - Xem logs backend: pm2 logs laumam-backend"

