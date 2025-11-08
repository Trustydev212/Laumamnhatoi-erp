#!/bin/bash

# Script kiểm tra tại sao các đơn hàng đang ở trạng thái "Đang xử lý" (PENDING)

echo "🔍 Kiểm tra đơn hàng đang xử lý..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running in backend directory
if [ ! -f "prisma/schema.prisma" ]; then
    print_error "Script phải chạy từ thư mục backend hoặc project root"
    print_info "Đang tìm thư mục backend..."
    
    if [ -d "apps/backend" ]; then
        cd apps/backend
    elif [ -d "../backend" ]; then
        cd ../backend
    else
        print_error "Không tìm thấy thư mục backend"
        exit 1
    fi
fi

print_info "Kiểm tra orders đang ở trạng thái PENDING..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules không tồn tại, cần chạy: npm install"
fi

# Use Prisma Studio hoặc query trực tiếp
print_info "Các cách kiểm tra:"
echo ""
echo "1. Kiểm tra qua API (nếu backend đang chạy):"
echo "   curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:3001/api/pos/orders"
echo ""
echo "2. Kiểm tra qua Prisma Studio:"
echo "   cd apps/backend"
echo "   npx prisma studio"
echo ""
echo "3. Kiểm tra trực tiếp trong database:"
echo "   psql -U nhatoi_user -d nha_toierp -c \"SELECT id, \"orderNumber\", \"tableId\", status, \"createdAt\", total FROM \"Order\" WHERE status = 'PENDING' ORDER BY \"createdAt\" DESC;\""
echo ""
echo "4. Kiểm tra chi tiết một order cụ thể:"
echo "   psql -U nhatoi_user -d nha_toierp -c \"SELECT o.*, t.name as table_name FROM \"Order\" o LEFT JOIN \"Table\" t ON o.\"tableId\" = t.id WHERE o.\"orderNumber\" = '202511080003';\""
echo ""

print_info "📋 Thông tin về Order Status:"
echo ""
echo "  - PENDING: Đơn hàng mới tạo, chưa thanh toán (hiển thị 'Đang xử lý')"
echo "  - CONFIRMED: Đơn hàng đã xác nhận"
echo "  - COMPLETED: Đơn hàng đã thanh toán xong (hiển thị 'Hoàn thành')"
echo ""
echo "  ⚠️  Orders ở status PENDING sẽ hiển thị 'Đang xử lý' trong UI"
echo "  ✅ Để chuyển sang 'Hoàn thành', cần click nút 'Thanh toán' trong POS"
echo ""

print_info "🔧 Cách xử lý orders đang xử lý:"
echo ""
echo "  1. Mở POS page: http://36.50.27.82:3002/pos"
echo "  2. Chọn bàn có order đang xử lý"
echo "  3. Click nút 'Thanh toán'"
echo "  4. Chọn phương thức thanh toán (Tiền mặt hoặc Chuyển khoản)"
echo "  5. Order sẽ chuyển sang status COMPLETED"
echo ""

print_info "📊 Kiểm tra orders PENDING qua SQL:"
echo ""
echo "SELECT"
echo "  o.\"orderNumber\","
echo "  t.name as table_name,"
echo "  o.status,"
echo "  o.total,"
echo "  o.\"createdAt\","
echo "  u.username as staff"
echo "FROM \"Order\" o"
echo "LEFT JOIN \"Table\" t ON o.\"tableId\" = t.id"
echo "LEFT JOIN \"User\" u ON o.\"userId\" = u.id"
echo "WHERE o.status = 'PENDING'"
echo "ORDER BY o.\"createdAt\" DESC;"
echo ""

print_success "✅ Script hoàn tất!"
echo ""
print_info "💡 Tip: Để xem orders trong database, chạy Prisma Studio:"
echo "   cd apps/backend && npx prisma studio"

