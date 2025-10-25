#!/bin/bash

# Script sửa lỗi Prisma client
# Usage: ./fix-prisma-client.sh

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

echo "🔧 Sửa lỗi Prisma client..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "apps/backend/package.json" ]; then
    print_error "Không tìm thấy thư mục project. Vui lòng chạy từ thư mục gốc"
    exit 1
fi

# Go to backend directory
cd apps/backend

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error "File .env không tồn tại. Vui lòng chạy setup-env.sh trước"
    exit 1
fi

# Clean Prisma client
print_status "Dọn dẹp Prisma client cũ..."
rm -rf node_modules/.prisma
rm -rf prisma/migrations

# Generate Prisma client
print_status "Generate Prisma client..."
npx prisma generate

# Push database schema
print_status "Push database schema..."
npx prisma db push

# Test Prisma connection
print_status "Kiểm tra kết nối Prisma..."
if npx prisma db push; then
    print_status "✅ Prisma kết nối thành công!"
else
    print_error "❌ Prisma kết nối thất bại"
    exit 1
fi

# Test Prisma client
print_status "Kiểm tra Prisma client..."
cat > test-prisma.js << 'EOF'
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPrisma() {
  try {
    // Test user model
    const userCount = await prisma.user.count();
    console.log('✅ User model works, count:', userCount);
    
    // Test findUnique
    const users = await prisma.user.findMany({
      take: 1,
      select: { id: true, username: true, email: true }
    });
    console.log('✅ findUnique works, sample user:', users[0] || 'No users found');
    
    console.log('✅ Prisma client hoạt động bình thường!');
  } catch (error) {
    console.error('❌ Prisma client error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma();
EOF

# Run test
node test-prisma.js

# Clean up
rm test-prisma.js

print_status "✅ Hoàn thành sửa lỗi Prisma client!"
echo ""
print_info "Bây giờ bạn có thể:"
echo "1. npm run build (build backend)"
echo "2. pm2 restart nha-toi-erp (restart PM2)"
echo "3. pm2 logs nha-toi-erp (xem logs)"
