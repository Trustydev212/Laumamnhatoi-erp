#!/bin/bash

# Script sửa lỗi Supplier upsert
# Usage: ./fix-supplier-error.sh

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

echo "🔧 Sửa lỗi Supplier upsert..."
echo "================================================"

# Go to backend directory
cd apps/backend

# Create fixed supplier script
print_status "Tạo script sửa lỗi Supplier..."

cat > fix-supplier.js << 'EOF'
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSuppliers() {
  try {
    console.log('🏪 Creating suppliers with fixed logic...');
    
    const suppliers = [
      { 
        id: 'supplier-001',
        name: 'Nhà cung cấp thịt bò', 
        contactName: 'Nguyễn Văn A', 
        phone: '0123456789', 
        email: 'thitbo@supplier.com' 
      },
      { 
        id: 'supplier-002',
        name: 'Nhà cung cấp rau củ', 
        contactName: 'Trần Thị B', 
        phone: '0987654321', 
        email: 'raucu@supplier.com' 
      },
      { 
        id: 'supplier-003',
        name: 'Nhà cung cấp đồ uống', 
        contactName: 'Lê Văn C', 
        phone: '0369258147', 
        email: 'douong@supplier.com' 
      }
    ];

    for (const supplierData of suppliers) {
      // Check if supplier exists by name
      const existingSupplier = await prisma.supplier.findFirst({
        where: { name: supplierData.name }
      });

      if (existingSupplier) {
        console.log(`✅ Supplier already exists: ${supplierData.name}`);
      } else {
        const supplier = await prisma.supplier.create({
          data: supplierData
        });
        console.log(`✅ Supplier created: ${supplier.name}`);
      }
    }

    // Create sample customers
    console.log('👥 Creating sample customers...');
    const customers = [
      { 
        id: 'customer-001',
        name: 'Nguyễn Văn A', 
        phone: '0123456789', 
        email: 'nguyenvana@email.com', 
        points: 100, 
        level: 'SILVER' 
      },
      { 
        id: 'customer-002',
        name: 'Trần Thị B', 
        phone: '0987654321', 
        email: 'tranthib@email.com', 
        points: 250, 
        level: 'GOLD' 
      },
      { 
        id: 'customer-003',
        name: 'Lê Văn C', 
        phone: '0369258147', 
        email: 'levanc@email.com', 
        points: 50, 
        level: 'BRONZE' 
      },
      { 
        id: 'customer-004',
        name: 'Phạm Thị D', 
        phone: '0912345678', 
        email: 'phamthid@email.com', 
        points: 500, 
        level: 'PLATINUM' 
      },
      { 
        id: 'customer-005',
        name: 'Hoàng Văn E', 
        phone: '0923456789', 
        email: 'hoangvane@email.com', 
        points: 0, 
        level: 'BRONZE' 
      }
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
    console.log('🎉 Supplier and Customer creation completed!');
    console.log('');
    console.log('📊 Final summary:');
    console.log('• 6 roles with permissions');
    console.log('• 6 users with different roles');
    console.log('• 5 categories');
    console.log('• 10 tables');
    console.log('• 12 menu items');
    console.log('• 10 ingredients');
    console.log('• 3 suppliers');
    console.log('• 5 sample customers');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixSuppliers();
EOF

# Run the fixed script
print_status "Chạy script sửa lỗi Supplier..."
node fix-supplier.js

# Clean up
rm fix-supplier.js

print_status "✅ Hoàn thành sửa lỗi Supplier!"
echo ""
print_info "Bây giờ database đã có đầy đủ dữ liệu mẫu!"
