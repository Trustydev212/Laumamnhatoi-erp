#!/bin/bash

# Script gán role cho user
# Usage: ./assign-role.sh [username] [role]

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
if [ $# -lt 2 ]; then
    print_error "Sử dụng: ./assign-role.sh [username] [role]"
    echo ""
    print_info "Ví dụ:"
    echo "./assign-role.sh admin ADMIN"
    echo "./assign-role.sh manager MANAGER"
    echo "./assign-role.sh cashier CASHIER"
    echo "./assign-role.sh kitchen KITCHEN"
    echo "./assign-role.sh waiter WAITER"
    echo "./assign-role.sh staff STAFF"
    echo ""
    print_info "Các role có sẵn: ADMIN, MANAGER, CASHIER, KITCHEN, WAITER, STAFF"
    exit 1
fi

USERNAME=$1
ROLE=$2

echo "👤 Gán role cho user..."
echo "================================================"
print_info "Username: $USERNAME"
print_info "Role: $ROLE"

# Go to backend directory
cd apps/backend

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error "File .env không tồn tại. Vui lòng chạy setup-env.sh trước"
    exit 1
fi

# Create assign role script
print_status "Tạo script gán role..."

cat > assign-role-temp.js << EOF
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function assignRole() {
  try {
    console.log('Assigning role to user...');
    
    // Update user role
    const user = await prisma.user.update({
      where: { username: '$USERNAME' },
      data: { role: '$ROLE' },
      select: { id: true, username: true, email: true, role: true }
    });
    
    console.log('✅ Role assigned successfully!');
    console.log('User:', user.username);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    
  } catch (error) {
    if (error.code === 'P2025') {
      console.log('❌ User not found with username: $USERNAME');
    } else {
      console.log('❌ Error assigning role:', error.message);
    }
  } finally {
    await prisma.\$disconnect();
  }
}

assignRole();
EOF

# Run the script
print_status "Chạy script gán role..."
node assign-role-temp.js

# Clean up
rm assign-role-temp.js

print_status "✅ Hoàn thành gán role!"
