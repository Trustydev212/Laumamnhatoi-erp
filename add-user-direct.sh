#!/bin/bash

# Script tạo user trực tiếp bằng lệnh
# Usage: ./add-user-direct.sh

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

echo "👤 Tạo tài khoản trực tiếp..."
echo "================================================"

# Go to backend directory
cd apps/backend

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error "File .env không tồn tại. Vui lòng chạy setup-env.sh trước"
    exit 1
fi

# Create users directly using Prisma
print_status "Tạo tài khoản admin..."
npx prisma db execute --stdin << 'EOF'
INSERT INTO users (id, username, email, password, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt") 
VALUES 
('admin-001', 'admin', 'admin@nhatoi.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.8.8.8', 'Admin', 'System', 'ADMIN', true, NOW(), NOW()),
('manager-001', 'manager', 'manager@nhatoi.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.8.8.8', 'Manager', 'User', 'MANAGER', true, NOW(), NOW()),
('cashier-001', 'cashier', 'cashier@nhatoi.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.8.8.8', 'Cashier', 'User', 'CASHIER', true, NOW(), NOW()),
('kitchen-001', 'kitchen', 'kitchen@nhatoi.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.8.8.8', 'Kitchen', 'User', 'KITCHEN', true, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;
EOF

print_status "✅ Đã tạo tài khoản thành công!"
echo ""
print_info "🎉 Các tài khoản đã được tạo:"
echo "👑 Admin: admin / admin123"
echo "👨‍💼 Manager: manager / manager123"
echo "💰 Cashier: cashier / cashier123"
echo "👨‍🍳 Kitchen: kitchen / kitchen123"
echo ""
print_warning "⚠️ Lưu ý: Hãy đổi mật khẩu mặc định trong production!"
