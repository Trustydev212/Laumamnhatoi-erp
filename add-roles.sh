#!/bin/bash

# Script thêm roles vào database
# Usage: ./add-roles.sh

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

echo "👥 Thêm roles vào database..."
echo "================================================"

# Go to backend directory
cd apps/backend

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error "File .env không tồn tại. Vui lòng chạy setup-env.sh trước"
    exit 1
fi

# Create roles script
print_status "Tạo script thêm roles..."

cat > add-roles-temp.js << 'EOF'
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addRoles() {
  try {
    console.log('Adding roles to database...');
    
    // Define roles with permissions
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
    
    // Add roles to database
    for (const roleData of roles) {
      const role = await prisma.role.upsert({
        where: { name: roleData.name },
        update: {
          description: roleData.description,
          permissions: roleData.permissions
        },
        create: roleData
      });
      console.log(`✅ Role created/updated: ${role.name}`);
    }
    
    console.log('');
    console.log('🎉 All roles have been added successfully!');
    console.log('');
    console.log('📋 Available roles:');
    console.log('👑 ADMIN - Full access to all features');
    console.log('👨‍💼 MANAGER - Access to most features except user management');
    console.log('💰 CASHIER - Access to POS and customer features');
    console.log('👨‍🍳 KITCHEN - Access to order management and inventory');
    console.log('🍽️ WAITER - Access to order and customer features');
    console.log('👤 STAFF - Basic access to order features');
    
  } catch (error) {
    console.error('❌ Error adding roles:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addRoles();
EOF

# Run the script
print_status "Chạy script thêm roles..."
node add-roles-temp.js

# Clean up
rm add-roles-temp.js

print_status "✅ Hoàn thành thêm roles!"
echo ""
print_info "Bây giờ bạn có thể:"
echo "1. Kiểm tra roles trong database"
echo "2. Gán role cho users"
echo "3. Sử dụng roles trong authentication"
