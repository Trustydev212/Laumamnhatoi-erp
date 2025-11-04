#!/bin/bash

# Script để cleanup hoàn toàn và restart services
# Sử dụng khi gặp lỗi EADDRINUSE

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Get project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

print_status "🧹 Cleanup và Restart Services"
print_status "================================"

# Step 1: Stop all PM2 processes
print_status "📛 BƯỚC 1: Dừng tất cả PM2 processes..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
sleep 2

# Step 2: Kill all processes on ports 3001 and 3002
print_status "🔪 BƯỚC 2: Kill tất cả process trên ports 3001 và 3002..."

# Kill by port
if lsof -ti:3001 >/dev/null 2>&1; then
    print_warning "   Đang kill process trên port 3001..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

if lsof -ti:3002 >/dev/null 2>&1; then
    print_warning "   Đang kill process trên port 3002..."
    lsof -ti:3002 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Kill by process name
pkill -9 -f "node dist/main" 2>/dev/null || true
pkill -9 -f "next start" 2>/dev/null || true
pkill -9 -f "nest start" 2>/dev/null || true

sleep 2

# Step 3: Verify ports are free
print_status "🔍 BƯỚC 3: Kiểm tra ports đã được giải phóng..."
if lsof -ti:3001 >/dev/null 2>&1; then
    print_error "❌ Port 3001 vẫn đang được sử dụng!"
    print_status "   Process đang sử dụng:"
    lsof -i:3001 || true
    exit 1
else
    print_success "✅ Port 3001 đã được giải phóng"
fi

if lsof -ti:3002 >/dev/null 2>&1; then
    print_error "❌ Port 3002 vẫn đang được sử dụng!"
    print_status "   Process đang sử dụng:"
    lsof -i:3002 || true
    exit 1
else
    print_success "✅ Port 3002 đã được giải phóng"
fi

# Step 4: Restart PM2 daemon
print_status "🔄 BƯỚC 4: Khởi động lại PM2 daemon..."
pm2 kill 2>/dev/null || true
sleep 1
pm2 resurrect 2>/dev/null || true

# Step 5: Start services
print_status "🚀 BƯỚC 5: Khởi động services..."
cd "$PROJECT_DIR"

# Start backend
print_status "   Đang khởi động backend..."
pm2 start ecosystem.config.js --only laumam-backend || {
    print_error "❌ Khởi động backend thất bại"
    exit 1
}
sleep 3

# Start frontend
print_status "   Đang khởi động frontend..."
pm2 start ecosystem.config.js --only laumam-frontend || {
    print_error "❌ Khởi động frontend thất bại"
    exit 1
}

pm2 save

# Wait for services to start
print_status "   Đang chờ services khởi động..."
sleep 5

# Step 6: Health check
print_status "🧪 BƯỚC 6: Kiểm tra health..."

# Check backend
if curl -s http://localhost:3001/api/health > /dev/null; then
    print_success "✅ Backend đang hoạt động"
else
    print_warning "⚠️  Backend health check thất bại"
    print_warning "   Kiểm tra logs: pm2 logs laumam-backend --lines 50"
fi

# Check frontend
if curl -s http://localhost:3002 > /dev/null; then
    print_success "✅ Frontend đang hoạt động"
else
    print_warning "⚠️  Frontend health check thất bại"
    print_warning "   Kiểm tra logs: pm2 logs laumam-frontend --lines 50"
fi

# Final status
print_status "📊 Trạng thái cuối cùng:"
pm2 status

print_success "🎉 Cleanup và restart hoàn tất!"
print_status "📚 Lệnh hữu ích:"
print_status "   - Xem logs: pm2 logs"
print_status "   - Xem status: pm2 status"
print_status "   - Restart: pm2 restart all"

