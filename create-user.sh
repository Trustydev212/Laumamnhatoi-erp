#!/bin/bash

# Script tạo tài khoản mới
# Usage: ./create-user.sh [username] [email] [role] [password]

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

# Check parameters
if [ $# -lt 4 ]; then
    print_error "Sử dụng: ./create-user.sh [username] [email] [role] [password]"
    echo ""
    print_info "Ví dụ:"
    echo "./create-user.sh admin admin@nhatoi.com ADMIN admin123"
    echo "./create-user.sh manager manager@nhatoi.com MANAGER manager123"
    echo "./create-user.sh cashier cashier@nhatoi.com CASHIER cashier123"
    echo "./create-user.sh kitchen kitchen@nhatoi.com KITCHEN kitchen123"
    echo "./create-user.sh waiter waiter@nhatoi.com WAITER waiter123"
    echo ""
    print_info "Các role có sẵn: ADMIN, MANAGER, CASHIER, KITCHEN, WAITER, STAFF"
    exit 1
fi

USERNAME=$1
EMAIL=$2
ROLE=$3
PASSWORD=$4

echo "👤 Tạo tài khoản mới..."
echo "================================================"
print_info "Username: $USERNAME"
print_info "Email: $EMAIL"
print_info "Role: $ROLE"

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

# Create user script
print_status "Tạo script tạo user..."

cat > create-user-temp.js << EOF
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createUser() {
  try {
    const hashedPassword = await bcrypt.hash('$PASSWORD', 12);
    
    const user = await prisma.user.create({
      data: {
        username: '$USERNAME',
        email: '$EMAIL',
        password: hashedPassword,
        firstName: '$USERNAME',
        lastName: 'User',
        role: '$ROLE',
        isActive: true,
      },
    });
    
    console.log('✅ User created successfully:');
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Password: $PASSWORD');
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('❌ User already exists with this username or email');
    } else {
      console.log('❌ Error creating user:', error.message);
    }
  } finally {
    await prisma.\$disconnect();
  }
}

createUser();
EOF

# Run the script
print_status "Chạy script tạo user..."
node create-user-temp.js

# Clean up
rm create-user-temp.js

print_status "✅ Hoàn thành tạo tài khoản!"
echo ""
print_info "Tài khoản mới:"
echo "Username: $USERNAME"
echo "Password: $PASSWORD"
echo "Role: $ROLE"
