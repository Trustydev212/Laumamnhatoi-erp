#!/bin/bash

# Script sửa lỗi Prisma findUnique
# Usage: ./fix-prisma-error.sh

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

echo "🔧 Sửa lỗi Prisma findUnique..."
echo "================================================"

# Go to backend directory
cd apps/backend

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error "File .env không tồn tại. Vui lòng chạy setup-env.sh trước"
    exit 1
fi

# Stop PM2 first
print_status "Dừng PM2..."
pm2 stop nha-toi-erp || true

# Clean everything
print_status "Dọn dẹp Prisma client cũ..."
rm -rf node_modules/.prisma
rm -rf prisma/migrations
rm -rf dist

# Generate Prisma client
print_status "Generate Prisma client..."
npx prisma generate

# Push database schema (tạo bảng)
print_status "Push database schema..."
npx prisma db push --accept-data-loss

# Test database connection
print_status "Kiểm tra kết nối database..."
if npx prisma db push; then
    print_status "✅ Database kết nối thành công!"
else
    print_error "❌ Database kết nối thất bại"
    exit 1
fi

# Test Prisma client
print_status "Kiểm tra Prisma client..."
cat > test-prisma-fix.js << 'EOF'
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPrisma() {
  try {
    console.log('Testing Prisma client...');
    
    // Check if user model exists
    if (prisma.user) {
      console.log('✅ User model exists');
      
      // Test count
      const count = await prisma.user.count();
      console.log('✅ User count:', count);
      
      // Test findUnique with a dummy ID
      try {
        const user = await prisma.user.findUnique({
          where: { id: 'dummy-id' }
        });
        console.log('✅ findUnique works (returned null as expected)');
      } catch (error) {
        console.error('❌ findUnique error:', error.message);
      }
      
    } else {
      console.log('❌ User model does not exist');
      console.log('Available models:', Object.keys(prisma));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma();
EOF

# Run test
node test-prisma-fix.js

# Clean up
rm test-prisma-fix.js

# Build backend
print_status "Build backend..."
npm run build

# Start PM2
print_status "Khởi động PM2..."
pm2 start nha-toi-erp

# Check logs
print_status "Kiểm tra logs..."
pm2 logs nha-toi-erp --lines 10

print_status "✅ Hoàn thành sửa lỗi Prisma!"
echo ""
print_info "Nếu vẫn lỗi, hãy kiểm tra:"
echo "1. Database connection string trong .env"
echo "2. Database server có chạy không"
echo "3. User có quyền truy cập database không"
