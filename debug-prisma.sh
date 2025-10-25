#!/bin/bash

# Script debug Prisma lỗi
# Usage: ./debug-prisma.sh

set -e

echo "🔍 Debug Prisma lỗi..."
echo "================================================"

# Go to backend directory
cd apps/backend

# Check Prisma schema
echo "1. Kiểm tra Prisma schema..."
if [ -f "prisma/schema.prisma" ]; then
    echo "✅ Prisma schema tồn tại"
    echo "Model User trong schema:"
    grep -A 5 "model User" prisma/schema.prisma
else
    echo "❌ Prisma schema không tồn tại"
fi

# Check Prisma client
echo ""
echo "2. Kiểm tra Prisma client..."
if [ -d "node_modules/.prisma" ]; then
    echo "✅ Prisma client đã generate"
else
    echo "❌ Prisma client chưa generate"
    echo "Chạy: npx prisma generate"
fi

# Check database connection
echo ""
echo "3. Kiểm tra kết nối database..."
if npx prisma db push --accept-data-loss; then
    echo "✅ Database kết nối thành công"
else
    echo "❌ Database kết nối thất bại"
fi

# Test Prisma client
echo ""
echo "4. Test Prisma client..."
cat > test-prisma-debug.js << 'EOF'
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugPrisma() {
  try {
    console.log('Testing Prisma client...');
    
    // Check if user model exists
    console.log('Available models:', Object.keys(prisma));
    
    // Test user model
    if (prisma.user) {
      console.log('✅ User model exists');
      
      // Test count
      const count = await prisma.user.count();
      console.log('✅ User count:', count);
      
      // Test findMany
      const users = await prisma.user.findMany({
        take: 1,
        select: { id: true, username: true, email: true }
      });
      console.log('✅ findMany works, users:', users);
      
    } else {
      console.log('❌ User model does not exist');
      console.log('Available models:', Object.keys(prisma));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugPrisma();
EOF

# Run test
node test-prisma-debug.js

# Clean up
rm test-prisma-debug.js

echo ""
echo "================================================"
echo "Nếu vẫn lỗi, hãy chạy:"
echo "1. npx prisma generate"
echo "2. npx prisma db push"
echo "3. npm run build"
