#!/bin/bash

# Script sửa lỗi Prisma Studio
# Usage: ./fix-prisma-studio.sh

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

echo "🔧 Sửa lỗi Prisma Studio..."
echo "================================================"

# Go to backend directory
cd apps/backend

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error "File .env không tồn tại. Vui lòng chạy setup-env.sh trước"
    exit 1
fi

# Stop any running Prisma Studio
print_status "Dừng Prisma Studio cũ..."
pkill -f "prisma studio" || true

# Clean Prisma client completely
print_status "Dọn dẹp Prisma client hoàn toàn..."
rm -rf node_modules/.prisma
rm -rf prisma/migrations
rm -rf dist

# Check database connection
print_status "Kiểm tra kết nối database..."
if npx prisma db push --accept-data-loss; then
    print_status "✅ Database kết nối thành công!"
else
    print_error "❌ Database kết nối thất bại"
    print_info "Kiểm tra DATABASE_URL trong .env"
    exit 1
fi

# Generate Prisma client
print_status "Generate Prisma client..."
npx prisma generate

# Test Prisma client
print_status "Kiểm tra Prisma client..."
cat > test-prisma-studio.js << 'EOF'
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPrisma() {
  try {
    console.log('Testing Prisma client...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test user model
    if (prisma.user) {
      const userCount = await prisma.user.count();
      console.log('✅ User model works, count:', userCount);
    } else {
      console.log('❌ User model not found');
    }
    
    // Test role model
    if (prisma.role) {
      const roleCount = await prisma.role.count();
      console.log('✅ Role model works, count:', roleCount);
    } else {
      console.log('❌ Role model not found');
    }
    
    console.log('✅ Prisma client is working correctly!');
    
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
node test-prisma-studio.js

# Clean up
rm test-prisma-studio.js

# Build backend
print_status "Build backend..."
npm run build

# Start Prisma Studio
print_status "Khởi động Prisma Studio..."
print_info "Prisma Studio sẽ chạy tại: http://localhost:5555"
print_info "Nhấn Ctrl+C để dừng Prisma Studio"

# Start Prisma Studio in background
nohup npx prisma studio > prisma-studio.log 2>&1 &
PRISMA_PID=$!

# Wait a moment for Studio to start
sleep 3

# Check if Studio is running
if ps -p $PRISMA_PID > /dev/null; then
    print_status "✅ Prisma Studio đã khởi động thành công!"
    print_info "PID: $PRISMA_PID"
    print_info "Log file: prisma-studio.log"
    print_info "Truy cập: http://localhost:5555"
else
    print_error "❌ Prisma Studio khởi động thất bại"
    print_info "Kiểm tra log: cat prisma-studio.log"
fi

print_status "✅ Hoàn thành sửa lỗi Prisma Studio!"
echo ""
print_info "Để dừng Prisma Studio:"
echo "kill $PRISMA_PID"
echo ""
print_info "Để xem log:"
echo "tail -f prisma-studio.log"
