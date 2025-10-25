#!/bin/bash

# Script setup database và tạo tài khoản
# Usage: ./setup-database.sh

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

echo "🗄️ Setup database và tạo tài khoản..."
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

# Generate Prisma client
print_status "Generate Prisma client..."
npx prisma generate

# Push database schema
print_status "Push database schema..."
npx prisma db push

# Run database seed
print_status "Chạy database seed để tạo tài khoản..."
npm run db:seed

print_status "✅ Database setup hoàn thành!"
echo ""
print_info "🎉 Các tài khoản đã được tạo:"
echo "👑 Admin: admin / admin123"
echo "👨‍💼 Manager: manager / manager123"
echo "💰 Cashier: cashier / cashier123"
echo "👨‍🍳 Kitchen: kitchen / kitchen123"
echo ""
print_info "📊 Dữ liệu mẫu đã được tạo:"
echo "• 4 danh mục món ăn"
echo "• 8 bàn ăn"
echo "• 8 món ăn mẫu"
echo "• 6 nguyên liệu"
echo "• 3 khách hàng mẫu"
echo ""
print_warning "⚠️ Lưu ý: Hãy đổi mật khẩu mặc định trong production!"
