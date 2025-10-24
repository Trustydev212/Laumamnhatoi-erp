#!/bin/bash

# Script sửa cấu hình package.json cho Turbo monorepo
# Usage: ./fix-package-scripts.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

echo "🔧 Sửa cấu hình package.json cho Turbo monorepo..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "apps/backend/package.json" ]; then
    print_error "Không tìm thấy thư mục project. Vui lòng chạy từ thư mục gốc"
    exit 1
fi

# Fix backend package.json
print_status "Sửa cấu hình backend package.json..."

# Backup original file
cp apps/backend/package.json apps/backend/package.json.backup

# Update start script to use built file
sed -i 's/"start": "nest start"/"start": "node dist\/main"/g' apps/backend/package.json

print_status "✅ Đã sửa backend package.json"

# Check if frontend needs fixing
print_status "Kiểm tra frontend package.json..."
if grep -q '"start": "next start"' apps/frontend/package.json; then
    print_status "✅ Frontend package.json đã đúng"
else
    print_warning "Frontend package.json cần kiểm tra"
fi

# Test build
print_status "Thử build backend..."
cd apps/backend
if npm run build; then
    print_status "✅ Backend build thành công!"
else
    print_error "❌ Backend build thất bại"
    exit 1
fi

cd ../..

print_status "Hoàn thành sửa cấu hình package.json!"
echo ""
print_info "Bây giờ bạn có thể:"
echo "1. npm run build (build toàn bộ project)"
echo "2. npm run start (chạy production)"
echo "3. npm run dev (chạy development)"
