#!/bin/bash

# Script hướng dẫn nhập dữ liệu thủ công
# Usage: ./manual-guide.sh

set -e

echo "📖 Hướng dẫn nhập dữ liệu thủ công..."
echo "================================================"

# Go to backend directory
cd apps/backend

echo "🔧 Cách 1: Sử dụng Prisma Studio (Khuyến nghị)"
echo "----------------------------------------"
echo "1. Chạy lệnh: npx prisma studio"
echo "2. Mở trình duyệt: http://localhost:5555"
echo "3. Click vào bảng 'users'"
echo "4. Click 'Add record'"
echo "5. Điền thông tin:"
echo "   - id: user-001"
echo "   - username: admin"
echo "   - email: admin@nhatoi.com"
echo "   - password: \$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.8.8.8"
echo "   - firstName: Admin"
echo "   - lastName: System"
echo "   - role: ADMIN"
echo "   - isActive: true"
echo "6. Click 'Save'"
echo ""

echo "🔧 Cách 2: Sử dụng psql (Command line)"
echo "----------------------------------------"
echo "1. Chạy lệnh: psql -h localhost -U postgres -d nha_toi_erp"
echo "2. Nhập password PostgreSQL"
echo "3. Chạy SQL commands:"
echo ""

# Create SQL script
cat > add-user-manual.sql << 'EOF'
-- Thêm user admin
INSERT INTO users (id, username, email, password, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt")
VALUES ('user-001', 'admin', 'admin@nhatoi.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.8.8.8', 'Admin', 'System', 'ADMIN', true, NOW(), NOW());

-- Thêm user manager
INSERT INTO users (id, username, email, password, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt")
VALUES ('user-002', 'manager', 'manager@nhatoi.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.8.8.8', 'Manager', 'User', 'MANAGER', true, NOW(), NOW());

-- Thêm user cashier
INSERT INTO users (id, username, email, password, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt")
VALUES ('user-003', 'cashier', 'cashier@nhatoi.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.8.8.8', 'Cashier', 'User', 'CASHIER', true, NOW(), NOW());

-- Thêm user kitchen
INSERT INTO users (id, username, email, password, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt")
VALUES ('user-004', 'kitchen', 'kitchen@nhatoi.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.8.8.8', 'Kitchen', 'User', 'KITCHEN', true, NOW(), NOW());

-- Thêm roles
INSERT INTO roles (id, name, description, permissions, "createdAt", "updatedAt")
VALUES 
('role-001', 'ADMIN', 'Administrator - Full access', '["user.create", "user.read", "user.update", "user.delete", "order.create", "order.read", "order.update", "order.delete", "inventory.create", "inventory.read", "inventory.update", "inventory.delete", "customer.create", "customer.read", "customer.update", "customer.delete", "report.read", "report.export", "system.settings", "system.backup"]', NOW(), NOW()),
('role-002', 'MANAGER', 'Manager - Access to most features', '["order.create", "order.read", "order.update", "order.delete", "inventory.create", "inventory.read", "inventory.update", "inventory.delete", "customer.create", "customer.read", "customer.update", "customer.delete", "report.read", "report.export", "system.settings"]', NOW(), NOW()),
('role-003', 'CASHIER', 'Cashier - Access to POS and customer features', '["order.create", "order.read", "order.update", "customer.create", "customer.read", "customer.update", "payment.create", "payment.read"]', NOW(), NOW()),
('role-004', 'KITCHEN', 'Kitchen - Access to order management and inventory', '["order.read", "order.update", "inventory.read", "inventory.update"]', NOW(), NOW()),
('role-005', 'WAITER', 'Waiter - Access to order and customer features', '["order.create", "order.read", "order.update", "customer.create", "customer.read", "customer.update"]', NOW(), NOW()),
('role-006', 'STAFF', 'Staff - Basic access to order features', '["order.read", "order.update"]', NOW(), NOW());

-- Kiểm tra dữ liệu đã thêm
SELECT 'Users:' as table_name, username, email, role FROM users;
SELECT 'Roles:' as table_name, name, description FROM roles;
EOF

echo "4. Copy và paste nội dung file add-user-manual.sql"
echo "5. Nhấn Enter để thực thi"
echo ""

echo "🔧 Cách 3: Sử dụng Node.js script"
echo "----------------------------------------"
echo "1. Tạo file add-user.js:"
echo ""

# Create Node.js script
cat > add-user.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function addUsers() {
  try {
    console.log('Adding users manually...');
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 12);
    const managerPassword = await bcrypt.hash('manager123', 12);
    const cashierPassword = await bcrypt.hash('cashier123', 12);
    const kitchenPassword = await bcrypt.hash('kitchen123', 12);
    
    // Add users
    const admin = await prisma.user.create({
      data: {
        id: 'user-001',
        username: 'admin',
        email: 'admin@nhatoi.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'System',
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log('✅ Admin user created:', admin.username);
    
    const manager = await prisma.user.create({
      data: {
        id: 'user-002',
        username: 'manager',
        email: 'manager@nhatoi.com',
        password: managerPassword,
        firstName: 'Manager',
        lastName: 'User',
        role: 'MANAGER',
        isActive: true,
      },
    });
    console.log('✅ Manager user created:', manager.username);
    
    const cashier = await prisma.user.create({
      data: {
        id: 'user-003',
        username: 'cashier',
        email: 'cashier@nhatoi.com',
        password: cashierPassword,
        firstName: 'Cashier',
        lastName: 'User',
        role: 'CASHIER',
        isActive: true,
      },
    });
    console.log('✅ Cashier user created:', cashier.username);
    
    const kitchen = await prisma.user.create({
      data: {
        id: 'user-004',
        username: 'kitchen',
        email: 'kitchen@nhatoi.com',
        password: kitchenPassword,
        firstName: 'Kitchen',
        lastName: 'User',
        role: 'KITCHEN',
        isActive: true,
      },
    });
    console.log('✅ Kitchen user created:', kitchen.username);
    
    console.log('🎉 All users created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addUsers();
EOF

echo "2. Chạy lệnh: node add-user.js"
echo ""

echo "📋 Tài khoản mặc định:"
echo "----------------------------------------"
echo "👑 Admin: admin / admin123"
echo "👨‍💼 Manager: manager / manager123"
echo "💰 Cashier: cashier / cashier123"
echo "👨‍🍳 Kitchen: kitchen / kitchen123"
echo ""

echo "🔧 Cách 4: Sử dụng file SQL đã tạo"
echo "----------------------------------------"
echo "1. Chạy lệnh: psql -h localhost -U postgres -d nha_toi_erp -f add-user-manual.sql"
echo ""

echo "✅ Hoàn thành hướng dẫn!"
echo ""
echo "Bạn muốn sử dụng cách nào?"
echo "1. Prisma Studio (Giao diện web) - Khuyến nghị"
echo "2. psql (Command line)"
echo "3. Node.js script"
echo "4. File SQL đã tạo"
