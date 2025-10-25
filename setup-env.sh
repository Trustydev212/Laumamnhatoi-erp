#!/bin/bash

# Script setup environment cho backend
# Usage: ./setup-env.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

echo "🔧 Setup environment cho backend..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "apps/backend/package.json" ]; then
    print_error "Không tìm thấy thư mục project. Vui lòng chạy từ thư mục gốc"
    exit 1
fi

# Go to backend directory
cd apps/backend

# Create .env file
print_status "Tạo file .env cho backend..."

cat > .env << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/nha_toi_erp?schema=public"

# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# CORS Configuration
CORS_ORIGIN="http://localhost:3000"

# File Upload
UPLOAD_MAX_SIZE=10485760
UPLOAD_PATH="./uploads"

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

print_status "✅ Đã tạo file .env"

# Update package.json to use .env
print_status "Cập nhật package.json để sử dụng .env..."

# Backup original package.json
cp package.json package.json.backup

# Update start:prod script
sed -i 's/"start:prod": "node dist\/main"/"start:prod": "export $(cat .env | xargs) \&\& node dist\/main"/g' package.json

print_status "✅ Đã cập nhật package.json"

# Test Prisma connection
print_status "Kiểm tra kết nối Prisma..."
if npx prisma db push; then
    print_status "✅ Prisma kết nối thành công!"
else
    print_warning "⚠️ Prisma kết nối thất bại. Kiểm tra DATABASE_URL"
fi

# Test build
print_status "Thử build backend..."
if npm run build; then
    print_status "✅ Backend build thành công!"
else
    print_error "❌ Backend build thất bại"
    exit 1
fi

cd ../..

print_status "Hoàn thành setup environment!"
echo ""
print_info "Bây giờ bạn có thể:"
echo "1. pm2 restart nha-toi-erp"
echo "2. pm2 logs nha-toi-erp --lines 20"
echo "3. Kiểm tra http://localhost:3001"
echo ""
print_warning "Lưu ý: Hãy cập nhật DATABASE_URL trong .env cho đúng với database thực tế!"
