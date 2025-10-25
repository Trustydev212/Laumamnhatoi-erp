#!/bin/bash

# Script tự động setup database hoàn chỉnh
# Usage: ./auto-setup-database.sh

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

echo "🚀 Tự động setup database hoàn chỉnh..."
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

# Stop PM2 if running
print_status "Dừng PM2..."
pm2 stop nha-toi-erp || true

# Clean everything
print_status "Dọn dẹp hoàn toàn..."
rm -rf node_modules/.prisma
rm -rf prisma/migrations
rm -rf dist

# Generate Prisma client
print_status "Generate Prisma client..."
npx prisma generate

# Push database schema
print_status "Push database schema..."
npx prisma db push --accept-data-loss

# Create comprehensive seed script
print_status "Tạo script seed hoàn chỉnh..."

cat > auto-seed.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function autoSeed() {
  try {
    console.log('🌱 Starting comprehensive database seeding...');

    // 1. Create roles first
    console.log('📋 Creating roles...');
    const roles = [
      {
        name: 'ADMIN',
        description: 'Administrator - Full access to all features',
        permissions: JSON.stringify([
          'user.create', 'user.read', 'user.update', 'user.delete',
          'order.create', 'order.read', 'order.update', 'order.delete',
          'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete',
          'customer.create', 'customer.read', 'customer.update', 'customer.delete',
          'report.read', 'report.export',
          'system.settings', 'system.backup'
        ])
      },
      {
        name: 'MANAGER',
        description: 'Manager - Access to most features except user management',
        permissions: JSON.stringify([
          'order.create', 'order.read', 'order.update', 'order.delete',
          'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete',
          'customer.create', 'customer.read', 'customer.update', 'customer.delete',
          'report.read', 'report.export',
          'system.settings'
        ])
      },
      {
        name: 'CASHIER',
        description: 'Cashier - Access to POS and customer features',
        permissions: JSON.stringify([
          'order.create', 'order.read', 'order.update',
          'customer.create', 'customer.read', 'customer.update',
          'payment.create', 'payment.read'
        ])
      },
      {
        name: 'KITCHEN',
        description: 'Kitchen - Access to order management and inventory',
        permissions: JSON.stringify([
          'order.read', 'order.update',
          'inventory.read', 'inventory.update'
        ])
      },
      {
        name: 'WAITER',
        description: 'Waiter - Access to order and customer features',
        permissions: JSON.stringify([
          'order.create', 'order.read', 'order.update',
          'customer.create', 'customer.read', 'customer.update'
        ])
      },
      {
        name: 'STAFF',
        description: 'Staff - Basic access to order features',
        permissions: JSON.stringify([
          'order.read', 'order.update'
        ])
      }
    ];

    for (const roleData of roles) {
      const role = await prisma.role.upsert({
        where: { name: roleData.name },
        update: {
          description: roleData.description,
          permissions: roleData.permissions
        },
        create: roleData
      });
      console.log(`✅ Role created: ${role.name}`);
    }

    // 2. Create users
    console.log('👥 Creating users...');
    const users = [
      {
        id: 'user-admin-001',
        username: 'admin',
        email: 'admin@nhatoi.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'System',
        role: 'ADMIN'
      },
      {
        id: 'user-manager-001',
        username: 'manager',
        email: 'manager@nhatoi.com',
        password: 'manager123',
        firstName: 'Manager',
        lastName: 'User',
        role: 'MANAGER'
      },
      {
        id: 'user-cashier-001',
        username: 'cashier',
        email: 'cashier@nhatoi.com',
        password: 'cashier123',
        firstName: 'Cashier',
        lastName: 'User',
        role: 'CASHIER'
      },
      {
        id: 'user-kitchen-001',
        username: 'kitchen',
        email: 'kitchen@nhatoi.com',
        password: 'kitchen123',
        firstName: 'Kitchen',
        lastName: 'User',
        role: 'KITCHEN'
      },
      {
        id: 'user-waiter-001',
        username: 'waiter',
        email: 'waiter@nhatoi.com',
        password: 'waiter123',
        firstName: 'Waiter',
        lastName: 'User',
        role: 'WAITER'
      },
      {
        id: 'user-staff-001',
        username: 'staff',
        email: 'staff@nhatoi.com',
        password: 'staff123',
        firstName: 'Staff',
        lastName: 'User',
        role: 'STAFF'
      }
    ];

    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = await prisma.user.upsert({
        where: { username: userData.username },
        update: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          isActive: true
        },
        create: {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          isActive: true
        }
      });
      console.log(`✅ User created: ${user.username} (${user.role})`);
    }

    // 3. Create categories
    console.log('📂 Creating categories...');
    const categories = [
      { name: 'Món chính', description: 'Các món ăn chính', sortOrder: 1 },
      { name: 'Món phụ', description: 'Các món ăn phụ', sortOrder: 2 },
      { name: 'Đồ uống', description: 'Nước uống các loại', sortOrder: 3 },
      { name: 'Tráng miệng', description: 'Món tráng miệng', sortOrder: 4 },
      { name: 'Combo', description: 'Combo món ăn', sortOrder: 5 }
    ];

    for (const categoryData of categories) {
      const category = await prisma.category.upsert({
        where: { name: categoryData.name },
        update: {},
        create: categoryData
      });
      console.log(`✅ Category created: ${category.name}`);
    }

    // 4. Create tables
    console.log('🪑 Creating tables...');
    const tables = [
      { name: 'Bàn 1', capacity: 4, location: 'Tầng 1' },
      { name: 'Bàn 2', capacity: 4, location: 'Tầng 1' },
      { name: 'Bàn 3', capacity: 6, location: 'Tầng 1' },
      { name: 'Bàn 4', capacity: 2, location: 'Tầng 1' },
      { name: 'Bàn 5', capacity: 8, location: 'Tầng 2' },
      { name: 'Bàn 6', capacity: 4, location: 'Tầng 2' },
      { name: 'Bàn 7', capacity: 6, location: 'Tầng 2' },
      { name: 'Bàn 8', capacity: 4, location: 'Tầng 2' },
      { name: 'Bàn VIP 1', capacity: 10, location: 'Tầng 2' },
      { name: 'Bàn VIP 2', capacity: 12, location: 'Tầng 2' }
    ];

    for (const tableData of tables) {
      const table = await prisma.table.upsert({
        where: { name: tableData.name },
        update: {},
        create: tableData
      });
      console.log(`✅ Table created: ${table.name}`);
    }

    // 5. Create menu items
    console.log('🍽️ Creating menu items...');
    const menuItems = [
      { name: 'Phở Bò', description: 'Phở bò truyền thống', price: 45000, categoryName: 'Món chính' },
      { name: 'Bún Bò Huế', description: 'Bún bò Huế đặc biệt', price: 50000, categoryName: 'Món chính' },
      { name: 'Cơm Tấm', description: 'Cơm tấm sườn nướng', price: 35000, categoryName: 'Món chính' },
      { name: 'Bún Chả', description: 'Bún chả Hà Nội', price: 40000, categoryName: 'Món chính' },
      { name: 'Gỏi Cuốn', description: 'Gỏi cuốn tôm thịt', price: 25000, categoryName: 'Món phụ' },
      { name: 'Chả Giò', description: 'Chả giò truyền thống', price: 20000, categoryName: 'Món phụ' },
      { name: 'Nước Cam', description: 'Nước cam tươi', price: 15000, categoryName: 'Đồ uống' },
      { name: 'Trà Đá', description: 'Trà đá truyền thống', price: 5000, categoryName: 'Đồ uống' },
      { name: 'Cà Phê Sữa', description: 'Cà phê sữa đá', price: 12000, categoryName: 'Đồ uống' },
      { name: 'Chè Đậu Đỏ', description: 'Chè đậu đỏ ngọt', price: 12000, categoryName: 'Tráng miệng' },
      { name: 'Combo Phở + Nước', description: 'Phở bò + nước cam', price: 55000, categoryName: 'Combo' },
      { name: 'Combo Cơm + Nước', description: 'Cơm tấm + trà đá', price: 38000, categoryName: 'Combo' }
    ];

    for (const menuData of menuItems) {
      const category = await prisma.category.findUnique({
        where: { name: menuData.categoryName }
      });

      if (category) {
        const menu = await prisma.menu.upsert({
          where: { name: menuData.name },
          update: {},
          create: {
            name: menuData.name,
            description: menuData.description,
            price: menuData.price,
            categoryId: category.id,
            isActive: true,
            isAvailable: true
          }
        });
        console.log(`✅ Menu item created: ${menu.name}`);
      }
    }

    // 6. Create ingredients
    console.log('🥬 Creating ingredients...');
    const ingredients = [
      { name: 'Thịt bò', unit: 'kg', currentStock: 10, minStock: 2, costPrice: 200000 },
      { name: 'Bánh phở', unit: 'kg', currentStock: 5, minStock: 1, costPrice: 15000 },
      { name: 'Rau thơm', unit: 'bó', currentStock: 20, minStock: 5, costPrice: 5000 },
      { name: 'Hành tây', unit: 'kg', currentStock: 3, minStock: 1, costPrice: 25000 },
      { name: 'Tôm', unit: 'kg', currentStock: 2, minStock: 1, costPrice: 180000 },
      { name: 'Thịt heo', unit: 'kg', currentStock: 8, minStock: 2, costPrice: 120000 },
      { name: 'Bún', unit: 'kg', currentStock: 4, minStock: 1, costPrice: 12000 },
      { name: 'Cà chua', unit: 'kg', currentStock: 2, minStock: 1, costPrice: 18000 },
      { name: 'Chanh', unit: 'kg', currentStock: 3, minStock: 1, costPrice: 15000 },
      { name: 'Đường', unit: 'kg', currentStock: 5, minStock: 1, costPrice: 12000 }
    ];

    for (const ingredientData of ingredients) {
      const ingredient = await prisma.ingredient.upsert({
        where: { name: ingredientData.name },
        update: {},
        create: ingredientData
      });
      console.log(`✅ Ingredient created: ${ingredient.name}`);
    }

    // 7. Create suppliers
    console.log('🏪 Creating suppliers...');
    const suppliers = [
      { name: 'Nhà cung cấp thịt bò', contactName: 'Nguyễn Văn A', phone: '0123456789', email: 'thitbo@supplier.com' },
      { name: 'Nhà cung cấp rau củ', contactName: 'Trần Thị B', phone: '0987654321', email: 'raucu@supplier.com' },
      { name: 'Nhà cung cấp đồ uống', contactName: 'Lê Văn C', phone: '0369258147', email: 'douong@supplier.com' }
    ];

    for (const supplierData of suppliers) {
      const supplier = await prisma.supplier.upsert({
        where: { name: supplierData.name },
        update: {},
        create: supplierData
      });
      console.log(`✅ Supplier created: ${supplier.name}`);
    }

    // 8. Create sample customers
    console.log('👥 Creating sample customers...');
    const customers = [
      { name: 'Nguyễn Văn A', phone: '0123456789', email: 'nguyenvana@email.com', points: 100, level: 'SILVER' },
      { name: 'Trần Thị B', phone: '0987654321', email: 'tranthib@email.com', points: 250, level: 'GOLD' },
      { name: 'Lê Văn C', phone: '0369258147', email: 'levanc@email.com', points: 50, level: 'BRONZE' },
      { name: 'Phạm Thị D', phone: '0912345678', email: 'phamthid@email.com', points: 500, level: 'PLATINUM' },
      { name: 'Hoàng Văn E', phone: '0923456789', email: 'hoangvane@email.com', points: 0, level: 'BRONZE' }
    ];

    for (const customerData of customers) {
      const customer = await prisma.customer.upsert({
        where: { phone: customerData.phone },
        update: {},
        create: customerData
      });
      console.log(`✅ Customer created: ${customer.name}`);
    }

    console.log('');
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📋 Test accounts:');
    console.log('👑 Admin: admin / admin123');
    console.log('👨‍💼 Manager: manager / manager123');
    console.log('💰 Cashier: cashier / cashier123');
    console.log('👨‍🍳 Kitchen: kitchen / kitchen123');
    console.log('🍽️ Waiter: waiter / waiter123');
    console.log('👤 Staff: staff / staff123');
    console.log('');
    console.log('📊 Data created:');
    console.log('• 6 roles with permissions');
    console.log('• 6 users with different roles');
    console.log('• 5 categories');
    console.log('• 10 tables');
    console.log('• 12 menu items');
    console.log('• 10 ingredients');
    console.log('• 3 suppliers');
    console.log('• 5 sample customers');

  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

autoSeed();
EOF

# Run the comprehensive seed script
print_status "Chạy script seed hoàn chỉnh..."
node auto-seed.js

# Clean up
rm auto-seed.js

# Build backend
print_status "Build backend..."
npm run build

# Start PM2
print_status "Khởi động PM2..."
pm2 start nha-toi-erp

# Check logs
print_status "Kiểm tra logs..."
pm2 logs nha-toi-erp --lines 10

print_status "✅ Hoàn thành setup database tự động!"
echo ""
print_info "🎉 Database đã được setup hoàn chỉnh với:"
echo "• 6 roles với permissions"
echo "• 6 users với các role khác nhau"
echo "• 5 categories món ăn"
echo "• 10 bàn ăn"
echo "• 12 món ăn mẫu"
echo "• 10 nguyên liệu"
echo "• 3 nhà cung cấp"
echo "• 5 khách hàng mẫu"
echo ""
print_info "📋 Tài khoản test:"
echo "👑 Admin: admin / admin123"
echo "👨‍💼 Manager: manager / manager123"
echo "💰 Cashier: cashier / cashier123"
echo "👨‍🍳 Kitchen: kitchen / kitchen123"
echo "🍽️ Waiter: waiter / waiter123"
echo "👤 Staff: staff / staff123"
echo ""
print_warning "⚠️ Lưu ý: Hãy đổi mật khẩu mặc định trong production!"
