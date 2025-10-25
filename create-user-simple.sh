#!/bin/bash

# Script tạo user đơn giản
# Usage: ./create-user-simple.sh

echo "👤 Tạo tài khoản đơn giản..."

# Go to backend directory
cd apps/backend

# Tạo user bằng Node.js script
cat > temp-create-user.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createUsers() {
  try {
    // Tạo admin
    const adminPassword = await bcrypt.hash('admin123', 12);
    await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@nhatoi.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'System',
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log('✅ Admin user created');

    // Tạo manager
    const managerPassword = await bcrypt.hash('manager123', 12);
    await prisma.user.upsert({
      where: { username: 'manager' },
      update: {},
      create: {
        username: 'manager',
        email: 'manager@nhatoi.com',
        password: managerPassword,
        firstName: 'Manager',
        lastName: 'User',
        role: 'MANAGER',
        isActive: true,
      },
    });
    console.log('✅ Manager user created');

    // Tạo cashier
    const cashierPassword = await bcrypt.hash('cashier123', 12);
    await prisma.user.upsert({
      where: { username: 'cashier' },
      update: {},
      create: {
        username: 'cashier',
        email: 'cashier@nhatoi.com',
        password: cashierPassword,
        firstName: 'Cashier',
        lastName: 'User',
        role: 'CASHIER',
        isActive: true,
      },
    });
    console.log('✅ Cashier user created');

    // Tạo kitchen
    const kitchenPassword = await bcrypt.hash('kitchen123', 12);
    await prisma.user.upsert({
      where: { username: 'kitchen' },
      update: {},
      create: {
        username: 'kitchen',
        email: 'kitchen@nhatoi.com',
        password: kitchenPassword,
        firstName: 'Kitchen',
        lastName: 'User',
        role: 'KITCHEN',
        isActive: true,
      },
    });
    console.log('✅ Kitchen user created');

    console.log('');
    console.log('🎉 Tất cả tài khoản đã được tạo!');
    console.log('👑 Admin: admin / admin123');
    console.log('👨‍💼 Manager: manager / manager123');
    console.log('💰 Cashier: cashier / cashier123');
    console.log('👨‍🍳 Kitchen: kitchen / kitchen123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createUsers();
EOF

# Chạy script
node temp-create-user.js

# Xóa file tạm
rm temp-create-user.js

echo "✅ Hoàn thành!"
