#!/bin/bash

# Script nhập dữ liệu thủ công
# Usage: ./manual-input.sh

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

echo "✋ Nhập dữ liệu thủ công..."
echo "================================================"

# Go to backend directory
cd apps/backend

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error "File .env không tồn tại. Vui lòng chạy setup-env.sh trước"
    exit 1
fi

print_info "Các cách nhập dữ liệu thủ công:"
echo ""
echo "1. Sử dụng Prisma Studio (Giao diện web):"
echo "   npx prisma studio"
echo "   → Mở http://localhost:5555"
echo "   → Click vào bảng 'users' hoặc 'roles'"
echo "   → Click 'Add record' để thêm dữ liệu"
echo ""
echo "2. Sử dụng psql (Command line):"
echo "   psql -h localhost -U postgres -d nha_toi_erp"
echo "   → Sử dụng SQL commands để thêm dữ liệu"
echo ""
echo "3. Sử dụng Node.js script:"
echo "   node -e \"const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); ...\""
echo ""

print_info "Ví dụ SQL để thêm user:"
echo "INSERT INTO users (id, username, email, password, \"firstName\", \"lastName\", role, \"isActive\", \"createdAt\", \"updatedAt\")"
echo "VALUES ('user-001', 'admin', 'admin@nhatoi.com', '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.8.8.8', 'Admin', 'System', 'ADMIN', true, NOW(), NOW());"
echo ""

print_info "Ví dụ SQL để thêm role:"
echo "INSERT INTO roles (id, name, description, permissions, \"createdAt\", \"updatedAt\")"
echo "VALUES ('role-001', 'ADMIN', 'Administrator - Full access', '[\"user.create\", \"user.read\", \"user.update\", \"user.delete\"]', NOW(), NOW());"
echo ""

print_warning "Lưu ý:"
echo "- Password phải được hash bằng bcrypt"
echo "- ID phải là unique"
echo "- Timestamps phải đúng format"
echo ""

print_info "Bạn muốn sử dụng cách nào?"
echo "1. Prisma Studio (Giao diện web)"
echo "2. psql (Command line)"
echo "3. Node.js script"
echo "4. Tôi sẽ hướng dẫn chi tiết"
